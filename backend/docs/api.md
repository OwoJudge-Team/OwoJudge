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

## Problems

Endpoints for managing programming problems.

### `GET /api/problems`

Retrieves a list of all problems.

-   **Response Example:**
    ```json
    [
      {
        "submissionDetail": {
          "accepted": 0,
          "submitted": 0,
          "timeLimitExceeded": 0,
          "memoryLimitExceeded": 0,
          "wrongAnswer": 0,
          "runtimeError": 0,
          "compilationError": 0,
          "processLimitExceeded": 0
        },
        "userDetail": {
          "solved": 0,
          "attempted": 0
        },
        "_id": "68fb738f149ff1b7927a14a6",
        "serialNumber": 0,
        "status": "ready",
        "createdTime": "2025-10-24T12:39:43.750Z",
        "title": "Problem Title",
        "timeLimit": 1,
        "memoryLimit": 2048,
        "tags": [
          "basic"
        ],
        "problemRelatedTags": [
          "math"
        ],
        "fullScore": 100,
        "dailyQuota": 3
      }
    ]
    ```
-   **Note:** `dailyQuota` represents the remaining daily submissions allowed for the authenticated user for that specific problem.

### `GET /api/problems/:serialNumber`

Retrieves a single problem by its serial number, including its description and sample test cases.

-   **Authentication:** Required.

```json
{
  "submissionDetail": {
    "accepted": 0,
    "submitted": 0,
    "timeLimitExceeded": 0,
    "memoryLimitExceeded": 0,
    "wrongAnswer": 0,
    "runtimeError": 0,
    "compilationError": 0,
    "processLimitExceeded": 0
  },
  "userDetail": {
    "solved": 0,
    "attempted": 0
  },
  "_id": "68fb738f149ff1b7927a14a6",
  "serialNumber": 0,
  "status": "ready",
  "createdTime": "2025-10-24T12:39:43.750Z",
  "title": "Problem Title",
  "timeLimit": 1,
  "memoryLimit": 2048,
  "processes": 1,
  "fullScore": 100,
  "scorePolicy": "sum",
  "tags": [
    "basic"
  ],
  "problemRelatedTags": [
    "math"
  ],
  "dailyQuota": 3,
  "__v": 0,
  "description": "# TPS example problem (a + b)\n\n## Story\n\nThis is an example problem for the TPS (Testlib Problem Specification) format. The problem is a simple addition problem where the task is to read two integers from the input and output their sum.\n\n## Description\n\nGiven two integers \\( a \\) and \\( b \\), output their sum.\n\n## Input\n\nThe input consists of a single line containing two integers \\( a \\) and \\( b \\) separated by a space.\n\n## Output\n\nOutput a single integer which is the sum of \\( a \\) and \\( b \\).\n\n## Constraints\n\n- \\( 1 \\leq a, b \\leq 100 \\)",
  "sampleTestcases": [
    {
      "name": "0-01",
      "input": "1 2\n",
      "output": "3\n"
    }
  ]
}
```
-   **Note:** `dailyQuota` represents the remaining daily submissions allowed for the current user.

### `POST /api/problems`

Creates a new problem by uploading a `.tar.gz` file containing the problem data.

-   **Authentication:** Admin only.
-   **Request:** `multipart/form-data` with a single file field named `problem`.

Please modify from tps-example in the docs/example.

-   **Response Example:**
    ```json
    {
      "_id": "68fb738f149ff1b7927a14a6",
      "serialNumber": 0,
      "title": "Problem Title",
      "status": "waiting",
      "createdTime": "2025-10-24T12:39:43.750Z",
      "timeLimit": 1,
      "memoryLimit": 2048,
      "tags": ["basic"],
      "problemRelatedTags": ["math"]
    }
    ```
-   **Note:** Test case generation starts in the background. The problem status will be `waiting` initially and will change to `ready` (or `error`) once processing is complete. Submissions are only allowed when the status is `ready`.

-   **Status Codes:**
    -   `201 Created`: Problem created successfully.
    -   `400 Bad Request`: Invalid problem data or file format.
    -   `401 Unauthorized`: If the requester is not an admin.

### `PUT /api/problems/:serialNumber`

Updates an existing problem by uploading a new `.tar.gz` file.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `serialNumber` (number): The serial number of the problem.
-   **Request:** `multipart/form-data` with a single file field named `problem`.

-   **Response Example:**
    `Problem updated successfully`

-   **Note:** Similar to creation, test case generation runs in the background and the problem status will be set to `waiting` during this time.

-   **Status Codes:**
    -   `201 Created`: Problem updated successfully.
    -   `400 Bad Request`: Invalid problem data.
    -   `401 Unauthorized`: If the requester is not an admin.
    -   `404 Not Found`: If the problem does not exist.

### `PATCH /api/problems/:serialNumber`

Updates specific metadata fields of a problem.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `serialNumber` (number): The serial number of the problem.
-   **Request Body:** Partial `IProblem` object.

-   **Response Example:**
    ```json
    {
      "serialNumber": 0,
      "title": "Updated Problem Title",
      "createdTime": "2025-10-24T12:39:43.750Z"
    }
    ```

-   **Status Codes:**
    -   `201 Created`: Problem updated successfully.
    -   `400 Bad Request`: Invalid update data.
    -   `401 Unauthorized`: If the requester is not an admin.
    -   `404 Not Found`: If the problem does not exist.

### `DELETE /api/problems/:serialNumber`

Deletes a problem and its associated files.

-   **Authentication:** Admin only.

-   **Response Example:**
    ```json
    {
      "serialNumber": 0,
      "title": "Problem Title",
      "status": "ready"
    }
    ```

