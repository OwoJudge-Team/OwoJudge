use reqwest::{Client, ClientBuilder, StatusCode, multipart};
use serde_json::{Value, json};
use std::path::PathBuf;
use tokio::fs;
use crate::user_api_tests::temp_user::TempUser;
use rand::Rng;
use std::process::Command;
use std::fs as std_fs;

// Helper to get the path to the example problem
fn get_example_problem_path() -> PathBuf {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    // Adjust path based on where the test is running relative to the workspace
    // api-test is in backend/__test__/api-test
    // docs is in backend/docs
    PathBuf::from(manifest_dir).join("../../docs/example/tps-example.tar.gz")
}

fn create_tarball_with_id(problem_id: &str) -> Vec<u8> {
    // Prepare temp directory
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let temp_dir = PathBuf::from(manifest_dir).join("target/temp_problems").join(format!("gen_{}", problem_id));
    std_fs::create_dir_all(&temp_dir).expect("Failed to create temp dir");

    // Get original tarball path
    let original_tar_path = get_example_problem_path();
    
    // Copy and extract
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(&original_tar_path)
        .arg("-C")
        .arg(&temp_dir)
        .status()
        .expect("Failed to execute tar command");
    assert!(status.success(), "Failed to extract tarball");

    // Find the extracted directory (it should be 'tps-example')
    let extracted_dir = temp_dir.join("tps-example");
    let problem_json_path = extracted_dir.join("problem.json");

    // Modify problem.json
    let content = std_fs::read_to_string(&problem_json_path).expect("Failed to read problem.json");
    let mut json: Value = serde_json::from_str(&content).expect("Failed to parse problem.json");
    
    if let Some(obj) = json.as_object_mut() {
        obj.insert("code".to_string(), json!(problem_id));
    }
    
    std_fs::write(&problem_json_path, serde_json::to_string_pretty(&json).unwrap())
        .expect("Failed to write problem.json");

    // Create new tarball
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

    // Read new file content
    let file_content = std_fs::read(&new_tar_path).expect("Failed to read new problem file");
    
    // Cleanup
    let _ = std_fs::remove_dir_all(&temp_dir);

    file_content
}

async fn create_temp_problem(client: &Client) -> String {
    // Authenticate as admin first
    let auth_response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to authenticate as admin");
    assert_eq!(auth_response.status(), StatusCode::CREATED, "Admin login failed");

    // Generate unique ID
    let mut rng = rand::rng();
    let suffix: u32 = rng.random_range(1000..999999);
    let problem_id = format!("tps-example-{}", suffix);

    let file_content = create_tarball_with_id(&problem_id);
    
    // Create multipart form
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
    
    problem_id
}

#[tokio::test]
async fn test_get_problems() {
    let client = Client::new();
    let response = client
        .get("http://localhost:8787/api/problems")
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::OK);
    
    let problems: Value = response.json().await.expect("Failed to parse JSON");
    assert!(problems.is_array(), "Expected an array of problems");
}

#[tokio::test]
async fn test_get_problem_detail() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // 1. Create the problem (as admin)
    let problem_id = create_temp_problem(&client).await;

    // 2. Logout to test unauthenticated access
    let logout_resp = client.post("http://localhost:8787/api/auth/logout").send().await.expect("Failed to logout");
    assert_eq!(logout_resp.status(), StatusCode::OK);

    // 3. Unauthenticated access -> 401
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED, "Unauthenticated access should be unauthorized");

    // 4. Authenticated access
    // Login as admin again
    let auth_response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to authenticate");
    assert_eq!(auth_response.status(), StatusCode::CREATED);

    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to send request");
    
    assert_eq!(response.status(), StatusCode::OK, "Authenticated access should succeed");
    let problem: Value = response.json().await.expect("Failed to parse JSON");
    assert_eq!(problem["problemID"], problem_id);
    assert!(problem["description"].is_string());
}

#[tokio::test]
async fn test_create_problem() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // 1. Unauthenticated
    let file_path = get_example_problem_path();
    let file_content = fs::read(&file_path).await.expect("Failed to read example problem file");
    let part = multipart::Part::bytes(file_content.clone())
        .file_name("tps-example.tar.gz")
        .mime_str("application/gzip")
        .expect("Failed to create mime type");
    let form = multipart::Form::new().part("problem", part);

    let response = client
        .post("http://localhost:8787/api/problems")
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // 2. Non-admin user
    let _temp_user = TempUser::new("problem_creator", "password", &client).await;
    // Need to re-login as temp user because TempUser::new logs out at the end
    let auth_resp = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "problem_creator",
            "password": "password"
        }))
        .send()
        .await
        .expect("Failed to login as temp user");
    assert_eq!(auth_resp.status(), StatusCode::CREATED);

    let part = multipart::Part::bytes(file_content)
        .file_name("tps-example.tar.gz")
        .mime_str("application/gzip")
        .expect("Failed to create mime type");
    let form = multipart::Form::new().part("problem", part);

    let response = client
        .post("http://localhost:8787/api/problems")
        .multipart(form)
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // 3. Admin user
    let auth_resp = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to login as admin");
    assert_eq!(auth_resp.status(), StatusCode::CREATED);

    // Generate unique ID
    let mut rng = rand::rng();
    let suffix: u32 = rng.random_range(1000..999999);
    let problem_id = format!("tps-example-{}", suffix);

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
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_update_problem_put() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    // Create problem as admin
    let problem_id = create_temp_problem(&client).await;

    // Update problem (PUT)
    let file_content = create_tarball_with_id(&problem_id);
    let part = multipart::Part::bytes(file_content)
        .file_name(format!("{}.tar.gz", problem_id))
        .mime_str("application/gzip")
        .expect("Failed to create mime type");
    let form = multipart::Form::new().part("problem", part);

    let response = client
        .put(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .multipart(form)
        .send()
        .await
        .expect("Failed to send update request");
    
    assert_eq!(response.status(), StatusCode::CREATED);

    // Verify update
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to get problem");
    let problem: Value = response.json().await.expect("Failed to parse JSON");
    assert!(problem.is_object(), "Expected a problem object");
}

