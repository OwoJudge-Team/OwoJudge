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