-   **Status Codes:**
    -   `201 Created`: Problem deleted successfully.
    -   `401 Unauthorized`: If the requester is not an admin.
    -   `404 Not Found`: If the problem does not exist.

### `GET /api/problems/:serialNumber/allowed-languages`

Retrieves the list of programming languages allowed for submissions to a specific problem.

-   **Authentication:** Required.
-   **Parameters:**
    -   `serialNumber` (number): The serial number of the problem.
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
    -   `404 Not Found`: Problem with given serial number does not exist.
    -   `500 Internal Server Error`: Failed to read problem metadata.

### `GET /api/problems/:serialNumber/testcases/:testcaseName`

Generates a single test case using the specified test name and returns a compressed archive
containing both the input and output files.

-   **Authentication:** Required.
-   **Parameters:**
  -   `serialNumber` (number): The serial number of the problem.
  -   `testcaseName` (string): The name of the test case to generate.
-   **Response:** `application/gzip` (.tar.gz) containing `{testcaseName}.in` and `{testcaseName}.out`.
-   **Status Codes:**
  -   `200 OK`: Successfully generated test case archive.
  -   `401 Unauthorized`: User not authenticated.
  -   `500 Internal Server Error`: Failed to generate test case.

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

## Contests

Endpoints for managing contests.

### `GET /api/contests`

Retrieves a list of all contests.

-   **Response Example:**
    ```json
    [
      {
        "_id": "68fb7a00b2c3d4e5f6789012",
        "title": "Fall Programming Contest 2025",
        "description": "Annual fall programming contest featuring algorithmic challenges.",
        "startTime": "2025-11-01T09:00:00.000Z",
        "endTime": "2025-11-01T14:00:00.000Z",
        "problems": [
          {
            "serialNumber": 0,
            "score": 100
          }
        ],
        "standings": [],
        "createdTime": "2025-10-24T13:30:00.000Z"
      }
    ]
    ```

### `GET /api/contests/:id`

Retrieves a single contest by its ID.

-   **Parameters:**
    -   `id` (string): The unique identifier of the contest.
-   **Response Example:**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": [
        {
          "serialNumber": 0,
          "score": 100
        }
      ],
      "standings": [],
      "createdTime": "2025-10-24T13:30:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest retrieved successfully.
    -   `404 Not Found`: Contest does not exist.

### `POST /api/contests`

Creates a new contest.

-   **Authentication:** Admin only.
-   **Request Body:**
    -   `title` (string, required): Contest title.
    -   `description` (string, required): Contest description.
    -   `startTime` (Date, required): Contest start time.
    -   `endTime` (Date, required): Contest end time.
    -   `problems` (array of objects, required): Array of problem objects with `serialNumber` and `score`.
-   **Request Example:**
    ```json
    {
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": [
        {
          "serialNumber": 0,
          "score": 100
        }
      ]
    }
    ```
-   **Response Example (201 Created):**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": [
        {
          "serialNumber": 0,
          "score": 100
        }
      ],
      "standings": [],
      "createdTime": "2025-10-24T13:30:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `201 Created`: Contest created successfully.
    -   `400 Bad Request`: Invalid contest data.
    -   `401 Unauthorized`: If the requester is not an admin.

### `GET /api/contests/:id/standings`

Retrieves the standings for a specific contest.

-   **Responses:**
    -   `200 OK`: Returns an array of user standings, sorted by score (descending) and then by last submission time (ascending).
    -   `404 Not Found`: If the contest does not exist.

-   **Response Example:**
    ```json
    [
      {
        "username": "user1",
        "totalScore": 200,
        "solvedCount": 2,
        "problemScores": [
          {
            "serialNumber": 0,
            "score": 100,
            "lastSubmissionTime": "2025-11-01T10:00:00.000Z"
          },
          {
            "serialNumber": 1,
            "score": 100,
            "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
          }
        ],
        "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
      }
    ]
    ```

### `POST /api/contests/:id/standings/update`

Recalculates the standings for a specific contest based on submissions within the contest timeframe.

-   **Authentication:** Admin only.
-   **Responses:**
    -   `200 OK`: Standings updated successfully. Returns the updated standings.
    -   `401 Unauthorized`: If the user is not an admin.
    -   `404 Not Found`: If the contest does not exist.

-   **Response Example:**
    ```json
    {
      "message": "Standings updated successfully",
      "standings": [
        {
          "username": "user1",
          "totalScore": 200,
          "solvedCount": 2,
          "problemScores": [
            {
              "serialNumber": 0,
              "score": 100,
              "lastSubmissionTime": "2025-11-01T10:00:00.000Z"
            }
          ],
          "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
        }
      ]
    }
    ```

### `PATCH /api/contests/:id`

Updates an existing contest.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `id` (string): The unique identifier of the contest to update.
-   **Request Body:** Partial contest object with fields to update.
-   **Request Example:**
    ```json
    {
      "title": "Fall Programming Contest 2025 - Updated",
      "endTime": "2025-11-01T15:00:00.000Z"
    }
    ```
-   **Response Example (200 OK):**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "title": "Fall Programming Contest 2025 - Updated",
      "endTime": "2025-11-01T15:00:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest updated successfully.
    -   `400 Bad Request`: Invalid update data.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Contest does not exist.

### `DELETE /api/contests/:id`

Deletes a contest.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `id` (string): The unique identifier of the contest to delete.
-   **Response Example (200 OK):**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "title": "Fall Programming Contest 2025"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest deleted successfully.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Contest does not exist.

**Note:** Standings are sorted by total score (descending), with ties broken by earliest last submission time.

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
