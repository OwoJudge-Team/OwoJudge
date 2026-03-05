#!/bin/bash

# Usage: ./create_accounts.sh [accounts.csv]
#
# CSV format (with header row):
#   username,displayname,role,studentId,password
#
# - role     : student | ta | judgeAdmin
# - studentId: optional; only used when role=student
# - password : optional; a random 12-char password is generated when left blank

CSV_FILE="${1:-accounts.csv}"

if [ ! -f "$CSV_FILE" ]; then
    echo "Error: CSV file '$CSV_FILE' not found."
    echo "Usage: $0 [accounts.csv]"
    exit 1
fi

# Generate a random 12-character alphanumeric password
generate_password() {
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12
}

echo "Starting account creation from '$CSV_FILE'..."

# Use Python to properly parse CSV (handles quoted fields with commas),
# outputting tab-separated values so bash can safely split on tabs.
python3 - "$CSV_FILE" <<'PYEOF' | while IFS=$'\t' read -r username displayname role studentId password; do
import csv, sys
with open(sys.argv[1], newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        print('\t'.join([
            row.get('username', ''),
            row.get('displayname', ''),
            row.get('role', ''),
            row.get('studentId', ''),
            row.get('password', ''),
        ]))
PYEOF

    # Skip blank lines
    [ -z "$username" ] && continue

    # Validate role
    if [[ "$role" != "student" && "$role" != "ta" && "$role" != "judgeAdmin" ]]; then
        echo "Skipping '$username': invalid role '$role' (must be student, ta, or judgeAdmin)"
        continue
    fi

    # Use provided password or generate one
    PASSWORD=${password:-$(generate_password)}

    if [ "$role" = "student" ] && [ -n "$studentId" ]; then
        echo "Creating $role: $username (displayname: $displayname, studentId: $studentId) with password: $PASSWORD"
        docker compose exec -T backend node scripts/create-user.js "$username" "$displayname" "$PASSWORD" "$role" "$studentId" < /dev/null
    else
        echo "Creating $role: $username (displayname: $displayname) with password: $PASSWORD"
        docker compose exec -T backend node scripts/create-user.js "$username" "$displayname" "$PASSWORD" "$role" < /dev/null
    fi
done

echo "Account creation complete."
