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
        
        # Now enable controllers in the isolate cgroup (which is now empty of processes)
        echo "+memory +cpu +pids +cpuset +io" > /sys/fs/cgroup/isolate/cgroup.subtree_control

        # Verify controllers are enabled
        echo "Enabled controllers: $(cat /sys/fs/cgroup/isolate/cgroup.controllers)"
        
        # Set proper permissions
        chmod -R 755 /sys/fs/cgroup/isolate
        
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

# Initialize isolate
echo "Initializing isolate..."
isolate-cg-keeper && echo "isolate-cg-keeper started"
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

# Start the application
echo "Starting application as root..."
exec npm start
