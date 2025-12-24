#!/bin/bash

# Start backend with predefined admin password

ADMIN_PASSWD="adminpassword" docker compose up --build -d
# wait until backend logs show it is listening
while ! docker compose logs --no-color backend 2>&1 | grep -q "Listening to port"; do
    sleep 1
done

sleep 5

# Run API tests
cd __test__/api-test || exit 1
cargo --quiet test
cd ../..
# Remove containers, networks and volumes created by the test
if [ "$1" == '--debug' ]; then
    docker compose logs --no-color backend
    echo "Debug mode: keeping containers up. To stop them, run 'docker compose down -v --remove-orphans'"
    docker compose down -v --remove-orphans || true
    exit 0
fi

cd __test__/api-test || exit 1
cargo --quiet run
cd ../..
docker compose logs > api_test_output 2>&1

docker compose down -v --remove-orphans || true
