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
    netcat-openbsd \
    systemd-sysv \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Note: Running as root for isolate and cgroup operations

# Install tps
RUN bash -c "$(curl -fsSL https://raw.githubusercontent.com/ioi-2017/tps/master/online-installer/install.sh)"

# Clone and build isolate
RUN git clone https://github.com/mtmatt/isolate.git /tmp/isolate \
    && cd /tmp/isolate \
    && git switch fix/cgroup-v2 \
    && make install \
    && make isolate-cg-keeper \
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

# Copy startup script that handles cgroup setup and runs the application as root
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create a sudoers file for the judgeuser to run isolate
RUN echo "judgeuser ALL=(ALL) NOPASSWD: /usr/local/bin/isolate" >> /etc/sudoers.d/isolate

# Keep running as root since we need root privileges for cgroup setup

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/api/problems || exit 1

# Use systemd as the container init
ENTRYPOINT ["/app/start.sh"]