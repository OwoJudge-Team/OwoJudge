## Authentication

Authentication is handled via session cookies. Most endpoints require a user to be logged in.

### `POST /api/auth`

Authenticates a user and starts a session.

-   **Request Body:**
    ```json
    {
        "username": "your-username",
        "password": "your-password"
    }
    ```
-   **Responses:**
    -   `201 Created`: Authentication successful.
    -   `401 Unauthorized`: Invalid credentials.

### `GET /api/auth/status`

Checks if the current user is authenticated.

-   **Responses:**
    -   `200 OK`: Returns the user object if authenticated.
    -   `401 Unauthorized`: If the user is not authenticated.

### `POST /api/auth/logout`

Logs out the currently authenticated user.

-   **Responses:**
    -   `200 OK`: Logout successful.
    -   `401 Unauthorized`: If no user is logged in.