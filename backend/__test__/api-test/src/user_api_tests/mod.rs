use futures::future::join_all;
use rand::Rng;
use reqwest::{Client, ClientBuilder, StatusCode};
use serde_json::{Value, json};
use std::sync::Arc;
use std::time::Instant;
use tokio::task;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration, timeout};
use std::collections::HashMap;

pub mod temp_user;

pub async fn random_user_api_calls(count: usize) {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client with cookie store");
    let _another_client = Client::new();
    let _some_status_code = StatusCode::OK;
    let _somevalue = Value::Null;

    // action kinds covering the documented API surface
    let actions = vec![
        "auth_login",
        "auth_status",
        "auth_logout",
        "get_users",
        "get_users_filter",
        "get_user",
        "post_user",
        "patch_user",
        "delete_user",
    ];

    let sample_usernames = vec![
        "admin", "testuser", "user1", "user2", "user3", "user4", "user5",
    ];

    // Bounded concurrency: limit the number of concurrent requests to avoid overwhelming the server
    let max_concurrency = 8_000usize;
    let sem = Arc::new(Semaphore::new(max_concurrency));

    let mut rng = rand::rng();
    let start_time = Instant::now();
    let mut handles = Vec::with_capacity(count);

    for _ in 0..count {
        let action = actions[Rng::random_range(&mut rng, 0..actions.len())].to_string();
        let username = sample_usernames[Rng::random_range(&mut rng, 0..sample_usernames.len())].to_string();
        let client_cloned = client.clone();
        let sem_cloned = sem.clone();

        let handle = task::spawn(async move {
            // acquire permit (bounded concurrency)
            let _permit = sem_cloned.acquire().await.unwrap();

            // perform the request with a small per-request timeout
            let fut = async {
                match &action[..] {
                    "auth_login" => client_cloned
                        .post("http://localhost:8787/api/auth")
                        .json(&json!({"username": "admin", "password": "adminpassword"}))
                        .send()
                        .await,
                    "auth_status" => client_cloned
                        .get("http://localhost:8787/api/auth/status")
                        .send()
                        .await,
                    "auth_logout" => client_cloned
                        .post("http://localhost:8787/api/auth/logout")
                        .send()
                        .await,
                    "get_users" => client_cloned
                        .get("http://localhost:8787/api/users")
                        .send()
                        .await,
                    "get_users_filter" => client_cloned
                        .get(&format!("http://localhost:8787/api/users?filter=username&value={}", username))
                        .send()
                        .await,
                    "get_user" => client_cloned
                        .get(&format!("http://localhost:8787/api/users/{}", username))
                        .send()
                        .await,
                    "post_user" => client_cloned
                        .post("http://localhost:8787/api/users")
                        .json(&json!({"username": format!("created_{}", username), "password": "password", "displayName": "Created", "isAdmin": false}))
                        .send()
                        .await,
                    "patch_user" => client_cloned
                        .patch(&format!("http://localhost:8787/api/users/{}", username))
                        .json(&json!({"displayName": "patched"}))
                        .send()
                        .await,
                    "delete_user" => client_cloned
                        .delete(&format!("http://localhost:8787/api/users/{}", username))
                        .send()
                        .await,
                    _ => client_cloned.get("http://localhost:8787/").send().await,
                }
            };

            // wrap with a timeout of 3s
            match timeout(Duration::from_secs(3), fut).await {
                Ok(Ok(response)) => {
                    let status = response.status().as_u16();
                    (action, Some(status), None)
                }
                Ok(Err(e)) => {
                    let msg = format!("Request error: {}", e);
                    (action, None, Some(msg))
                }
                Err(_) => {
                    let msg = "Request timed out".to_string();
                    (action, None, Some(msg))
                }
            }
        });
        handles.push(handle);
        sleep(Duration::from_nanos(1)).await;
    }

    // Await all tasks and measure elapsed time
    let results = join_all(handles).await;
    let duration = start_time.elapsed();

    // Aggregate results
    let mut action_counts_map: HashMap<String, usize> = HashMap::new();
    let mut status_counts_map: HashMap<u16, usize> = HashMap::new();
    let mut error_map: HashMap<String, usize> = HashMap::new();
    let mut success_count = 0usize;

    for r in results.into_iter() {
        if let Ok((action, status_opt, err_opt)) = r {
            *action_counts_map.entry(action.clone()).or_insert(0) += 1;
            if let Some(code) = status_opt {
                *status_counts_map.entry(code).or_insert(0) += 1;
                success_count += 1;
            }
            if let Some(err) = err_opt {
                *error_map.entry(err).or_insert(0) += 1;
            }
        }
    }

    println!(
        "Completed {} requests ({} recorded successes) in {:.3} seconds",
        count,
        success_count,
        duration.as_secs_f64()
    );
    println!("Throughput: {:.2} requests/second", (count as f64) / duration.as_secs_f64());

    println!("Per-action counts:");
    for (k, v) in action_counts_map.iter() {
        println!("  {}: {}", k, v);
    }
    println!("Status code counts:");
    for (code, v) in status_counts_map.iter() {
        println!("  {}: {}", code, v);
    }
    println!("Error samples:");
    for (k, v) in error_map.iter().take(20) {
        println!("  {}: {}", k, v);
    }
}

