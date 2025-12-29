# OwoJudge Backend

OwoJudge is a modern, open-source online judge system designed for competitive programming contests and educational purposes. This document provides a comprehensive guide to setting up and understanding the backend services.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
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
  ```
