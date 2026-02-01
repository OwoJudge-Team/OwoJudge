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
docker compose exec backend node scripts/create-user.js <username> <displayName> <password> <role>
```

Where `<role>` is one of `student`, `ta`, or `judgeAdmin`.