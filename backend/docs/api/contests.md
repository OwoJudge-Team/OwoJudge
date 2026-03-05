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
