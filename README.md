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

Refer to [backend/README.md#helper-scripts](backend/README.md#helper-scripts) for detailed usage.

## Backup

Refer to [backend/README.md#backup-and-restore](backend/README.md#backup-and-restore) for detailed usage.

The backend supports both manual and periodic backup export.

- Manual export command:

```bash
docker compose exec backend node scripts/export-old-judge-backup.js
```

- Periodic export is configured by env vars in [docker-compose.production.yml](docker-compose.production.yml) and [.env.example](.env.example):
   - `AUTO_BACKUP_ENABLED`
   - `AUTO_BACKUP_INTERVAL_SECONDS` (default `21600`, i.e. 4 times/day)
   - `AUTO_BACKUP_OUTPUT_DIR`
   - `AUTO_BACKUP_INCLUDE_RAW`
   - `AUTO_BACKUP_RUN_ON_START`

- Optional Google Drive upload is also supported:
   - `AUTO_BACKUP_GDRIVE_ENABLED`
   - `AUTO_BACKUP_GDRIVE_REMOTE`
   - `AUTO_BACKUP_GDRIVE_PATH`
   - `RCLONE_CONFIG`

For full setup details and examples, see [backend/README.md](backend/README.md#backup-and-restore).