# OwoJudge

## Quick Start

1. Copy the example environment file and modify it as needed:
   ```bash
   cp .env.example .env
   ```
2. Run the script
   ```bash
   ./run.sh
   ```

## Create User

To create a new user, run the following command:

```bash
docker compose exec backend node scripts/create-user.js <username> <displayName> <password> <role> [studentId]
```

Where `<role>` is one of `student`, `ta`, or `judgeAdmin`.
If provided, `[studentId]` is stored in the user's `studentId` field.