#[tokio::test]
async fn test_update_problem_patch() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    let problem_id = create_temp_problem(&client).await;

    // 1. Try to update as unauthenticated
    {
        let unauth_client = Client::new();
        let response = unauth_client
            .patch(&format!("http://localhost:8787/api/problems/{}", problem_id))
            .json(&json!({
                "title": "Hacked Title"
            }))
            .send()
            .await
            .expect("Failed to send patch request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // 2. Try to update as non-admin
    {
        let user_client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build user client");
        
        let _temp_user = TempUser::new("problem_patcher", "password", &user_client).await;
        // Need to re-login as temp user because TempUser::new logs out at the end
        let auth_resp = user_client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "problem_patcher",
                "password": "password"
            }))
            .send()
            .await
            .expect("Failed to login as temp user");
        assert_eq!(auth_resp.status(), StatusCode::CREATED);

        let response = user_client
            .patch(&format!("http://localhost:8787/api/problems/{}", problem_id))
            .json(&json!({
                "title": "Hacked Title"
            }))
            .send()
            .await
            .expect("Failed to send patch request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // 3. Update as admin
    let new_title = "Updated Title via PATCH";
    let response = client
        .patch(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .json(&json!({
            "title": new_title
        }))
        .send()
        .await
        .expect("Failed to send patch request");
    
    assert_eq!(response.status(), StatusCode::CREATED);

    // Verify update
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to get problem");
    let problem: Value = response.json().await.expect("Failed to parse JSON");
    assert_eq!(problem["title"], new_title);
}

#[tokio::test]
async fn test_delete_problem() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    let problem_id = create_temp_problem(&client).await;

    // 1. Try to delete as unauthenticated
    {
        let unauth_client = Client::new();
        let response = unauth_client
            .delete(&format!("http://localhost:8787/api/problems/{}", problem_id))
            .send()
            .await
            .expect("Failed to send delete request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // 2. Try to delete as non-admin
    {
        let user_client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build user client");
        
        let _temp_user = TempUser::new("problem_deleter", "password", &user_client).await;
        // Need to re-login as temp user because TempUser::new logs out at the end
        let auth_resp = user_client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "problem_deleter",
                "password": "password"
            }))
            .send()
            .await
            .expect("Failed to login as temp user");
        assert_eq!(auth_resp.status(), StatusCode::CREATED);

        let response = user_client
            .delete(&format!("http://localhost:8787/api/problems/{}", problem_id))
            .send()
            .await
            .expect("Failed to send delete request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // 3. Delete as admin
    let response = client
        .delete(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to send delete request");
    assert_eq!(response.status(), StatusCode::CREATED);

    // Verify it's gone
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}", problem_id))
        .send()
        .await
        .expect("Failed to get problem");
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_allowed_languages() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    let problem_id = create_temp_problem(&client).await;

    // 1. Unauthenticated access
    let unauth_client = Client::new();
    let response = unauth_client
        .get(&format!("http://localhost:8787/api/problems/{}/allowed-languages", problem_id))
        .send()
        .await
        .expect("Failed to get allowed languages unauth");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // 2. Authenticated access
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}/allowed-languages", problem_id))
        .send()
        .await
        .expect("Failed to get allowed languages");
    
    assert_eq!(response.status(), StatusCode::OK);
    let languages: Vec<String> = response.json().await.expect("Failed to parse JSON");
    assert!(!languages.is_empty(), "Allowed languages should not be empty");
}

#[tokio::test]
async fn test_get_testcase() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client");

    let problem_id = create_temp_problem(&client).await;

    // 1. Unauthenticated access
    let unauth_client = Client::new();
    let response = unauth_client
        .get(&format!("http://localhost:8787/api/problems/{}/testcases/full-01", problem_id))
        .send()
        .await
        .expect("Failed to get testcase unauth");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // 2. Authenticated access
    // Get testcase "full-01" (assuming it exists in tps-example)
    let response = client
        .get(&format!("http://localhost:8787/api/problems/{}/testcases/full-01", problem_id))
        .send()
        .await
        .expect("Failed to get testcase");
    
    assert_eq!(response.status(), StatusCode::OK);
    let content = response.text().await.expect("Failed to get text");
    assert!(!content.is_empty(), "Testcase content should not be empty");
}
