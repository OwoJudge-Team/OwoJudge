use reqwest::{Client, StatusCode};
use serde_json::json;

pub struct TempUser {
    pub username: String,
    pub password: String,
}

impl TempUser {
    pub async fn new(username: &str, password: &str, client: &Client) -> Self {
        let response = client
            .post("http://localhost:8787/api/auth")
            .json(&json!({
                "username": "admin",
                "password": "adminpassword"
            }))
            .send()
            .await
            .expect("Failed to send request");
        assert_eq!(response.status(), StatusCode::CREATED);
        let response = client
            .post("http://localhost:8787/api/users")
            .json(&json!({
                "username": username,
                "password": password,
                "displayName": format!("{username}_display"),
                "isAdmin": false
            }))
            .send()
            .await
            .expect("Failed to send request");
        match response.status() {
            StatusCode::CREATED => {},
            StatusCode::BAD_REQUEST => {
                // If user creation failed, try to login as the user to see if it already exists
                let login_res = client
                    .post("http://localhost:8787/api/auth")
                    .json(&json!({
                        "username": username,
                        "password": password
                    }))
                    .send()
                    .await
                    .expect("Failed to send request");
                
                if login_res.status() != StatusCode::CREATED {
                     // If login also fails, then it's a real error
                     let response = client.get(&format!("http://localhost:8787/api/users/{username}"))
                        .send()
                        .await
                        .expect("Failed to send request");
                     if response.status() == StatusCode::NOT_FOUND {
                         panic!("Failed to create temporary user: Bad Request. Login status: {}", login_res.status());
                     }
                }
            },
            _ => panic!("Failed to create temporary user: {}", response.status()),
        }
        let response = client
            .post("http://localhost:8787/api/auth/logout")
            .send()
            .await
            .expect("Failed to send request");
        assert_eq!(response.status(), StatusCode::OK);
        Self {
            username: username.to_string(),
            password: password.to_string(),
        }
    }

    pub async fn create_admin() -> Self {
        Self {
            username: "admin".to_string(),
            password: "adminpassword".to_string(),
        }
    }

    pub async fn create_with_prefix(prefix: &str) -> Self {
        let client = Client::builder().cookie_store(true).build().unwrap();
        let username = format!("{}_{}", prefix, rand::random::<u32>());
        let password = "password";
        Self::new(&username, password, &client).await
    }
}
