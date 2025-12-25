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
    std_fs::create_dir_all(&temp_dir).expect("Failed to create temp dir");

    let original_tar_path = get_example_problem_path();
    
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(&original_tar_path)
        .arg("-C")
        .arg(&temp_dir)
        .status()
        .expect("Failed to execute tar command");
    assert!(status.success(), "Failed to extract tarball");

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
    
    // Fetch the problem to get serialNumber
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to get problem details");
    
    assert_eq!(response.status(), StatusCode::OK);
    let problem_json: Value = response.json().await.expect("Failed to parse problem JSON");
    
    problem_json["serialNumber"].as_i64().expect("Problem should have serialNumber")
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
                    client.get("http://localhost:8787/api/contests/invalid-id").send().await
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


