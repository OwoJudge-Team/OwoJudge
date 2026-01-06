use reqwest::{Client, ClientBuilder, StatusCode, multipart};
use serde_json::{Value, json};
use rand::Rng;
use std::path::PathBuf;
use std::process::Command;
use std::fs as std_fs;
use std::sync::Arc;
use std::time::Instant;
use tokio::task;
use tokio::sync::Semaphore;
use crate::user_api_tests::temp_user::TempUser;

// --- Helpers copied/adapted from problem_api_tests ---

#[allow(dead_code)]
fn get_example_problem_path() -> PathBuf {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    PathBuf::from(manifest_dir).join("../../docs/example/tps-example.tar.gz")
}

#[allow(dead_code)]
fn create_tarball_with_id(problem_id: &str) -> Vec<u8> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let temp_dir = PathBuf::from(manifest_dir).join("target/temp_problems_contest").join(format!("gen_{}", problem_id));
    
    if temp_dir.exists() {
        std_fs::remove_dir_all(&temp_dir).expect("Failed to clean temp dir");
    }
    std_fs::create_dir_all(&temp_dir).expect("Failed to create temp dir");

    let original_tar_path = get_example_problem_path();
    
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(&original_tar_path)
        .arg("-C")
        .arg(&temp_dir)
        .arg("-m")
        .status()
        .expect("Failed to execute tar command");
    
    if !status.success() {
        println!("Warning: tar command returned error status: {:?}", status);
    }

    let extracted_dir = temp_dir.join("tps-example");
    let problem_json_path = extracted_dir.join("problem.json");

    let content = std_fs::read_to_string(&problem_json_path).expect("Failed to read problem.json");
    let mut json: Value = serde_json::from_str(&content).expect("Failed to parse problem.json");
    
    if let Some(obj) = json.as_object_mut() {
        obj.insert("code".to_string(), json!(problem_id));
    }
    
    std_fs::write(&problem_json_path, serde_json::to_string_pretty(&json).unwrap())
        .expect("Failed to write problem.json");

    let new_tar_path = temp_dir.join(format!("{}.tar.gz", problem_id));
    let status = Command::new("tar")
        .arg("-czf")
        .arg(&new_tar_path)
        .arg("-C")
        .arg(&temp_dir)
        .arg("tps-example")
        .status()
        .expect("Failed to create new tarball");
    assert!(status.success(), "Failed to create new tarball");

    let file_content = std_fs::read(&new_tar_path).expect("Failed to read new problem file");
    let _ = std_fs::remove_dir_all(&temp_dir);

    file_content
}

