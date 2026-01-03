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
    
    echo "Shutdown complete"
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

# Start the application in the background
echo "Starting application as root..."
npm run start:prod &
APP_PID=$!

# Wait for the application to exit
wait "$APP_PID"
