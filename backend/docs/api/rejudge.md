## Rejudge

Endpoints for triggering rejudges on submissions or problems.

### `POST /api/rejudge/submissions`

Triggers a rejudge for a list of specific submissions.

-   **Authentication:** Admin only.
-   **Request Body:**
    ```json
    {
        "serialNumbers": [100, 101, 102]
    }
    ```
-   **Responses:**
    -   `200 OK`: Rejudge triggered successfully.
    -   `400 Bad Request`: Invalid input (e.g., `serialNumbers` is not an array).
    -   `403 Forbidden`: User is not an admin.
    -   `404 Not Found`: No submissions found for the provided IDs.

### `POST /api/rejudge/problems`

Triggers a rejudge for all submissions associated with a list of problems.

-   **Authentication:** Admin only.
-   **Request Body:**
    ```json
    {
        "serialNumbers": [1, 2]
    }
    ```
-   **Responses:**
    -   `200 OK`: Rejudge triggered successfully.
    -   `400 Bad Request`: Invalid input (e.g., `serialNumbers` is not an array).
    -   `403 Forbidden`: User is not an admin.
    -   `404 Not Found`: No problems found for the provided IDs.

### `POST /api/rejudge/submission/:serialNumber`

Triggers a rejudge for a specific submission.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `serialNumber` (number): The unique serial number of the submission.
-   **Responses:**
    -   `200 OK`: Returns the updated submission object.
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User is not an admin.
    -   `404 Not Found`: Submission does not exist.

### `POST /api/rejudge/problem/:serialNumber`

Triggers a rejudge for all submissions associated with a specific problem.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `serialNumber` (number): The serial number of the problem.
-   **Responses:**
    -   `200 OK`: Rejudge triggered successfully.
    -   `400 Bad Request`: Invalid problem ID.
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User is not an admin.
    -   `404 Not Found`: Problem does not exist.