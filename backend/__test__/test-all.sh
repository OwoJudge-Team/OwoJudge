#!/bin/bash

test_problem_upload() {
    curl -X POST --cookie-jar test-client \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "b8edd5671564d4348113707e"}' localhost:8787/api/auth

    curl -X POST --cookie test-client \
        -F "problem=@docs/example/tps-example.tar.gz" localhost:8787/api/problems
}

test_isolate_cg_functionality() {
    isolate --cg --init --box-id=0

    isolate --cg --processes=20 --box-id=0 --run -- /bin/bash -c "echo 'first'; sleep 1; echo 'second'"
    isolate --cg --processes=20 --box-id=0 --time=1 --mem=512000 --run -- /bin/bash -c "echo 'first'; sleep 1; echo 'second'"
}


docker-compose up -d

# Run tests
test_problem_upload
test_isolate_cg_functionality
