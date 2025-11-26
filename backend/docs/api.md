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

Returns users matching the specified filter.

```
[
  {
    "_id": "68fb6bcfda3d0a2b7bd1b2c3",
    "username": "admin",
    "displayName": "Admin Administrator"
  }
]
```

### `GET /api/users/:username`

Retrieves a specific user by their username.

-   **Authentication:** Required.
-   **Responses:**
    -   `200 OK`: Returns the user object (excluding the password).
    -   `404 Not Found`: If the user does not exist.

Response Example:

```
{
  "_id": "68fb6d6e6deaffa916ced917",
  "username": "admin",
  "displayName": "Admin Administrator",
  "isAdmin": true,
  "solvedProblem": 0,
  "solvedProblems": [],
  "rating": 0,
  "__v": 0
}
```

### `POST /api/users`

Creates a new user.

-   **Authentication:** Admin only.
-   **Request Body:** `IUser` object.

Provide username, password, displayName, isAdmin fields in json format.

```
{
  "username": "newuser",
  "password": "securepassword",
  "displayName": "New User",
  "isAdmin": false
}
```

Responses:
-   `201 Created`: User created successfully.
-   `400 Bad Request`: Invalid user data.
-   `401 Unauthorized`: If the requester is not an admin.

```
{
  "errorLabelSet": {},
  "errorResponse": {
    "index": 0,
    "code": 11000,
    "errmsg": "E11000 duplicate key error collection: judge.users index: username_1 dup key: { username: \"newuser\" }",
    "keyPattern": {
      "username": 1
    },
    "keyValue": {
      "username": "newuser"
    }
  },
  "index": 0,
  "code": 11000,
  "keyPattern": {
    "username": 1
  },
  "keyValue": {
    "username": "newuser"
  }
}
```

### `PATCH /api/users/:username`

Updates a user's information.

-   **Authentication:** Admin or the user themselves.
-   **Request Body:** Partial `IUser` object.

You can update fields like `username`, `displayName`, `password`, and `isAdmin`.

Responses:
-   `200 OK`: User updated successfully.
-   `400 Bad Request`: Invalid update data.
-   `401 Unauthorized`: If the requester is neither an admin nor the user themselves.
-   `404 Not Found`: If the user does not exist.

### `DELETE /api/users/:username`

Deletes a user.

-   **Authentication:** Admin only.

## Problems

Endpoints for managing programming problems.

### `GET /api/problems`

Retrieves a list of all problems.
```
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
    "problemID": "tps-example",
    "createdTime": "2025-10-24T12:39:43.750Z",
    "title": "Problem Title",
    "timeLimit": 1,
    "memoryLimit": 2048,
    "tags": [
      "basic"
    ],
    "problemRelatedTags": [
      "math"
    ]
  }
]
```

### `GET /api/problems/:problemID`

Retrieves a single problem by its ID, including its description and sample test cases.

-   **Authentication:** Required.