#[tokio::test]
async fn test_get_users() {
    let client = Client::new();
    // Case 1: Get all users
    let response = client
        .get("http://localhost:8787/api/users")
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::OK);
    let users: Value = response.json().await.expect("Failed to parse JSON");
    let arr = users.as_array().expect("users should be an array");
    for user in arr {
        assert!(user.get("_id").is_some());
        assert!(user.get("username").is_some());
        assert!(user.get("displayName").is_some());
    }
    // Case 2: Filter by username (expect at least one "admin" user)
    let response = client
        .get("http://localhost:8787/api/users?filter=username&value=admin")
        .send()
        .await
        .expect("Failed to send filtered request");
    assert_eq!(response.status(), StatusCode::OK);
    let users: Value = response
        .json()
        .await
        .expect("Failed to parse JSON for filtered request");
    let arr = users.as_array().expect("filtered users should be an array");
    assert!(
        arr.iter()
            .any(|u| u.get("username").and_then(|v| v.as_str()) == Some("admin")),
        "expected at least one user with username 'admin'"
    );
    // Case 3: Filter with no matches
    let response = client
        .get("http://localhost:8787/api/users?filter=username&value=nonexistent_user_12345")
        .send()
        .await
        .expect("Failed to send filtered request (no matches)");
    assert_eq!(response.status(), StatusCode::OK);
    let users: Value = response
        .json()
        .await
        .expect("Failed to parse JSON for no-match request");
    assert!(
        users.as_array().map(|a| a.is_empty()).unwrap_or(false),
        "expected no users for a nonexistent filter value"
    );
}

