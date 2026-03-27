#!/bin/bash
set -e

# Function to setup cgroups
setup_cgroups() {
    echo "Setting up cgroups..."

    # Check if cgroup v1 is mounted
    if [ "$(stat -fc %T /sys/fs/cgroup/)" = "cgroup2fs" ]; then
        echo "Detected cgroup v2"
        
        # Create the isolate master cgroup directory
        mkdir -p /sys/fs/cgroup/isolate
        # echo $$ > /sys/fs/cgroup/isolate/cgroup.procs
        ls -al /sys/fs/cgroup/isolate/cgroup.subtree_control
        
        # Now enable controllers in the isolate cgroup (which is now empty of processes)
        echo "+memory +cpu +pids +cpuset +io" | tee /sys/fs/cgroup/isolate/cgroup.subtree_control

        # Verify controllers are enabled
        echo "Enabled controllers: $(cat /sys/fs/cgroup/isolate/cgroup.controllers)"
        
        # Set proper permissions
        chmod -R 755 /sys/fs/cgroup/isolate
        
        # echo "/sys/fs/cgroup/isolate" > /run/isolate/cgroup
        # chmod 644 /run/isolate/cgroup

        echo "Cgroup controllers enabled successfully"
        
    else
        echo "Failed to detect cgroup v2, please ensure cgroups are properly configured."
    fi

    # Ensure isolate directory exists
    mkdir -p /run/isolate
    echo "/sys/fs/cgroup/isolate" > /run/isolate/cgroup
    chmod 755 /run/isolate
}

# Run cgroup setup
setup_cgroups

cat > /usr/local/etc/isolate <<EOF
box_root=/var/local/lib/isolate
cg_root=/sys/fs/cgroup/isolate
lock_root=/var/local/lib/isolate/lock
first_uid=60000
first_gid=60000
num_boxes=1000
EOF

# Initialize isolate
echo "Initializing isolate..."
isolate-cg-keeper &
KEEPER_PID=$!
isolate --init --cg || echo "Warning: isolate init failed, continuing anyway"

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
while ! nc -z mongodb 27017; do
    sleep 1
done
echo "MongoDB is ready!"

# Initialize admin user if scripts directory exists
if [ -f "/app/scripts/init-admin.js" ]; then
    echo "Creating admin user..."
    node /app/scripts/init-admin.js
fi

# Periodic backup worker (default: every 6 hours = 4 times/day)
start_periodic_backup() {
    local enabled="${AUTO_BACKUP_ENABLED:-true}"

    if [ "$enabled" != "true" ]; then
        echo "Periodic backup is disabled (AUTO_BACKUP_ENABLED=$enabled)"
        return
    fi

    local script_path="/app/scripts/export-old-judge-backup.js"
    if [ ! -f "$script_path" ]; then
        echo "Periodic backup skipped: $script_path not found"
        return
    fi

    local interval_seconds="${AUTO_BACKUP_INTERVAL_SECONDS:-21600}"
    if ! [[ "$interval_seconds" =~ ^[0-9]+$ ]] || [ "$interval_seconds" -le 0 ]; then
        echo "Invalid AUTO_BACKUP_INTERVAL_SECONDS=$interval_seconds, using 21600"
        interval_seconds=21600
    fi

    local output_dir="${AUTO_BACKUP_OUTPUT_DIR:-/app/scripts/backup-temp/periodic}"
    local include_raw="${AUTO_BACKUP_INCLUDE_RAW:-true}"
    local run_on_start="${AUTO_BACKUP_RUN_ON_START:-false}"
    local gdrive_enabled="${AUTO_BACKUP_GDRIVE_ENABLED:-false}"
    local gdrive_remote="${AUTO_BACKUP_GDRIVE_REMOTE:-gdrive}"
    local gdrive_path="${AUTO_BACKUP_GDRIVE_PATH:-owojudge-backups}"
    local rclone_config="${RCLONE_CONFIG:-/secrets/rclone.conf}"

    mkdir -p "$output_dir"

    upload_to_gdrive() {
        if [ "$gdrive_enabled" != "true" ]; then
            return
        fi

        if ! command -v rclone >/dev/null 2>&1; then
            echo "[backup] Google Drive upload skipped: rclone not installed"
            return
        fi

        if [ ! -f "$rclone_config" ]; then
            echo "[backup] Google Drive upload skipped: RCLONE_CONFIG not found at $rclone_config"
            return
        fi

        local destination="${gdrive_remote}:${gdrive_path}"
        local stamp_dir
        stamp_dir="$(date +%F)"

        echo "[backup] Uploading backups to Google Drive: ${destination}/${stamp_dir}"
        if ! rclone copy "$output_dir" "${destination}/${stamp_dir}" \
            --config "$rclone_config" \
            --include "old-judge-converted-*.json" \
            --include "owojudge-raw-*.json" \
            --immutable; then
            echo "[backup] Google Drive upload failed at $(date -Iseconds)"
            return
        fi

        echo "[backup] Google Drive upload completed at $(date -Iseconds)"
    }

    run_backup_once() {
        echo "[backup] Starting periodic backup at $(date -Iseconds)"
        if [ "$include_raw" = "false" ]; then
            if ! node "$script_path" --output-dir "$output_dir" --no-raw; then
                echo "[backup] Backup failed at $(date -Iseconds)"
                return
            fi
        else
            if ! node "$script_path" --output-dir "$output_dir"; then
                echo "[backup] Backup failed at $(date -Iseconds)"
                return
            fi
        fi

        upload_to_gdrive
    }

    if [ "$run_on_start" = "true" ]; then
        run_backup_once
    fi

    (
        while true; do
            sleep "$interval_seconds"
            run_backup_once
        done
    ) &
    BACKUP_PID=$!

    echo "Periodic backup enabled: every ${interval_seconds}s, output=$output_dir, include_raw=$include_raw, gdrive_upload=$gdrive_enabled"
}

start_periodic_backup

# Function to handle shutdown
shutdown() {
    echo "Shutting down gracefully..."
    
    # Kill the Node.js application
    if [ ! -z "$APP_PID" ]; then
        echo "Stopping Node.js application (PID: $APP_PID)..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    
    # Kill isolate-cg-keeper
    if [ ! -z "$KEEPER_PID" ]; then
        echo "Stopping isolate-cg-keeper (PID: $KEEPER_PID)..."
        kill -TERM "$KEEPER_PID" 2>/dev/null || true
        wait "$KEEPER_PID" 2>/dev/null || true
    fi

    # Kill periodic backup worker
    if [ -n "$BACKUP_PID" ]; then
        echo "Stopping periodic backup worker (PID: $BACKUP_PID)..."
        kill -TERM "$BACKUP_PID" 2>/dev/null || true
        wait "$BACKUP_PID" 2>/dev/null || true
    fi
    
    echo "Shutdown complete"
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

# Start the application in the background
echo "Starting application as root..."
node ./dist/index.js &
APP_PID=$!

# Wait for the application to exit
wait "$APP_PID"
