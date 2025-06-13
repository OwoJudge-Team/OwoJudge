#!/bin/bash

#========================================#
#  Test script for the OwoJudge backend  #
#========================================#
echo "Starting backend test..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build and start the services
echo "Building Docker images..."
docker-compose build

echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Test MongoDB connection
echo "Testing MongoDB connection..."
if docker exec judge-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✓ MongoDB is running"
else
    echo "✗ MongoDB connection failed"
fi

# Test backend health
echo "Testing backend health..."
if curl -f http://localhost:8787/api/auth/status > /dev/null 2>&1; then
    echo "✓ Backend is responding"
else
    # Check if it's a 401 (expected for auth endpoint)
    status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/api/auth/status)
    if [ "$status_code" = "401" ]; then
        echo "✓ Backend is responding (401 as expected)"
    else
        echo "✗ Backend health check failed (status: $status_code)"
    fi
fi

# Test isolate installation
echo "Testing isolate installation..."
if docker exec judge-backend isolate --version > /dev/null 2>&1; then
    echo "✓ Isolate is installed"
    docker exec judge-backend isolate --version
else
    echo "✗ Isolate installation failed"
fi

# Test compiler availability
echo "Testing compilers..."
if docker exec judge-backend gcc --version > /dev/null 2>&1; then
    echo "✓ GCC is available"
else
    echo "✗ GCC not found"
fi

if docker exec judge-backend g++ --version > /dev/null 2>&1; then
    echo "✓ G++ is available"
else
    echo "✗ G++ not found"
fi

if docker exec judge-backend make --version > /dev/null 2>&1; then
    echo "✓ Make is available"
else
    echo "✗ Make not found"
fi

# Show container logs
echo ""
echo "Backend logs:"
docker logs judge-backend --tail 20

echo ""
echo "Test completed. To stop the services, run: docker-compose down"
echo "To view live logs, run: docker-compose logs -f"
