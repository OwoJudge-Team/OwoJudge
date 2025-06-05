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
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Create a non-root user for security
RUN useradd -m -s /bin/bash judgeuser \
    && usermod -aG sudo judgeuser \
    && echo "judgeuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

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

# Set permissions
RUN chown -R judgeuser:judgeuser /app \
    && chmod +x /usr/local/bin/isolate

# Create startup script
RUN echo '#!/bin/bash\n\
\n\
# Mount cgroups if not already mounted\n\
if [ ! -d "/sys/fs/cgroup/memory/memory.limit_in_bytes" ]; then\n\
    echo "Mounting cgroups..."\n\
    mount -t tmpfs cgroup_root /sys/fs/cgroup\n\
    mkdir -p /sys/fs/cgroup/memory /sys/fs/cgroup/cpuacct /sys/fs/cgroup/pids\n\
    mount -t cgroup -o memory cgroup /sys/fs/cgroup/memory\n\
    mount -t cgroup -o cpuacct cgroup /sys/fs/cgroup/cpuacct\n\
    mount -t cgroup -o pids cgroup /sys/fs/cgroup/pids\n\
fi\n\
\n\
# Initialize isolate\n\
isolate --init --cg || true\n\
\n\
# Start the application\n\
exec npm start\n\
' > /app/start.sh

RUN chmod +x /app/start.sh

# Switch to non-root user
USER judgeuser

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/api/problems || exit 1

# Start the application
CMD ["/app/start.sh"]