```
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
  "problemID": "tps-example",
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

### `POST /api/problems`

Creates a new problem by uploading a `.tar.gz` file containing the problem data.

-   **Authentication:** Admin only.
-   **Request:** `multipart/form-data` with a single file field named `problem`.

Please modify from tps-example in the docs/example.

Responses:
-   `201 Created`: Problem created successfully.
-   `400 Bad Request`: Invalid problem data.
-   `401 Unauthorized`: If the requester is not an admin.

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

Retrieves a list of submissions. Non-admin users can only view their own submissions unless they specify their own username/userID in filters. Admins can view all submissions.

-   **Authentication:** Required.
-   **Query Parameters (optional):**
    -   `username` (string): Filter submissions by username. Non-admins can only filter by their own username.
    -   `userID` (string): Filter submissions by user MongoDB ObjectId. Non-admins can only filter by their own userID.
    -   `problemID` (string): Filter submissions by problem ID.
    -   `problemSerialNumber` (number): Filter submissions by problem serial number (display ID).
    -   `status` (string): Filter submissions by status (e.g., `AC`, `WA`, `TLE`, `CE`, `RE`, `MLE`, `PS`).
    -   `minScore` (number): Filter submissions with score greater than or equal to this value.
    -   `maxScore` (number): Filter submissions with score less than or equal to this value.
-   **Examples:** 
    -   `GET /api/submissions?username=admin&problemID=tps-example`
    -   `GET /api/submissions?status=AC&minScore=50`
    -   `GET /api/submissions?problemSerialNumber=0&maxScore=100`
-   **Response Example:**
    ```json
    [
      {
        "_id": "68fb7890a1b2c3d4e5f67890",
        "serialNumber": 1000000,
        "username": "admin",
        "userHandle": "Admin Administrator",
        "userID": "68fb6d6e6deaffa916ced917",
        "problemID": "tps-example",
        "problemSerialNumber": 0,
        "problemTitle": "Problem Title",
        "language": "g++ c++17",
        "status": "AC",
        "score": 100,
        "createdTime": "2025-10-24T13:00:00.000Z"
      }
    ]
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
      "problemID": "tps-example",
      "problemSerialNumber": 0,
      "problemTitle": "Problem Title",
      "language": "g++ c++17",
      "status": "AC",
      "score": 100,
      "createdTime": "2025-10-24T13:00:00.000Z",
      "userSolution": [
        {
          "filename": "main.cpp",
          "content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"
        }
      ],
      "results": [
        {
          "testcase": "0-01",
          "status": "AC",
          "time": 0.01,
          "memory": 1024,
          "message": "ok"
        }
      ]
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Submission retrieved successfully.
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User is not authorized to view this submission.
    -   `404 Not Found`: Submission does not exist.

### `POST /api/submissions`

Creates a new code submission for a problem.

-   **Authentication:** Required.
-   **Request Body:** Submission object with the following fields:
    -   `problemID` (string, required): The ID of the problem to submit to.
    -   `language` (string, required): Programming language identifier (e.g., `"g++ c++17"`, `"python3"`, `"gcc c17"`).
    -   `userSolution` (array, required): Array of source code files.
        -   Each file has `filename` and `content` properties.
-   **Request Example:**
    ```json
    {
      "problemID": "tps-example",
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
      "problemID": "tps-example",
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
      "results": []
    }
    ```
