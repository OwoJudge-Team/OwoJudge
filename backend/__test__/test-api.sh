#!/bin/bash

# Start backend with predefined admin password
export GITEA_SSH_PORT=2222
rm -f ./secrets/gitea_token.txt
ADMIN_PASSWD="adminpassword" docker compose up --build -d
# wait until backend logs show it is listening
while ! docker compose logs --no-color backend 2>&1 | grep -q "Listening to port"; do
    sleep 1
done

echo "Backend is listening. Waiting for Gitea token..."
# Wait for Gitea token to be generated
while [ ! -f ./secrets/gitea_token.txt ]; do
    sleep 1
done
echo "Gitea token found."

# Debug: Check if backend container can see the token
echo "Checking token in backend container..."
docker compose exec backend ls -l /secrets/gitea_token.txt || echo "Token not found in backend container!"

sleep 5

# Run API tests
echo "Running API tests..."
cd __test__/api-test || exit 1
cargo --quiet test -- --test-threads=1
TEST_EXIT_CODE=$?
cd ../..

if [ "$1" == '--debug' ]; then
    echo "Debug mode: keeping containers up. To stop them, run 'docker compose down -v --remove-orphans'"
    exit $TEST_EXIT_CODE
fi

echo "Cleaning up..."
docker compose down -v --remove-orphans
exit $TEST_EXIT_CODE
