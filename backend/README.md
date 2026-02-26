# OwoJudge Backend

OwoJudge is a modern, open-source online judge system designed for competitive programming contests and educational purposes. This document provides a comprehensive guide to setting up and understanding the backend services.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Backup and Restore](#backup-and-restore)
- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Judging Process](./docs/judger.md)

## Features

- **User Authentication**: Secure user registration and login with session management.
- **Problem Management**: Create, update, and manage programming problems with detailed descriptions, time/memory limits, and test cases.
- **Code Submission**: Submit solutions in multiple programming languages.
- **Automated Judging**: Asynchronous and sandboxed code compilation and execution using `isolate`.
- **Contest Management**: Create and manage programming contests with specific start and end times.
- **Real-time Status**: View submission statuses and results in real-time.

## Project Structure

The backend is organized into the following key directories:

- `src/`: Contains the main source code for the application.
  - `routes/`: Defines the API endpoints for different resources (users, problems, submissions, contests).
  - `mongoose/schemas/`: Defines the Mongoose schemas for the MongoDB database.
  - `judger/`: Contains the logic for the automated code judging system.
  - `validations/`: Includes validation schemas for API requests.
  - `utils/`: Provides utility functions used across the application.
- `docs/`: Contains detailed documentation for the API, database, and judger.
- `problems/`: Stores problem data, including descriptions, test cases, and solutions.
- `uploads/`: A temporary directory for file uploads.
- `isolate/`: Contains the source code for the `isolate` sandbox used for secure code execution.

## Prerequisites

Before you begin, ensure you have the following installed:

- Docker
- Docker Compose

## Deploy the Application

We use docker to deploy the application.
```
docker-compose build
docker-compose up -d
```

You will have to find the first admin user and password with the following command:
```
docker-compose logs -f backend
```

If your admin user is lost, you can connect to the MongoDB instance and delete the admin user from the `users` collection. Then restart the backend container to generate a new admin user. The password is hashed, which is why you need to recreate it.

## Contributing

We welcome contributions from the community! If you'd like to contribute, please follow these steps:

1. Fork the repository on GitHub.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with clear messages.
4. Push your changes to your forked repository.
5. Open a pull request to the main repository, describing your changes and why they should be merged.

## Development Scripts

We provide several scripts to generate mock data for testing and development purposes. These scripts can be run inside the backend container.

### Generating Mock Data

You can generate mock users, problems, and submissions using the following commands:

1. **Create Mock Users**
  Generates random users with ratings and solved problem counts.
  ```bash
  # Create 10 mock users (default)
  docker compose exec backend node scripts/create-mock-users.js

  # Create 50 mock users with a custom password
  docker compose exec backend node scripts/create-mock-users.js 50 mypassword
  ```

2. **Create Mock Problems**
  Generates random problems with realistic metadata and creates the necessary file structure in `problems/`.
  ```bash
  # Create 10 mock problems (default)
  docker compose exec backend node scripts/create-mock-problems.js

  # Create 20 mock problems
  docker compose exec backend node scripts/create-mock-problems.js 20
  ```

3. **Create Mock Submissions**
  Generates random submissions linking existing users to problems.
  *Note: Run this AFTER creating users and problems.*
  ```bash
  # Create 20 mock submissions (default)
  docker compose exec backend node scripts/create-mock-submissions.js

  # Create 100 mock submissions
  docker compose exec backend node scripts/create-mock-submissions.js 100
  ```

4. **Create Mock Contests**
  Generates random contests with start and end times.
  ```bash
  # Create 5 mock contests (default)
  docker compose exec backend node scripts/create-mock-contests.js

  # Create 10 mock contests
  docker compose exec backend node scripts/create-mock-contests.js 10
  ```

### Helper Scripts

- **Create Single Test User**:
  ```bash
  # Create an admin user
  docker compose exec backend node scripts/create-test-user.js admin adminpass "Admin User" true

  # Create a student user with studentId
  docker compose exec backend node scripts/create-test-user.js b12902033 password123 "Matt Li" false b12902033
  ```