-   **Status Codes:**
    -   `201 Created`: Submission created and queued successfully.
    -   `400 Bad Request`: Invalid submission data.
    -   `401 Unauthorized`: User not authenticated.
    -   `404 Not Found`: Problem does not exist.

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
        "contestID": "contest-2025-fall",
        "title": "Fall Programming Contest 2025",
        "description": "Annual fall programming contest featuring algorithmic challenges.",
        "startTime": "2025-11-01T09:00:00.000Z",
        "endTime": "2025-11-01T14:00:00.000Z",
        "problems": ["tps-example", "problem-2", "problem-3"],
        "participants": ["user1", "user2", "admin"],
        "visibility": "public",
        "createdTime": "2025-10-24T13:30:00.000Z"
      }
    ]
    ```

### `GET /api/contests/:contestID`

Retrieves a single contest by its ID.

-   **Parameters:**
    -   `contestID` (string): The unique identifier of the contest.
-   **Response Example:**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "contestID": "contest-2025-fall",
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": [
        {
          "problemID": "tps-example",
          "title": "Problem Title",
          "tags": ["basic"]
        }
      ],
      "participants": ["user1", "user2", "admin"],
      "visibility": "public",
      "createdTime": "2025-10-24T13:30:00.000Z",
      "standings": [
        {
          "username": "user1",
          "score": 100,
          "solvedProblems": 1
        }
      ]
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest retrieved successfully.
    -   `404 Not Found`: Contest does not exist.

### `POST /api/contests`

Creates a new contest.

-   **Authentication:** Admin only.
-   **Request Body:** Contest object with the following fields:
    -   `contestID` (string, required): Unique identifier for the contest.
    -   `title` (string, required): Contest title.
    -   `description` (string, optional): Contest description.
    -   `startTime` (Date, required): Contest start time.
    -   `endTime` (Date, required): Contest end time.
    -   `problems` (array of strings, required): Array of problem IDs.
    -   `visibility` (string, optional): `"public"` or `"private"` (default: `"public"`).
-   **Request Example:**
    ```json
    {
      "contestID": "contest-2025-fall",
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": ["tps-example", "problem-2", "problem-3"],
      "visibility": "public"
    }
    ```
-   **Response Example (201 Created):**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "contestID": "contest-2025-fall",
      "title": "Fall Programming Contest 2025",
      "description": "Annual fall programming contest featuring algorithmic challenges.",
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T14:00:00.000Z",
      "problems": ["tps-example", "problem-2", "problem-3"],
      "participants": [],
      "visibility": "public",
      "createdTime": "2025-10-24T13:30:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `201 Created`: Contest created successfully.
    -   `400 Bad Request`: Invalid contest data.
    -   `401 Unauthorized`: User is not an admin.
    -   `403 Forbidden`: Contest with this ID already exists.

### `PATCH /api/contests/:contestID`

Updates an existing contest.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `contestID` (string): The unique identifier of the contest to update.
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
      "contestID": "contest-2025-fall",
      "title": "Fall Programming Contest 2025 - Updated",
      "endTime": "2025-11-01T15:00:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest updated successfully.
    -   `400 Bad Request`: Invalid update data.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Contest does not exist.

### `DELETE /api/contests/:contestID`

Deletes a contest.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `contestID` (string): The unique identifier of the contest to delete.
-   **Response Example (200 OK):**
    ```json
    {
      "_id": "68fb7a00b2c3d4e5f6789012",
      "contestID": "contest-2025-fall",
      "title": "Fall Programming Contest 2025"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Contest deleted successfully.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Contest does not exist.

### `GET /api/contests/:contestID/standings`

Retrieves the current standings/leaderboard for a contest.

-   **Parameters:**
    -   `contestID` (string): The unique identifier of the contest.
-   **Response Example:**
    ```json
    [
      {
        "username": "user1",
        "totalScore": 300,
        "solvedCount": 3,
        "problemScores": [
          {
            "problemID": "tps-example",
            "score": 100,
            "lastSubmissionTime": "2025-11-01T10:30:00.000Z"
          },
          {
            "problemID": "problem-2",
            "score": 100,
            "lastSubmissionTime": "2025-11-01T11:15:00.000Z"
          },
          {
            "problemID": "problem-3",
            "score": 100,
            "lastSubmissionTime": "2025-11-01T12:00:00.000Z"
          }
        ],
        "lastSubmissionTime": "2025-11-01T12:00:00.000Z"
      },
      {
        "username": "user2",
        "totalScore": 200,
        "solvedCount": 2,
        "problemScores": [
          {
            "problemID": "tps-example",
            "score": 100,
            "lastSubmissionTime": "2025-11-01T10:45:00.000Z"
          },
          {
            "problemID": "problem-2",
            "score": 100,
            "lastSubmissionTime": "2025-11-01T11:30:00.000Z"
          }
        ],
        "lastSubmissionTime": "2025-11-01T11:30:00.000Z"
      }
    ]
    ```
-   **Status Codes:**
    -   `200 OK`: Standings retrieved successfully.
    -   `400 Bad Request`: Contest ID not provided.
    -   `404 Not Found`: Contest does not exist.

**Note:** Standings are sorted by total score (descending), with ties broken by earliest last submission time.

### `POST /api/contests/:contestID/standings/update`

Recalculates and updates the standings for a contest based on all submissions within the contest timeframe.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `contestID` (string): The unique identifier of the contest.
-   **Response Example (200 OK):**
    ```json
    {
      "message": "Standings updated successfully",
      "standings": [
        {
          "username": "user1",
          "totalScore": 300,
          "solvedCount": 3,
          "problemScores": [
            {
              "problemID": "tps-example",
              "score": 100,
              "lastSubmissionTime": "2025-11-01T10:30:00.000Z"
            }
          ],
          "lastSubmissionTime": "2025-11-01T12:00:00.000Z"
        }
      ]
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Standings updated successfully.
    -   `400 Bad Request`: Contest ID not provided.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Contest does not exist.
    -   `500 Internal Server Error`: Server error.

**Note:** This endpoint recalculates standings from scratch based on all submissions made during the contest period. For each problem, it keeps the highest score achieved by each user.
