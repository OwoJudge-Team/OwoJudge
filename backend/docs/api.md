# API Documentation

This document provides a detailed overview of the OwoJudge backend API endpoints.

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

## Users

Endpoints for managing user accounts.

### `GET /api/users`

Retrieves a list of users. Can be filtered by query parameters.

-   **Query Parameters:**
    -   `filter` (string): The field to filter on (e.g., `username`, `displayName`).
    -   `value` (string): The value to search for.
-   **Example:** `GET /api/users?filter=username&value=matt`

### `GET /api/users/:username`

Retrieves a specific user by their username.

-   **Authentication:** Required.
-   **Responses:**
    -   `200 OK`: Returns the user object (excluding the password).
    -   `404 Not Found`: If the user does not exist.

### `POST /api/users`

Creates a new user.

-   **Authentication:** Admin only.
-   **Request Body:** `IUser` object.

### `PATCH /api/users/:username`

Updates a user's information.

-   **Authentication:** Admin or the user themselves.
-   **Request Body:** Partial `IUser` object.

### `DELETE /api/users/:username`

Deletes a user.

-   **Authentication:** Admin only.

## Problems

Endpoints for managing programming problems.

### `GET /api/problems`

Retrieves a list of all problems.

### `GET /api/problems/:problemID`

Retrieves a single problem by its ID, including its description and sample test cases.

-   **Authentication:** Required.

### `POST /api/problems`

Creates a new problem by uploading a `.tar.gz` file containing the problem data.

-   **Authentication:** Admin only.
-   **Request:** `multipart/form-data` with a single file field named `problem`.

### `PUT /api/problems/:problemID`

Updates an existing problem by uploading a new `.tar.gz` file.

-   **Authentication:** Admin only.
-   **Request:** `multipart/form-data` with a single file field named `problem`.

### `PATCH /api/problems/:problemID`

Updates specific fields of a problem.

-   **Authentication:** Admin only.
-   **Request Body:** Partial `IProblem` object.

### `DELETE /api/problems/:problemID`

Deletes a problem and its associated files.

-   **Authentication:** Admin only.

### `GET /api/problems/:problemID/allowed-languages`

Retrieves the list of programming languages allowed for submissions to a specific problem.

-   **Authentication:** Required.
-   **Parameters:**
    -   `problemID` (string): The unique identifier of the problem.
-   **Response:** Array of allowed language identifiers.
-   **Example Response:**
    ```json
    [
        "gcc c17",
        "gcc c23",
        "g++ c++17", 
        "g++ c++23",
        "rust",
        "nodejs",
        "python3",
        "bash"
    ]
    ```
-   **Status Codes:**
    -   `200 OK`: Successfully retrieved allowed languages.
    -   `401 Unauthorized`: User not authenticated.
    -   `404 Not Found`: Problem with given ID does not exist.
    -   `500 Internal Server Error`: Failed to read problem metadata.

### `GET /api/problems/:problemID/testcases/:testcaseName`

Generates or retrieves a test case for a specific problem.

-   **Authentication:** Required.
-   **Parameters:**
    -   `problemID` (string): The unique identifier of the problem.
    -   `testcaseName` (string): The name of the test case to generate.
-   **Response:** Plain text test case input.
-   **Status Codes:**
    -   `200 OK`: Successfully generated/retrieved test case.
    -   `401 Unauthorized`: User not authenticated.
    -   `500 Internal Server Error`: Failed to generate test case.

## Submissions

Endpoints for managing code submissions.

### `GET /api/submissions`

Retrieves a list of submissions.

-   **Authentication:** Required.

### `POST /api/submissions`

Creates a new code submission for a problem.

-   **Authentication:** Required.
-   **Request Body:** `ISubmission` object.

## Contests

Endpoints for managing contests.

### `GET /api/contests`

Retrieves a list of all contests.

### `GET /api/contests/:contestID`

Retrieves a single contest by its ID.

### `POST /api/contests`

Creates a new contest.

-   **Authentication:** Admin only.
-   **Request Body:** `IContest` object.

### `PATCH /api/contests/:contestID`

Updates an existing contest.

-   **Authentication:** Admin only.
-   **Request Body:** Partial `IContest` object.

### `DELETE /api/contests/:contestID`

Deletes a contest.

-   **Authentication:** Admin only.
