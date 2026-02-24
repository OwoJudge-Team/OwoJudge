## Announcements

Endpoints for managing announcements.

### `GET /api/announcement`

Retrieves a list of all announcements, sorted by timestamp (newest first).

-   **Response Example:**
    ```json
    [
      {
        "_id": "68fb8a12b3c4d5e6f7890123",
        "topic": "Welcome to OwoJudge",
        "content": "We are excited to announce the launch of OwoJudge!",
        "timestamp": "2025-10-25T08:00:00.000Z"
      }
    ]
    ```

### `GET /api/announcement/:id`

Retrieves a specific announcement by its ID.

-   **Parameters:**
    -   `id` (string): The unique identifier of the announcement.
-   **Response Example:**
    ```json
    {
      "_id": "68fb8a12b3c4d5e6f7890123",
      "topic": "Welcome to OwoJudge",
      "content": "We are excited to announce the launch of OwoJudge!",
      "timestamp": "2025-10-25T08:00:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Announcement retrieved successfully.
    -   `404 Not Found`: Announcement does not exist.

### `POST /api/announcement`

Creates a new announcement.

-   **Authentication:** Admin only.
-   **Request Body:**
    ```json
    {
      "topic": "System Maintenance",
      "content": "The judge will be down for maintenance tomorrow."
    }
    ```
-   **Response Example (201 Created):**
    ```json
    {
      "_id": "68fb8b23c4d5e6f78901234",
      "topic": "System Maintenance",
      "content": "The judge will be down for maintenance tomorrow.",
      "timestamp": "2025-10-25T09:00:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `201 Created`: Announcement created successfully.
    -   `400 Bad Request`: Invalid announcement data.
    -   `401 Unauthorized`: User is not an admin.

### `PUT /api/announcement/:id`

Updates an existing announcement.

-   **Authentication:** Admin only.
-   **Parameters:**
    -   `id` (string): The unique identifier of the announcement.
-   **Request Body:** Partial announcement object.
    ```json
    {
      "content": "The maintenance has been rescheduled."
    }
    ```
-   **Response Example (200 OK):**
    ```json
    {
      "_id": "68fb8b23c4d5e6f78901234",
      "topic": "System Maintenance",
      "content": "The maintenance has been rescheduled.",
      "timestamp": "2025-10-25T10:00:00.000Z"
    }
    ```
-   **Status Codes:**
    -   `200 OK`: Announcement updated successfully.
    -   `400 Bad Request`: Invalid update data.
    -   `401 Unauthorized`: User is not an admin.
    -   `404 Not Found`: Announcement does not exist.
