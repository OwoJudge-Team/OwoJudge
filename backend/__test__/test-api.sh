#!/bin/bash

# Start backend with predefined admin password
ADMIN_PASSWD="adminpassword" docker compose up --build -d
# wait until backend logs show Mongo connection
while ! docker compose logs --no-color backend 2>&1 | grep -q "Connected to mongo at"; do
    sleep 1
done
# Run API tests
cd __test__/api-test || exit 1
cargo --quiet test
cd ../..
# Remove containers, networks and volumes created by the test
if [ "$1" == '--debug' ]; then
    docker compose logs --no-color backend
    echo "Debug mode: keeping containers up. To stop them, run 'docker compose down -v --remove-orphans'"
    exit 0
fi

cargo --quiet run

docker compose down -v --remove-orphans || true