#[tokio::test]
async fn test_get_users_with_auth_status() {
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client with cookie store");
    // Authenticate as admin
    let auth_response = client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to authenticate");
    assert_eq!(
        auth_response.status(),
        StatusCode::CREATED,
        "Authentication failed, it supposed to succeed."
    );
    // Authenticated: GET specific user by username
    let response = client
        .get("http://localhost:8787/api/users/admin")
        .send()
        .await
        .expect("Failed to send request for specific user");
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Expected OK when fetching existing user by username"
    );
    let user: Value = response
        .json()
        .await
        .expect("Failed to parse JSON for user");
    // Check required fields exist and password is not returned
    assert!(user.get("_id").is_some(), "expected _id field");
    assert_eq!(user.get("username").and_then(|v| v.as_str()), Some("admin"));
    assert!(
        user.get("displayName").is_some(),
        "expected displayName field"
    );
    assert!(user.get("isAdmin").is_some(), "expected isAdmin field");
    assert!(
        user.get("solvedProblem").is_some()
            || user.get("solvedProblems").is_some()
            || user.get("rating").is_some()
    );
    assert!(
        user.get("password").is_none(),
        "password should not be returned"
    );
    // Authenticated: GET non-existent user -> 404
    let response = client
        .get("http://localhost:8787/api/users/nonexistent_user_12345")
        .send()
        .await
        .expect("Failed to send request for nonexistent user");
    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Expected 404 for nonexistent user"
    );
    // Logout admin
    let logout_response = client
        .post("http://localhost:8787/api/auth/logout")
        .send()
        .await
        .expect("Failed to logout");
    assert_eq!(logout_response.status(), StatusCode::OK);
    // After logout: accessing specific user should be unauthorized
    let unauth_user_response = client
        .get("http://localhost:8787/api/users/admin")
        .send()
        .await
        .expect("Failed to send user request after logout");
    assert_eq!(unauth_user_response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_create_user() {
    // Non login user trying to create a user
    let client = Client::new();
    let response = client
        .post("http://localhost:8787/api/users")
        .json(&json!({
            "username": "newuser",
            "password": "securepassword",
            "displayName": "New User",
            "isAdmin": false
        }))
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    // Non admin user trying to create a user
    {
        let client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let _temp_user = temp_user::TempUser::new("testuser", "testpassword", &client).await;
        let response = client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "testuser",
                "password": "testpassword",
                "displayName": "Another User",
                "isAdmin": false
            }))
            .send()
            .await
            .expect("Failed to send request");
        assert_eq!(response.status(), StatusCode::CREATED);
        let response = client
            .post("http://localhost:8787/api/users")
            .json(&json!({
                "username": "anotheruser",
                "password": "anotherpassword",
                "displayName": "Another User",
                "isAdmin": true
            }))
            .send()
            .await
            .expect("Failed to send request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
    // Admin user creating a new user
    let admin_client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .expect("Failed to build client with cookie store");
    let auth_response = admin_client
        .post("http://localhost:8787/api/auth")
        .json(&json!({
            "username": "admin",
            "password": "adminpassword"
        }))
        .send()
        .await
        .expect("Failed to authenticate as admin");
    assert_eq!(auth_response.status(), StatusCode::CREATED);
    let response = admin_client
        .post("http://localhost:8787/api/users")
        .json(&json!({
            "username": "createduser",
            "password": "createdpassword",
            "displayName": "Created User",
            "isAdmin": false
        }))
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_update_user() {
    // Unauthenticated request should be unauthorized
    let client = Client::new();
    let username = "updateuser";
    let response = client
        .patch(&format!("http://localhost:8787/api/users/{}", username))
        .json(&json!({
            "displayName": "Updated User"
        }))
        .send()
        .await
        .expect("Failed to send request");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Create a temporary user and authenticate as that user, then update own profile
    {
        let client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let _temp = temp_user::TempUser::new("updateuser", "updatepass", &client).await;
        let auth_resp = client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "updateuser",
                "password": "updatepass"
            }))
            .send()
            .await
            .expect("Failed to authenticate as temp user");
        assert_eq!(auth_resp.status(), StatusCode::CREATED);

        let response = client
            .patch("http://localhost:8787/api/users/updateuser")
            .json(&json!({
                "displayName": "Updated User"
            }))
            .send()
            .await
            .expect("Failed to send update request as user");

        assert_eq!(response.status(), StatusCode::CREATED);
        let response = client
            .get("http://localhost:8787/api/users/updateuser")
            .send()
            .await
            .expect("Failed to fetch updated user");
        assert_eq!(response.status(), StatusCode::OK);
        let user: Value = response.json().await.expect("Failed to parse JSON");
        assert_eq!(user["displayName"].as_str().unwrap(), "Updated User");
    }

    // Admin can update any user
    {
        // ensure target user exists
        let client_for_create = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let _temp =
            temp_user::TempUser::new("updateuser_admin", "updateuserpass", &client_for_create)
                .await;

        let admin_client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let auth_response = admin_client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "admin",
                "password": "adminpassword"
            }))
            .send()
            .await
            .expect("Failed to authenticate as admin");
        assert_eq!(auth_response.status(), StatusCode::CREATED);

        let response = admin_client
            .patch("http://localhost:8787/api/users/updateuser_admin")
            .json(&json!({
                "displayName": "Admin Updated"
            }))
            .send()
            .await
            .expect("Failed to send admin update request");
        assert_eq!(
            response.status(),
            StatusCode::CREATED,
            "Expected 201 when updating user"
        );
        let response = admin_client
            .get("http://localhost:8787/api/users/updateuser_admin")
            .send()
            .await
            .expect("Failed to fetch updated user");
        assert_eq!(response.status(), StatusCode::OK);
        let user: Value = response.json().await.expect("Failed to parse JSON");
        assert_eq!(user["displayName"].as_str().unwrap(), "Admin Updated");

        // Admin updating nonexistent user should return 404
        let response = admin_client
            .patch("http://localhost:8787/api/users/nonexistent_user_404")
            .json(&json!({ "displayName": "Nope" }))
            .send()
            .await
            .expect("Failed to send admin update request for nonexistent user");
        assert_eq!(
            response.status(),
            StatusCode::NOT_FOUND,
            "Expected 404 when updating nonexistent user"
        );
    }
}

