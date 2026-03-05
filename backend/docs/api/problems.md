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
-   **Response:** `application/gzip` (.tar.gz) containing `{actualTestName}.in` and `{actualTestName}.out`, where `actualTestName` is the resolved test name (which may differ from the requested `testcaseName` depending on how the generator parses the test name).
-   **Status Codes:**
  -   `200 OK`: Successfully generated test case archive.
  -   `401 Unauthorized`: User not authenticated.
  -   `500 Internal Server Error`: Failed to generate test case.