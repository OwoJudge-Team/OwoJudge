## Users

Endpoints for managing user accounts.

### `GET /api/users`

Retrieves a list of all users.

-   **Query Parameters:**
    -   `filter` (optional): The field to filter on (e.g., `username`, `displayName`).
    -   `value` (optional): The value to search for (case-insensitive regex).
-   **Response Example (No filter):**
    ```json
    [
      {
        "_id": "68fb6d6e6deaffa916ced917",
        "username": "admin",
        "displayName": "Admin Administrator"
      }
    ]
    ```
-   **Response Example (With filter):**
    ```json
    [
      {
        "username": "admin",
        "displayName": "Admin Administrator",
        "rating": 1500
      }
    ]
    ```

### `GET /api/users/:username`

Retrieves a specific user by their username.

-   **Authentication:** Required.
-   **Responses:**
    -   `200 OK`: Returns the user object.
    -   `404 Not Found`: If the user does not exist.

-   **Response Example:**
    ```json
    {
      "_id": "68fb6d6e6deaffa916ced917",
      "username": "admin",
      "displayName": "Admin Administrator",
      "role": "judgeAdmin",
      "solvedProblem": 0,
      "solvedProblems": [],
      "rating": 1500
    }
    ```

### `POST /api/users`

Creates a new user.

-   **Authentication:** Admin only.
-   **Request Body:**
    ```json
    {
      "username": "newuser",
      "password": "securepassword",
      "displayName": "New User",
      "role": "student"
    }
    ```
-   **Responses:**
    -   `201 Created`: User created successfully. Returns the user object.
    -   `400 Bad Request`: Invalid user data.
    -   `401 Unauthorized`: If the requester is not a judge admin.

### `PATCH /api/users/:username`

Updates a user's information.

-   **Authentication:** Judge Admin or the user themselves.
-   **Request Body:** Partial user object.
    ```json
    {
      "username": "newusername",
      "password": "newpassword",
      "displayName": "New Display Name",
      "role": "judgeAdmin"
    }
    ```
-   **Responses:**
    -   `201 Created`: User updated successfully.
    -   `400 Bad Request`: Invalid update data.
    -   `401 Unauthorized`: If the requester is neither an admin nor the user themselves.
    -   `404 Not Found`: If the user does not exist.

### `DELETE /api/users/:username`

Deletes a user.

-   **Authentication:** Admin only.
-   **Responses:**
    -   `201 Created`: User deleted successfully. Returns the deleted user object.
    -   `401 Unauthorized`: If the requester is not an admin.
    -   `404 Not Found`: If the user does not exist.