#[tokio::test]
async fn test_delete_user() {
    // Unauthenticated delete -> unauthorized
    let client = Client::new();
    let response = client
        .delete("http://localhost:8787/api/users/delete_me_user")
        .send()
        .await
        .expect("Failed to send unauthenticated delete request");
    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "Expected 401 when deleting without auth"
    );

    // Non-admin user attempting to delete another user -> unauthorized
    {
        // create two temp users
        let client_nonadmin = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let _u1 = temp_user::TempUser::new("deleter", "deleterpass", &client_nonadmin).await;
        let _u2 =
            temp_user::TempUser::new("target_for_delete", "targetpass", &client_nonadmin).await;

        // authenticate as deleter
        let auth_resp = client_nonadmin
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "deleter",
                "password": "deleterpass"
            }))
            .send()
            .await
            .expect("Failed to authenticate non-admin");
        assert_eq!(auth_resp.status(), StatusCode::CREATED);

        // attempt to delete target_for_delete
        let response = client_nonadmin
            .delete("http://localhost:8787/api/users/target_for_delete")
            .send()
            .await
            .expect("Failed to send non-admin delete request");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // Admin can delete an existing user
    {
        // create target user
        let client_creator = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let _target =
            temp_user::TempUser::new("delete_me_user", "delete_me_pass", &client_creator).await;

        let admin_client = ClientBuilder::new()
            .cookie_store(true)
            .build()
            .expect("Failed to build client with cookie store");
        let auth_response = admin_client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "admin",
                "password": "adminpassword"
            }))
            .send()
            .await
            .expect("Failed to authenticate as admin");
        assert_eq!(auth_response.status(), StatusCode::CREATED);

        let response = admin_client
            .delete("http://localhost:8787/api/users/delete_me_user")
            .send()
            .await
            .expect("Failed to send admin delete request");
        assert_eq!(response.status(), StatusCode::CREATED);

        // Admin deleting nonexistent user -> 404
        let response = admin_client
            .delete("http://localhost:8787/api/users/nonexistent_user_404")
            .send()
            .await
            .expect("Failed to send admin delete request for nonexistent user");
        assert_eq!(
            response.status(),
            StatusCode::NOT_FOUND,
            "Expected 404 when deleting nonexistent user"
        );
    }
}
