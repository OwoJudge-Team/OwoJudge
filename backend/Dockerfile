# Use Ubuntu base image for better control group support
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Node.js dependencies
    curl \
    gnupg \
    # Build tools for isolate and native modules
    build-essential \
    gcc \
    g++ \
    make \
    pkg-config \
    # Isolate dependencies
    libcap-dev \
    libsystemd-dev \
    # Additional compilers for judging
    python3 \
    python3-pip \
    rustc \
    # System utilities
    git \
    wget \
    sudo \
    systemd \
    netcat \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Note: Running as root for isolate and cgroup operations

# Clone and build isolate
RUN git clone https://github.com/ioi/isolate.git /tmp/isolate \
    && cd /tmp/isolate \
    && make install \
    && rm -rf /tmp/isolate

# Create necessary directories for isolate
RUN mkdir -p /var/local/lib/isolate \
    && chmod 755 /var/local/lib/isolate

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy source code
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads problems user-solutions

# Set permissions for isolate
RUN chmod +x /usr/local/bin/isolate

# Create startup script that handles cgroup setup and runs the application as root
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Function to setup cgroups\n\
setup_cgroups() {\n\
    echo "Setting up cgroups..."\n\
    \n\
    # Check if cgroup v2 is mounted (newer systems)\n\
    if [ -d "/sys/fs/cgroup/cgroup.controllers" ]; then\n\
        echo "Detected cgroup v2"\n\
        # For cgroup v2, we need to enable controllers\n\
        if [ -w "/sys/fs/cgroup/cgroup.subtree_control" ]; then\n\
            echo "+memory +cpu +pids" > /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null || true\n\
        fi\n\
    else\n\
        echo "Setting up cgroup v1"\n\
        # Check if cgroups are already properly mounted\n\
        if [ ! -d "/sys/fs/cgroup/memory" ] || [ ! -f "/sys/fs/cgroup/memory/memory.limit_in_bytes" ]; then\n\
            echo "Mounting cgroup v1 filesystems..."\n\
            \n\
            # Create cgroup directories if they do not exist\n\
            mkdir -p /sys/fs/cgroup/memory /sys/fs/cgroup/cpuacct /sys/fs/cgroup/pids /sys/fs/cgroup/devices\n\
            \n\
            # Mount individual cgroup subsystems\n\
            mount -t cgroup -o memory memory /sys/fs/cgroup/memory 2>/dev/null || true\n\
            mount -t cgroup -o cpuacct cpuacct /sys/fs/cgroup/cpuacct 2>/dev/null || true\n\
            mount -t cgroup -o pids pids /sys/fs/cgroup/pids 2>/dev/null || true\n\
            mount -t cgroup -o devices devices /sys/fs/cgroup/devices 2>/dev/null || true\n\
        else\n\
            echo "Cgroups already mounted"\n\
        fi\n\
    fi\n\
    \n\
    # Ensure isolate directory exists\n\
    mkdir -p /run/isolate\n\
    chmod 755 /run/isolate\n\
}\n\
\n\
# Run cgroup setup\n\
setup_cgroups\n\
\n\
# Initialize isolate\n\
echo "Initializing isolate..."\n\
isolate --init --cg 2>/dev/null || isolate --init || echo "Warning: isolate init failed, continuing anyway"\n\
\n\
# Wait for MongoDB to be ready\n\
echo "Waiting for MongoDB to be ready..."\n\
while ! nc -z mongodb 27017; do\n\
    sleep 1\n\
done\n\
echo "MongoDB is ready!"\n\
\n\
# Initialize admin user if scripts directory exists\n\
if [ -f "/app/scripts/init-admin.js" ]; then\n\
    echo "Creating admin user..."\n\
    node /app/scripts/init-admin.js\n\
fi\n\
\n\
# Start the application\n\
echo "Starting application as root..."\n\
exec npm start\n\
' > /app/start.sh

RUN chmod +x /app/start.sh

# Create a sudoers file for the judgeuser to run isolate
RUN echo "judgeuser ALL=(ALL) NOPASSWD: /usr/local/bin/isolate" >> /etc/sudoers.d/isolate

# Keep running as root since we need root privileges for cgroup setup

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/api/problems || exit 1

# Start the application
CMD ["/app/start.sh"]