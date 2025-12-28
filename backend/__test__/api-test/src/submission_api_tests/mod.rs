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

// --- Helpers ---

#[allow(dead_code)]
fn get_example_problem_path() -> PathBuf {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    PathBuf::from(manifest_dir).join("../../docs/example/tps-example.tar.gz")
}

#[allow(dead_code)]
fn create_tarball_with_id(problem_id: &str) -> Vec<u8> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let temp_dir = PathBuf::from(manifest_dir).join("target/temp_problems_submission").join(format!("gen_{}", problem_id));
    
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
    let suffix: u32 = rng.random_range(1000..9999);
    let problem_id = format!("sub-{}", suffix); // Shortened to fit 16 char limit

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
    problem["serialNumber"].as_i64().expect("serialNumber should be an integer")
}

#[allow(dead_code)]
async fn login_admin(client: &Client) {
    let response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login");
    assert_eq!(response.status(), StatusCode::CREATED, "Admin login failed");
}

#[allow(dead_code)]
async fn create_temp_problem_with_quota(client: &Client, quota: i32) -> i64 {
    let mut rng = rand::rng();
    let suffix: u32 = rng.random_range(1000..9999);
    let problem_id = format!("sub-{}", suffix);

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

    // Update problem with quota
    let response = client
        .patch(&format!("http://localhost:8787/api/problems/{}", serial_number))
        .json(&json!({
            "dailyQuota": quota
        }))
        .send()
        .await
        .expect("Failed to update problem quota");
    
    assert_eq!(response.status(), StatusCode::CREATED, "Failed to update problem quota");

    serial_number
}

#[tokio::test]
async fn test_submission_daily_quota() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    login_admin(&client).await;
    
    // Create problem with quota of 2
    let serial_number = create_temp_problem_with_quota(&client, 2).await;

    // Create a test user
    let user = TempUser::new("quota_user", "password123", &client).await;
    
    let user_client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build user client");
        
    // Login as user
    let response = user_client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": user.username,
            "password": user.password
        }))
        .send()
        .await
        .expect("Failed to login user");
    assert_eq!(response.status(), StatusCode::CREATED);

    // 1st submission - Should succeed
    let response = user_client
        .post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": serial_number,
            "language": "g++ c++17",
            "userSolution": [
                {
                    "filename": "main.cpp",
                    "content": "int main() { return 0; }"
                }
            ]
        }))
        .send()
        .await
        .expect("Failed to submit");
    assert_eq!(response.status(), StatusCode::CREATED);

    // 2nd submission - Should succeed
    let response = user_client
        .post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": serial_number,
            "language": "g++ c++17",
            "userSolution": [
                {
                    "filename": "main.cpp",
                    "content": "int main() { return 0; }"
                }
            ]
        }))
        .send()
        .await
        .expect("Failed to submit");
    assert_eq!(response.status(), StatusCode::CREATED);

    // 3rd submission - Should fail with 429
    let response = user_client
        .post("http://localhost:8787/api/submissions")
        .json(&json!({
            "problemSerialNumber": serial_number,
            "language": "g++ c++17",
            "userSolution": [
                {
                    "filename": "main.cpp",
                    "content": "int main() { return 0; }"
                }
            ]
        }))
        .send()
        .await
        .expect("Failed to submit");
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn test_submission_pagination() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    login_admin(&client).await;
    let serial_number = create_temp_problem(&client).await;

    let user = TempUser::new("pagination_user", "password123", &client).await;
    
    let user_client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build user client");

    // Login as user
    let response = user_client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": user.username,
            "password": user.password
        }))
        .send()
        .await
        .expect("Failed to login user");
    assert_eq!(response.status(), StatusCode::CREATED);

    // Create 5 submissions
    for _ in 0..5 {
        let response = user_client
            .post("http://localhost:8787/api/submissions")
            .json(&json!({
                "problemSerialNumber": serial_number,
                "language": "g++ c++17",
                "userSolution": [
                    {
                        "filename": "main.cpp",
                        "content": "int main() { return 0; }"
                    }
                ]
            }))
            .send()
            .await
            .expect("Failed to submit");
        assert_eq!(response.status(), StatusCode::CREATED);
    }

    // Test limit=2, offset=0
    let response = user_client
        .get("http://localhost:8787/api/submissions")
        .query(&[("limit", "2"), ("offset", "0"), ("problemSerialNumber", &serial_number.to_string())])
        .send()
        .await
        .expect("Failed to get submissions");
    
    assert_eq!(response.status(), StatusCode::OK);
    let submissions: Vec<Value> = response.json().await.expect("Failed to parse JSON");
    assert_eq!(submissions.len(), 2);

    // Test limit=2, offset=2
    let response = user_client
        .get("http://localhost:8787/api/submissions")
        .query(&[("limit", "2"), ("offset", "2"), ("problemSerialNumber", &serial_number.to_string())])
        .send()
        .await
        .expect("Failed to get submissions");
    
    assert_eq!(response.status(), StatusCode::OK);
    let submissions: Vec<Value> = response.json().await.expect("Failed to parse JSON");
    assert_eq!(submissions.len(), 2);

    // Test limit=2, offset=4 (should return 1)
    let response = user_client
        .get("http://localhost:8787/api/submissions")
        .query(&[("limit", "2"), ("offset", "4"), ("problemSerialNumber", &serial_number.to_string())])
        .send()
        .await
        .expect("Failed to get submissions");
    
    assert_eq!(response.status(), StatusCode::OK);
    let submissions: Vec<Value> = response.json().await.expect("Failed to parse JSON");
    assert_eq!(submissions.len(), 1);
}