#[allow(dead_code)]
async fn create_temp_problem(client: &Client) -> i64 {
    let mut rng = rand::rng();
    let suffix: u32 = rng.random_range(1000..999999);
    let problem_id = format!("contest-prob-{}", suffix);

    let file_content = create_tarball_with_id(&problem_id);
    
    let part = multipart::Part::bytes(file_content)
        .file_name(format!("{}.tar.gz", problem_id))
        .mime_str("application/gzip")
        .expect("Failed to create mime type");

    let form = multipart::Form::new().part("problem", part);

    let response = client
        .post("http://localhost:8787/api/problems")
        .multipart(form)
        .send()
        .await
        .expect("Failed to upload problem");
    
    if response.status() != StatusCode::CREATED {
        let text = response.text().await.unwrap_or_default();
        panic!("Failed to create problem: {}", text);
    }
    
    let problem: Value = response.json().await.expect("Failed to parse created problem JSON");
    let serial_number = problem["serialNumber"].as_i64().expect("serialNumber should be an integer");

    // Poll for status == "ready"
    let mut attempts = 0;
    loop {
        let response = client
            .get(&format!("http://localhost:8787/api/problems/{}", serial_number))
            .send()
            .await
            .expect("Failed to get problem");
        
        let problem: Value = response.json().await.expect("Failed to parse problem JSON");
        if problem["status"] == "ready" {
            break;
        }
        if problem["status"] == "error" {
            panic!("Problem creation failed (status: error)");
        }
        
        attempts += 1;
        if attempts % 10 == 0 {
            println!("Waiting for problem to be ready... attempt {}", attempts);
        }
        if attempts > 120 { // 60 seconds timeout
            panic!("Problem creation timed out (status not ready)");
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    serial_number
}

// --- Tests ---

#[allow(dead_code)]
fn generate_contest_title_suffix() -> String {
    let mut rng = rand::rng();
    let suffix: u32 = rng.random_range(1000..999999);
    format!("Test Contest {}", suffix)
}

#[tokio::test]
async fn test_get_contests() {
    let client = Client::new();
    let response = client
        .get("http://localhost:8787/api/contests")
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::OK);
    
    let contests: Value = response.json().await.expect("Failed to parse JSON");
    assert!(contests.is_array(), "Expected an array of contests");
}

#[tokio::test]
async fn test_create_contest_flow() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // 1. Login as admin
    let auth_response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login");
    assert_eq!(auth_response.status(), StatusCode::CREATED);

    // 2. Create a problem to use in the contest
    let problem_serial = create_temp_problem(&client).await;

    // 3. Create Contest
    let contest_title = generate_contest_title_suffix();
    let start_time = chrono::Utc::now();
    let end_time = start_time + chrono::Duration::hours(2);

    let contest_data = json!({
        "title": contest_title,
        "description": "A test contest",
        "startTime": start_time.to_rfc3339(),
        "endTime": end_time.to_rfc3339(),
        "problems": [
            {
                "serialNumber": problem_serial,
                "score": 100
            }
        ],
        "visibility": "public"
    });

    let response = client
        .post("http://localhost:8787/api/contests")
        .json(&contest_data)
        .send()
        .await
        .expect("Failed to create contest");
    
    if response.status() != StatusCode::CREATED {
        let text = response.text().await.unwrap_or_default();
        panic!("Failed to create contest: {}", text);
    }

    let created_contest: Value = response.json().await.expect("Failed to parse created contest");
    let contest_id = created_contest["_id"].as_str().expect("Contest should have _id").to_string();

    // 4. Get Contest
    let response = client
        .get(&format!("http://localhost:8787/api/contests/{}", contest_id))
        .send()
        .await
        .expect("Failed to get contest");
    assert_eq!(response.status(), StatusCode::OK);
    let fetched_contest: Value = response.json().await.expect("Failed to parse contest JSON");
    assert_eq!(fetched_contest["_id"], contest_id);
    
    // Verify problem is in the contest
    let problems = fetched_contest["problems"].as_array().expect("Problems should be an array");
    let found = problems.iter().any(|p| {
        p["serialNumber"].as_i64() == Some(problem_serial)
    });
    assert!(found, "Created problem not found in contest");

    // 5. Update Contest
    let update_data = json!({
        "title": format!("Updated {}", contest_title)
    });
    let response = client
        .patch(&format!("http://localhost:8787/api/contests/{}", contest_id))
        .json(&update_data)
        .send()
        .await
        .expect("Failed to update contest");
    assert_eq!(response.status(), StatusCode::OK);
    
    // Verify update
    let response = client
        .get(&format!("http://localhost:8787/api/contests/{}", contest_id))
        .send()
        .await
        .expect("Failed to get contest");
    let fetched_contest: Value = response.json().await.expect("Failed to parse contest JSON");
    assert_eq!(fetched_contest["title"], format!("Updated {}", contest_title));

    // 6. Get Standings (Empty initially)
    let response = client
        .get(&format!("http://localhost:8787/api/contests/{}/standings", contest_id))
        .send()
        .await
        .expect("Failed to get standings");
    assert_eq!(response.status(), StatusCode::OK);
    let standings: Value = response.json().await.expect("Failed to parse standings JSON");
    assert!(standings.is_array());

    // 7. Update Standings
    let response = client
        .post(&format!("http://localhost:8787/api/contests/{}/standings/update", contest_id))
        .send()
        .await
        .expect("Failed to update standings");
    assert_eq!(response.status(), StatusCode::OK);

    // 8. Delete Contest
    let response = client
        .delete(&format!("http://localhost:8787/api/contests/{}", contest_id))
        .send()
        .await
        .expect("Failed to delete contest");
    assert_eq!(response.status(), StatusCode::OK);

    // Verify deletion
    let response = client
        .get(&format!("http://localhost:8787/api/contests/{}", contest_id))
        .send()
        .await
        .expect("Failed to get contest");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_create_contest_unauthorized() {
    let client = Client::new(); // No auth cookies
    let contest_data = json!({
        "title": "Unauthorized Contest",
        "startTime": chrono::Utc::now().to_rfc3339(),
        "endTime": chrono::Utc::now().to_rfc3339(),
        "problems": []
    });

    let response = client
        .post("http://localhost:8787/api/contests")
        .json(&contest_data)
        .send()
        .await
        .expect("Failed to send request");
    
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

pub async fn random_contest_api_calls(count: usize) {
    println!("Starting contest API stress test with {} requests...", count);
    
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login as admin");
    
    // Create a contest
    let contest_data = json!({
        "title": "Stress Test Contest",
        "description": "A contest for stress testing",
        "startTime": chrono::Utc::now().to_rfc3339(),
        "endTime": (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339(),
        "problems": []
    });
    
    let res = client.post("http://localhost:8787/api/contests")
        .json(&contest_data)
        .send()
        .await
        .expect("Failed to create setup contest");
        
    if res.status() != StatusCode::CREATED {
        println!("Warning: Failed to create setup contest: {}", res.status());
    }

    let created_contest: Value = res.json().await.expect("Failed to parse created contest");
    let contest_id = created_contest["_id"].as_str().expect("Contest should have _id").to_string();

    let actions = vec![
        "get_contests",
        "get_contest_detail",
        "get_contest_detail_invalid",
    ];

    let max_concurrency = 500usize;
    let sem = Arc::new(Semaphore::new(max_concurrency));
    let start_time = Instant::now();
    let mut handles = Vec::with_capacity(count);
    
    let public_client = Client::new();
    let contest_id_arc = Arc::new(contest_id);

    for _ in 0..count {
        let action = actions[rand::rng().random_range(0..actions.len())];
        let client = public_client.clone();
        let sem = sem.clone();
        let cid = contest_id_arc.clone();

        let handle = task::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            match action {
                "get_contests" => {
                    client.get("http://localhost:8787/api/contests").send().await
                },
                "get_contest_detail" => {
                    client.get(&format!("http://localhost:8787/api/contests/{}", cid)).send().await
                },
                "get_contest_detail_invalid" => {
                    client.get("http://localhost:8787/api/contests/000000000000000000000000").send().await
                },
                _ => unreachable!(),
            }
        });
        handles.push(handle);
    }

    let mut successes = 0;
    for handle in handles {
        if let Ok(Ok(res)) = handle.await {
            if res.status().is_success() || res.status() == StatusCode::NOT_FOUND {
                successes += 1;
            }
        }
    }

    let duration = start_time.elapsed();
    println!("Completed {} contest requests in {:.3} seconds", count, duration.as_secs_f64());
    println!("Successes: {}", successes);
    println!("Throughput: {:.2} requests/second", count as f64 / duration.as_secs_f64());
}

#[tokio::test]
async fn test_contest_standings_logic() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // 1. Login Admin
    let auth_response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login");
    assert_eq!(auth_response.status(), StatusCode::CREATED);

    // 2. Create Problem
    let problem_serial = create_temp_problem(&client).await;
    
    // 3. Create active contest
    let start_time = chrono::Utc::now() - chrono::Duration::minutes(5);
    let end_time = chrono::Utc::now() + chrono::Duration::hours(2);

    let contest_data = json!({
        "title": "Standings Logic Test",
        "description": "Testing sorting",
        "startTime": start_time.to_rfc3339(),
        "endTime": end_time.to_rfc3339(),
        "problems": [
            {
                "serialNumber": problem_serial,
                "score": 100
            }
        ],
        "visibility": "public"
    });

    let res = client.post("http://localhost:8787/api/contests")
        .json(&contest_data)
        .send()
        .await
        .expect("Failed to create contest");
    assert_eq!(res.status(), StatusCode::CREATED);
    
    let created_contest: Value = res.json().await.unwrap();
    let contest_id = created_contest["_id"].as_str().unwrap().to_string();

    // 4. Create User1 (Efficient)
    let user1 = TempUser::new("standing_user1", "password123", &client).await;
    let client1 = ClientBuilder::new().cookie_store(true).build().unwrap();
     client1.post("http://localhost:8787/api/auth")
        .json(&json!({ "username": user1.username, "password": user1.password }))
        .send().await.unwrap();

    // 5. Create User2 (Penalty)
    let user2 = TempUser::new("standing_user2", "password123", &client).await;
    let client2 = ClientBuilder::new().cookie_store(true).build().unwrap();
     client2.post("http://localhost:8787/api/auth")
        .json(&json!({ "username": user2.username, "password": user2.password }))
        .send().await.unwrap();

    // 6. User1 submits CE (Count 5)
    // We use CEs because execution environment might be flaky with ACs in this test setup
    let code_ce = "int main() { return 0 "; // Missing brace
    let res = client1.post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": problem_serial,
            "language": "gcc c17", 
            "userSolution": [{ "filename": "main.c", "content": code_ce }]
        }))
        .send().await.unwrap();
    if res.status() != StatusCode::CREATED {
        println!("User1 Submission Failed: {:?}", res.text().await.unwrap_or_default());
        panic!("User1 Submission failed");
    }
    
    // Wait for judging
    tokio::time::sleep(tokio::time::Duration::from_secs(4)).await;

    // 7. User2 submits CE (Count 5)
    let res = client2.post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": problem_serial,
            "language": "gcc c17", 
            "userSolution": [{ "filename": "main.c", "content": code_ce }]
        }))
        .send().await.unwrap();
    if res.status() != StatusCode::CREATED {
        println!("User2 CE 1 Failed: {:?}", res.text().await.unwrap_or_default());
        panic!("User2 CE 1 failed");
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

    // 8. User2 submits CE again (Count 5 + 5 = 10)
    let res = client2.post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": problem_serial,
            "language": "gcc c17", 
            "userSolution": [{ "filename": "main.c", "content": code_ce }]
        }))
        .send().await.unwrap();
    if res.status() != StatusCode::CREATED {
         println!("User2 CE 2 Failed: {:?}", res.text().await.unwrap_or_default());
        panic!("User2 CE 2 failed");
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(4)).await;

    // 9. Fetch Standings
    let res = client.get(&format!("http://localhost:8787/api/contests/{}/standings", contest_id))
        .send().await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    
    let standings: Value = res.json().await.unwrap();
    let rows = standings.as_array().expect("Standings should be array");
    
    // Find our users
    let relevant_rows: Vec<&Value> = rows.iter().filter(|r| {
        let u = r["username"].as_str().unwrap();
        u == user1.username || u == user2.username
    }).collect();

    assert_eq!(relevant_rows.len(), 2, "Both users should be in standings");
    
    // Check sorting: user1 should be first (5 vs 10)
    let first = relevant_rows[0];
    let second = relevant_rows[1];

    println!("User1 Stats: {:?}", first);
    println!("User2 Stats: {:?}", second);

    assert_eq!(first["username"], user1.username, "User1 should be first (5 < 10)");
    assert_eq!(first["submissionCount"], 5);
    
    assert_eq!(second["username"], user2.username, "User2 should be second");
    assert_eq!(second["submissionCount"], 10);
}