- **Create accounts from CSV and send email**:
  ```bash
  # CSV must have header columns: email,name
  # Optional column: role (student|ta|judgeAdmin)
  # Example: students.csv
  # email,name,role
  # alice@example.edu,Alice Chen,student
  # bob@example.edu,Bob Lin,ta
  # admin2@example.edu,Admin Two,judgeAdmin

  docker compose exec \
    -e SMTP_HOST=smtp.example.edu \
    -e SMTP_PORT=587 \
    -e SMTP_SECURE=false \
    -e SMTP_USER=mailer@example.edu \
    -e SMTP_PASS='your-smtp-password' \
    backend \
    node scripts/create-student-accounts-from-csv.js \
    --csv /app/scripts/students.csv \
    --from mailer@example.edu \
    --signature "OwoJudge Team" \
    --failed-email-report /app/scripts/failed-email-report.json \
    --default-role student

  # Dry run (validate CSV only)
  docker compose exec backend node scripts/create-student-accounts-from-csv.js \
    --csv /app/scripts/students.csv \
    --from mailer@example.edu \
    --dry-run
  ```

  CSV file placement:
  - Put the CSV file in [scripts](scripts), for example [scripts/students.csv](scripts/students.csv).
  - This path is recommended because Docker mounts [scripts](scripts) to `/app/scripts` inside the backend container.
  - If your CSV is elsewhere, make sure that location is mounted into the container and use the in-container path in `--csv`.

  CSV structure requirements:
  - File must be UTF-8 encoded text.
  - First row must be a header row.
  - Required columns:
    - `email` (also accepted: `mail`, `username`)
    - `name` (also accepted: `displayName`, `display_name`, `student_name`)
  - One account per row.
  - Empty rows are ignored.

  Example CSV:
  ```csv
  email,name
  alice@example.edu,Alice Chen
  bob@example.edu,Bob Lin
  ```

  Common path examples:
  - Local file in repo: [scripts/students.csv](scripts/students.csv) → `--csv /app/scripts/students.csv`
  - Alternative file name: [scripts/students-2026-spring.csv](scripts/students-2026-spring.csv) → `--csv /app/scripts/students-2026-spring.csv`

  Behavior:
  - `username` = email
  - `displayName` = name
  - `role` = CSV `role` column, or `--default-role` when column is missing
  - password = random 16-character string
  - `--signature` controls the name shown at the end of the email body
  - sends email to each created account asking user to change password immediately
  - if account creation succeeds but email sending fails, the account remains created and is included in a failed-email report (with temporary password) for manual resend
  - use `--failed-email-report` to control output path; otherwise an auto-named report is written in the current directory

## Backup and Restore

### Manual backup export

Run backup export manually inside backend container:

```bash
docker compose exec backend node scripts/export-old-judge-backup.js
```

Useful options:

```bash
# custom output path
docker compose exec backend node scripts/export-old-judge-backup.js \
  --output-dir /app/scripts/backup-temp/manual

# converted format only (skip raw dump)
docker compose exec backend node scripts/export-old-judge-backup.js --no-raw
```

### Periodic backup (4 times/day)

Production startup script [start.sh](start.sh) supports automatic periodic backup.

Configure in [../docker-compose.production.yml](../docker-compose.production.yml) (or [../.env.example](../.env.example)):

- `AUTO_BACKUP_ENABLED` (default: `true`)
- `AUTO_BACKUP_INTERVAL_SECONDS` (default: `21600`, i.e. every 6 hours)
- `AUTO_BACKUP_OUTPUT_DIR` (default: `/app/scripts/backup-temp/periodic`)
- `AUTO_BACKUP_INCLUDE_RAW` (default: `true`)
- `AUTO_BACKUP_RUN_ON_START` (default: `false`)

After changing values, recreate backend:

```bash
docker compose -f docker-compose.production.yml --env-file .env up -d --build backend
```

### Upload periodic backups to Google Drive

Automatic upload is optional and uses `rclone` from backend container.

Set these env vars:

- `AUTO_BACKUP_GDRIVE_ENABLED=true`
- `AUTO_BACKUP_GDRIVE_REMOTE=gdrive`
- `AUTO_BACKUP_GDRIVE_PATH=owojudge-backups`
- `RCLONE_CONFIG=/secrets/rclone.conf`

Setup steps:

1. Create rclone config locally (`rclone config`) with remote name `gdrive`.
2. Save config file to [secrets/rclone.conf](secrets/rclone.conf).
3. Ensure [../docker-compose.production.yml](../docker-compose.production.yml) mounts [secrets](secrets) to `/secrets` (already configured).
4. Rebuild/restart backend.

Quick rclone usage (recommended):

```bash
# 1) On host machine: create/authorize Google Drive remote
rclone config

# 2) Copy generated config into repo-mounted secrets path
cp ~/.config/rclone/rclone.conf backend/secrets/rclone.conf

# 3) Verify remote from backend container
docker compose -f docker-compose.production.yml --env-file .env exec backend \
  rclone listremotes --config /secrets/rclone.conf

# 4) List top-level Drive folders
docker compose -f docker-compose.production.yml --env-file .env exec backend \
  rclone lsd gdrive: --config /secrets/rclone.conf

# 5) Manual test upload (before enabling automatic upload)
docker compose -f docker-compose.production.yml --env-file .env exec backend \
  rclone copy /app/scripts/backup-temp/periodic gdrive:owojudge-backups/manual-test \
  --config /secrets/rclone.conf
```

If your server cannot open a browser for OAuth, run `rclone config` on your local machine, then copy the generated [secrets/rclone.conf](secrets/rclone.conf) to the server.

Notes:

- Upload runs only after a successful backup export cycle.
- If upload fails, backend keeps running and retries next cycle.
