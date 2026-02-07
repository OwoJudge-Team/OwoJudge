#!/bin/bash

# Check if tas.csv exists
if [ ! -f "tas.csv" ]; then
    echo "Error: tas.csv not found in the current directory."
    exit 1
fi

# Function to generate a random password
generate_password() {
    # Generate 12 character random string with alphanumeric characters
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12
}

echo "Starting account creation..."

# Read tas.csv line by line, skipping the header
# IFS=, sets the separator to comma
tail -n +2 tas.csv | while IFS=, read -r judgeAdmin ta student || [ -n "$judgeAdmin" ]; do
    # Remove potential carriage return characters (useful if CSV was edited on Windows)
    judgeAdmin=$(echo "$judgeAdmin" | tr -d '\r')
    ta=$(echo "$ta" | tr -d '\r')
    student=$(echo "$student" | tr -d '\r')

    # Create Judge Admin if the field is not empty
    if [ -n "$judgeAdmin" ]; then
        PASSWORD=$(generate_password)
        echo "Creating JudgeAdmin: $judgeAdmin with password: $PASSWORD"
        docker compose exec -T backend node scripts/create-user.js "$judgeAdmin" "$judgeAdmin" "$PASSWORD" "judgeAdmin" < /dev/null
    fi

    # Create TA if the field is not empty
    if [ -n "$ta" ]; then
        PASSWORD=$(generate_password)
        echo "Creating TA: $ta with password: $PASSWORD"
        docker compose exec -T backend node scripts/create-user.js "$ta" "$ta" "$PASSWORD" "ta" < /dev/null
    fi

    # Create Student if the field is not empty
    if [ -n "$student" ]; then
        PASSWORD=$(generate_password)
        echo "Creating Student: $student with password: $PASSWORD"
        docker compose exec -T backend node scripts/create-user.js "$student" "$student" "$PASSWORD" "student" < /dev/null
    fi
done

echo "Account creation complete."
