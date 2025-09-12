#!/bin/bash

test_problem_upload() {
    curl -X POST --cookie-jar test-client \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "b29a8b10e1fede4678315922"}' localhost:8787/api/auth

    curl -X POST --cookie test-client \
        -F "problem=@apb001.tar.gz" localhost:8787/api/problems
}

test_isolate_cg_functionality() {
    isolate --cg --init --box-id=0

    isolate --cg --processes=20 --box-id=0 --run -- /bin/bash -c "echo 'first'; sleep 1; echo 'second'"
}

# Run tests
test_problem_upload
test_isolate_cg_functionality
