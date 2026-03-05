## Submissions

Endpoints for managing code submissions.

### `GET /api/submissions`

Retrieves a list of submissions. Non-admin users can only view their own submissions unless they specify their own username/userID in filters. Admins can view all submissions.

-   **Authentication:** Required.
-   **Query Parameters (optional):**
    -   `username` (string): Filter submissions by username. Non-admins can only filter by their own username. Supports substring match (regex) for admins.
    -   `userID` (string): Filter submissions by user MongoDB ObjectId. Non-admins can only filter by their own userID.
    -   `problemSerialNumber` (number): Filter submissions by problem serial number (display ID).
    -   `status` (string): Filter submissions by status (e.g., `AC`, `WA`, `TLE`, `CE`, `RE`, `MLE`, `PS`). Supports substring match (regex).
    -   `minScore` (number): Filter submissions with score greater than or equal to this value.
    -   `maxScore` (number): Filter submissions with score less than or equal to this value.
    -   `index` (number): Number of records to skip (takes precedence over `offset`).
    -   `offset` (number): Number of records to skip (default: 0).
    -   `limit` (number): Number of records to return (default: 20).
-   **Examples:** 
    -   `GET /api/submissions?username=admin&problemSerialNumber=1001`
    -   `GET /api/submissions?status=AC&minScore=50`
    -   `GET /api/submissions?problemSerialNumber=0&maxScore=100&limit=10&offset=20`
-   **Response Example:**
    ```json
    {
      "total": 123,
      "submissions": [
        {
          "_id": "68fb7890a1b2c3d4e5f67890",
          "serialNumber": 1000000,
          "username": "admin",
          "userHandle": "Admin Administrator",
          "userID": "68fb6d6e6deaffa916ced917",
          "problemSerialNumber": 0,
          "problemTitle": "Problem Title",
          "language": "g++ c++17",
          "status": "AC",
          "score": 100,
          "time": 0.05,
          "memory": 2048,
          "createdTime": "2025-10-24T13:00:00.000Z"
        }
      ]
    }
    ```
-   **Note:** The response only includes summary fields. Use `GET /api/submission/:serialNumber` to get full submission details including source code and test results.

### `GET /api/submission/:serialNumber`

Retrieves a single submission by its serial number. Non-admin users can only view their own submissions.

-   **Authentication:** Required.
-   **Parameters:**
    -   `serialNumber` (number): The unique serial number of the submission (starts from 1000000).
-   **Response Example:**
    ```json
    {
      "_id": "68fb7890a1b2c3d4e5f67890",
      "serialNumber": 1000000,
      "username": "admin",
      "userHandle": "Admin Administrator",
      "userID": "68fb6d6e6deaffa916ced917",
      "problemSerialNumber": 0,
      "problemTitle": "Problem Title",
      "language": "g++ c++17",
      "status": "AC",
      "score": 100,
      "time": 0.05,
      "memory": 2048,
      "createdTime": "2025-10-24T13:00:00.000Z",
      "userSolution": [
        {
          "filename": "main.cpp",
          "content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"
        }
      ],
      "results": {
        "sample": {
          "score": 0,
          "testcases": [
            {
              "testcase": "0-01",
              "status": "AC",
              "time": 0.01,
              "memory": 1024,
              "message": "ok"
            },
            {
              "testcase": "0-02",
              "status": "AC",
              "time": 0.01,
              "memory": 1024,
              "message": "ok"
            }
          ]
        },
        "subtask1": {
          "score": 100,
          "testcases": [
            {
              "testcase": "1-01",
              "status": "AC",
              "time": 0.02,
              "memory": 2048,
              "message": "ok"
            }
          ]
        }
      }
    }
    ```
-   **Note:** The `results` field contains an object where keys are group/subtask names (e.g., `"sample"`, `"subtask1"`) and values are objects containing:
    -   `score` (number): Points earned for this group (0 if any test case failed, otherwise the group's assigned score).
    -   `testcases` (array): Array of individual test case results within this group, each containing:
        -   `testcase` (string): Test case identifier.
        -   `status` (string): Result status (`AC`, `WA`, `TLE`, `MLE`, `RE`, etc.).
        -   `time` (number): Execution time in seconds.
        -   `memory` (number): Memory usage in KB.
        -   `message` (string, optional): Additional message from the checker.
-   **Status Codes:**
    -   `200 OK`: Submission retrieved successfully.
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User is not authorized to view this submission.
    -   `404 Not Found`: Submission does not exist.

### `POST /api/submissions`

Creates a new code submission for a problem.

-   **Authentication:** Required.
-   **Request Body:** Submission object with the following fields:
    -   `problemSerialNumber` (number, required): The serial number of the problem to submit to.
    -   `language` (string, required): Programming language identifier (e.g., `"g++ c++17"`, `"python3"`, `"gcc c17"`).
    -   `userSolution` (array, required): Array of source code files.
        -   Each file has `filename` and `content` properties.
-   **Request Example:**
    ```json
    {
      "problemSerialNumber": 0,
      "language": "g++ c++17",
      "userSolution": [
        {
          "filename": "main.cpp",
          "content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"
        }
      ]
    }
    ```
-   **Response Example (201 Created):**
    ```json
    {
      "_id": "68fb7890a1b2c3d4e5f67890",
      "serialNumber": 1000000,
      "username": "admin",
      "userHandle": "Admin Administrator",
      "userID": "68fb6d6e6deaffa916ced917",
      "problemSerialNumber": 0,
      "problemTitle": "Problem Title",
      "language": "g++ c++17",
      "status": "PD",
      "score": 0,
      "createdTime": "2025-10-24T13:00:00.000Z",
      "userSolution": [
        {
          "filename": "main.cpp",
          "content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"
        }
      ],
      "results": {}
    }
    ```
-   **Status Codes:**
    -   `201 Created`: Submission created and queued successfully.
    -   `400 Bad Request`: Invalid submission data or problem is not ready (status is not `ready`).
    -   `401 Unauthorized`: User not authenticated.
    -   `404 Not Found`: Problem does not exist.
    -   `429 Too Many Requests`: Daily submission quota exceeded.
    -   `500 Internal Server Error`: Failed to creating submission.

**Note:** The submission status will initially be `PD` (Pending) or `QU` (Queued), and will be updated asynchronously by the judger system. Poll the GET endpoint to check the final status.