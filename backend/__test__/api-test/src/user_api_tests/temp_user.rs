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
                let response = client.get(&format!("http://localhost:8787/api/users/{username}"))
                    .send()
                    .await
                    .expect("Failed to send request");
                if response.status() == StatusCode::NOT_FOUND {
                    panic!("Failed to create temporary user: Bad Request");
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
        TempUser {
            username: username.to_string(),
            password: password.to_string(),
        }
    }
}
