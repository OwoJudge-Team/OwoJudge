use reqwest::{Client, ClientBuilder, StatusCode, multipart};
use serde_json::{Value, json};
use rand::Rng;
use std::path::PathBuf;
use std::process::Command;
use std::fs as std_fs;
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
    let temp_dir = PathBuf::from(manifest_dir).join("target/temp_problems_rejudge").join(format!("gen_{}", problem_id));
    
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
        .arg("--no-xattrs")
        .arg("--no-mac-metadata")
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
    let problem_id = format!("rej-{}", suffix);

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

    let json: Value = response.json().await.expect("Failed to parse problem response");
    let serial_number = json["serialNumber"].as_i64().expect("Missing serialNumber");
    
    // Wait for problem to be ready
    let mut attempts = 0;
    loop {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        let resp = client
            .get(&format!("http://localhost:8787/api/problems/{}", serial_number))
            .send()
            .await
            .expect("Failed to get problem");
        
        let p_json: Value = resp.json().await.unwrap();
        if p_json["status"] == "ready" {
            break;
        }
        attempts += 1;
        if attempts > 60 {
            panic!("Problem creation timed out");
        }
    }

    serial_number
}

#[allow(dead_code)]
async fn create_submission(client: &Client, problem_serial: i64) -> i64 {
    let submission_body = json!({
        "problemSerialNumber": problem_serial,
        "language": "g++ c++17",
        "userSolution": [
            {
                "filename": "main.cpp",
                "content": "#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a + b << endl; return 0; }"
            }
        ]
    });

    let response = client
        .post("http://localhost:8787/api/submissions")
        .json(&submission_body)
        .send()
        .await
        .expect("Failed to submit solution");

    assert_eq!(response.status(), StatusCode::CREATED);
    let json: Value = response.json().await.unwrap();
    json["serialNumber"].as_i64().expect("Missing serialNumber")
}

// --- Tests ---

#[tokio::test]
pub async fn test_rejudge_submissions() {
    println!("Testing batch rejudge submissions...");
    let admin = TempUser::create_admin().await;
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    // Login
    let _ = client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": admin.username,
            "password": admin.password
        }))
        .send()
        .await
        .unwrap();

    let problem_serial = create_temp_problem(&client).await;
    let sub1 = create_submission(&client, problem_serial).await;
    let sub2 = create_submission(&client, problem_serial).await;

    // Call rejudge
    let response = client
        .post("http://localhost:8787/api/rejudge/submissions")
        .json(&json!({
            "serialNumbers": [sub1, sub2]
        }))
        .send()
        .await
        .expect("Failed to call rejudge");

    assert_eq!(response.status(), StatusCode::OK);
    println!("Batch rejudge submissions passed.");
}

#[tokio::test]
pub async fn test_rejudge_problems() {
    println!("Testing batch rejudge problems...");
    let admin = TempUser::create_admin().await;
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    // Login
    let _ = client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": admin.username,
            "password": admin.password
        }))
        .send()
        .await
        .unwrap();

    let problem_serial = create_temp_problem(&client).await;
    let _sub1 = create_submission(&client, problem_serial).await;

    // Call rejudge
    let response = client
        .post("http://localhost:8787/api/rejudge/problems")
        .json(&json!({
            "serialNumbers": [problem_serial]
        }))
        .send()
        .await
        .expect("Failed to call rejudge");

    assert_eq!(response.status(), StatusCode::OK);
    println!("Batch rejudge problems passed.");
}

#[tokio::test]
pub async fn test_rejudge_single_submission() {
    println!("Testing single rejudge submission...");
    let admin = TempUser::create_admin().await;
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    // Login
    let _ = client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": admin.username,
            "password": admin.password
        }))
        .send()
        .await
        .unwrap();

    let problem_serial = create_temp_problem(&client).await;
    let sub1 = create_submission(&client, problem_serial).await;

    // Call rejudge
    let response = client
        .post(&format!("http://localhost:8787/api/rejudge/submission/{}", sub1))
        .send()
        .await
        .expect("Failed to call rejudge");

    assert_eq!(response.status(), StatusCode::OK);
    println!("Single rejudge submission passed.");
}

#[tokio::test]
pub async fn test_rejudge_single_problem() {
    println!("Testing single rejudge problem...");
    let admin = TempUser::create_admin().await;
    let client = ClientBuilder::new().cookie_store(true).build().unwrap();
    
    // Login
    let _ = client.post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": admin.username,
            "password": admin.password
        }))
        .send()
        .await
        .unwrap();

    let problem_serial = create_temp_problem(&client).await;
    let _sub1 = create_submission(&client, problem_serial).await;

    // Call rejudge
    let response = client
        .post(&format!("http://localhost:8787/api/rejudge/problem/{}", problem_serial))
        .send()
        .await
        .expect("Failed to call rejudge");

    assert_eq!(response.status(), StatusCode::OK);
    println!("Single rejudge problem passed.");
}
