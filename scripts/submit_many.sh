#!/bin/bash

curl -X POST --cookie-jar test-client \
        -H "Content-Type: application/json" \
        -d '{"username": "xxxxxxxx", "password": "xxxxxxxx"}' "${HOST_NAME}api/auth"

for i in {0..40}; do
    echo $i
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 1, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << b << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 8, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 9, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
done

for i in {0..4}; do
    echo $i
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 1, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 8, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
    curl -X POST --cookie test-client \
        -H "Content-Type: application/json" \
        -d '{"problemSerialNumber": 9, "language": "g++ c++17", "userSolution": [{"filename": "main.cpp","content": "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"}]}' \
        "${HOST_NAME}api/submissions"
done