#[allow(dead_code)]
async fn create_user(client: &Client, username: &str) {
    // We need admin access to create a user
    // Assuming client is already logged in as admin or we use a separate admin client
    // For simplicity, let's assume the passed client is admin, or we just register if there was a register endpoint.
    // But the docs say POST /api/users is Admin only.
    
    let user_data = json!({
        "username": username,
        "password": "password123",
        "displayName": format!("User {}", username),
        "isAdmin": false
    });

    let response = client
        .post("http://localhost:8787/api/users")
        .json(&user_data)
        .send()
        .await
        .expect("Failed to create user");
    
    if response.status() != StatusCode::CREATED {
         let status = response.status();
         let text = response.text().await.unwrap_or_default();
         if status == StatusCode::BAD_REQUEST && text.contains("duplicate key") {
             // ignore
         } else {
             panic!("Failed to create user: status {}, body: {}", status, text);
         }
    }
}

#[allow(dead_code)]
async fn login_user(client: &Client, username: &str) {
    let response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": username,
            "password": "password123"
        }))
        .send()
        .await
        .expect("Failed to login user");
    assert_eq!(response.status(), StatusCode::CREATED, "User login failed");
}

// --- Tests ---

#[tokio::test]
async fn test_submission_lifecycle() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // 1. Login as Admin to create problem
    login_admin(&client).await;
    let serial_number = create_temp_problem(&client).await;

    // 2. Create a submission
    let submission_body = json!({
        "problemSerialNumber": serial_number,
        "language": "g++ c++17",
        "userSolution": [
            {
                "filename": "main.cpp",
                "content": "#include <iostream>\nint main() { return 0; }"
            }
        ]
    });

    let response = client
        .post("http://localhost:8787/api/submissions")
        .json(&submission_body)
        .send()
        .await
        .expect("Failed to submit");
    
    assert_eq!(response.status(), StatusCode::CREATED);
    let submission: Value = response.json().await.expect("Failed to parse submission");
    let submission_serial_number = submission["serialNumber"].as_i64().expect("Missing serialNumber");
    
    // 3. Get Submission Details
    let response = client
        .get(&format!("http://localhost:8787/api/submission/{}", submission_serial_number))
        .send()
        .await
        .expect("Failed to get submission");
    assert_eq!(response.status(), StatusCode::OK);
    let fetched_sub: Value = response.json().await.expect("Failed to parse fetched submission");
    assert_eq!(fetched_sub["serialNumber"], submission_serial_number);
    assert_eq!(fetched_sub["problemSerialNumber"], serial_number);

    // 4. List Submissions and filter
    let response = client
        .get("http://localhost:8787/api/submissions")
        .query(&[("problemSerialNumber", &serial_number.to_string())])
        .send()
        .await
        .expect("Failed to list submissions");
    assert_eq!(response.status(), StatusCode::OK);
    let list: Value = response.json().await.expect("Failed to parse list");
    assert!(list.is_array());
    let found = list.as_array().unwrap().iter().any(|s| s["serialNumber"] == submission_serial_number);
    assert!(found, "Submission not found in list");
}

#[tokio::test]
async fn test_submission_permissions() {
    let admin_client = ClientBuilder::new().cookie_store(true).build().unwrap();
    let user_client = ClientBuilder::new().cookie_store(true).build().unwrap();
    let other_client = ClientBuilder::new().cookie_store(true).build().unwrap();

    // Setup: Admin creates problem and users
    login_admin(&admin_client).await;
    let problem_serial_number = create_temp_problem(&admin_client).await;
    
    let mut rng = rand::rng();
    let user1 = format!("user_{}", rng.random_range(1000..9999));
    let user2 = format!("user_{}", rng.random_range(1000..9999));
    
    create_user(&admin_client, &user1).await;
    create_user(&admin_client, &user2).await;

    // User 1 submits
    login_user(&user_client, &user1).await;
    let submission_body = json!({
        "problemSerialNumber": problem_serial_number,
        "language": "g++ c++17",
        "userSolution": [{ "filename": "main.cpp", "content": "..." }]
    });
    let response = user_client
        .post("http://localhost:8787/api/submissions")
        .json(&submission_body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let submission: Value = response.json().await.unwrap();
    let serial_number = submission["serialNumber"].as_i64().unwrap();

    // User 2 tries to view User 1's submission
    login_user(&other_client, &user2).await;
    let response = other_client
        .get(&format!("http://localhost:8787/api/submission/{}", serial_number))
        .send()
        .await
        .unwrap();
    
    // Should be Forbidden or Not Found depending on implementation security
    assert!(response.status() == StatusCode::FORBIDDEN || response.status() == StatusCode::NOT_FOUND || response.status() == StatusCode::UNAUTHORIZED, 
        "User 2 should not see User 1's submission. Got: {}", response.status());

    // Admin should see it
    let response = admin_client
        .get(&format!("http://localhost:8787/api/submission/{}", serial_number))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_rejudge_flow() {
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    login_admin(&client).await;
    let problem_serial_number = create_temp_problem(&client).await;

    // Submit
    let submission_body = json!({
        "problemSerialNumber": problem_serial_number,
        "language": "g++ c++17",
        "userSolution": [{ "filename": "main.cpp", "content": "..." }]
    });
    let response = client
        .post("http://localhost:8787/api/submissions")
        .json(&submission_body)
        .send()
        .await
        .unwrap();
    let submission: Value = response.json().await.unwrap();
    let serial_number = submission["serialNumber"].as_i64().unwrap();

    // Rejudge
    let response = client
        .post(&format!("http://localhost:8787/api/submissions/{}/rejudge", serial_number))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    
    let updated: Value = response.json().await.unwrap();
    // Status should be reset (PD or QU)
    let status = updated["status"].as_str().unwrap();
    assert!(status == "pending" || status == "in queue", "Status should be reset to PD or QU, got {}", status);
}

#[tokio::test]
async fn test_invalid_submission() {
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    login_admin(&client).await;

    // 1. Invalid Problem ID
    let body = json!({
        "problemSerialNumber": 99999999,
        "language": "g++ c++17",
        "userSolution": [{ "filename": "main.cpp", "content": "..." }]
    });
    let response = client
        .post("http://localhost:8787/api/submissions")
        .json(&body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // 2. Missing Fields
    let body = json!({
        "problemSerialNumber": 1001
        // missing language and solution
    });
    let response = client
        .post("http://localhost:8787/api/submissions")
        .json(&body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

pub async fn random_submission_api_calls(count: usize) {
    println!("Starting submission API stress test with {} requests...", count);
    
    // Setup: Login as admin to create problem and submission
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login as admin");
    
    // Create problem
    let problem_id = format!("sub-prob-{}", rand::rng().random_range(1000..9999));
    let tarball = create_tarball_with_id(&problem_id);
    let part = multipart::Part::bytes(tarball).file_name("problem.tar.gz");
    let form = multipart::Form::new().part("problem", part);
    
    let res = client.post("http://localhost:8787/api/problems")
        .multipart(form)
        .send()
        .await
        .expect("Failed to create setup problem");

    if res.status() != StatusCode::CREATED {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        println!("Warning: Failed to create setup problem in submission test: {} - {}", status, text);
    }

    // Create a submission
    let submission_body = json!({
        "problemID": problem_id,
        "language": "C++17",
        "userSolution": [{
            "filename": "main.cpp",
            "content": "#include <iostream>\nint main() { std::cout << \"Hello\"; return 0; }"
        }]
    });
    
    let res = client.post("http://localhost:8787/api/submissions")
        .json(&submission_body)
        .send()
        .await
        .expect("Failed to create setup submission");
        
    let submission_id = if res.status() == StatusCode::CREATED {
        let json: Value = res.json().await.unwrap();
        json["serialNumber"].as_i64().unwrap().to_string()
    } else {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        println!("Warning: Failed to create setup submission: {} - {}", status, text);
        "0".to_string()
    };

    let actions = vec![
        "get_submissions",
        "get_submission_detail",
        "get_submission_detail_invalid",
    ];

    let max_concurrency = 500usize;
    let sem = Arc::new(Semaphore::new(max_concurrency));
    let start_time = Instant::now();
    let mut handles = Vec::with_capacity(count);
    
    let submission_id_arc = Arc::new(submission_id);

    for _ in 0..count {
        let action = actions[rand::rng().random_range(0..actions.len())];
        let client = client.clone(); // Use authenticated client
        let sem = sem.clone();
        let sid = submission_id_arc.clone();

        let handle = task::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            match action {
                "get_submissions" => {
                    client.get("http://localhost:8787/api/submissions").send().await
                },
                "get_submission_detail" => {
                    client.get(&format!("http://localhost:8787/api/submission/{}", sid)).send().await
                },
                "get_submission_detail_invalid" => {
                    client.get("http://localhost:8787/api/submission/0").send().await
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
    println!("Completed {} submission requests in {:.3} seconds", count, duration.as_secs_f64());
    println!("Successes: {}", successes);
    println!("Throughput: {:.2} requests/second", count as f64 / duration.as_secs_f64());
}
