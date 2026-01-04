#!/bin/bash

# 1. Start Gitea in the background as git user
/usr/bin/entrypoint &
PID=$!

# 2. Wait for Gitea to actually be up
# We loop until the Gitea CLI can connect to the internal socket/db
echo "Waiting for Gitea to start..."
sleep 10 # Give it a moment to initialize filesystem
until curl -s localhost:3000; do
  echo "Gitea not up yet..."
  sleep 5
done

echo "Gitea is up. Checking DB schema..."
# Only recreate tables if schema doesn't exist (check by verifying if admin user list works)
if ! su git -c "gitea admin user list" > /dev/null 2>&1; then
  echo "Schema not ready, recreating tables..."
  su git -c "gitea doctor recreate-table"
else
  echo "Schema already exists, skipping recreate-table."
fi

echo "Gitea is up. Configuring Admin..."

# Set default admin credentials (can be overridden via environment variables)
GITEA_ADMIN_USER=${GITEA_ADMIN_USER}
GITEA_ADMIN_PASSWD=${GITEA_ADMIN_PASSWD}
GITEA_ADMIN_EMAIL=${GITEA_ADMIN_EMAIL}

# 3. Create the Admin User (Idempotent: won't fail if exists)
# We use 'su git' because Gitea commands must run as the git user
if ! su git -c "gitea admin user list" | grep -q "$GITEA_ADMIN_EMAIL"; then
  su git -c "gitea admin user create \
    --username $GITEA_ADMIN_USER \
    --password $GITEA_ADMIN_PASSWD \
    --email $GITEA_ADMIN_EMAIL \
    --admin"
fi

rm -f /secrets/gitea_token.txt

# 4. Delete old tokens and generate a new Access Token
echo "Deleting old tokens for $GITEA_ADMIN_USER..."
# List all tokens and delete them one by one
# Note: gitea admin user list-auth-tokens uses positional argument, not --username flag
su git -c "gitea admin user list-auth-tokens $GITEA_ADMIN_USER" 2>/dev/null | tail -n +2 | while read -r line; do
  TOKEN_ID=$(echo "$line" | awk '{print $1}')
  if [ -n "$TOKEN_ID" ] && [ "$TOKEN_ID" != "ID" ]; then
    echo "Deleting token ID: $TOKEN_ID"
    su git -c "gitea admin user delete-auth-token $GITEA_ADMIN_USER $TOKEN_ID" 2>/dev/null || true
  fi
done

echo "Generating new Token..."
# Generate token with unique name using timestamp to avoid name collision
TOKEN_NAME="owojudge-token-$(date +%s)"
TOKEN=$(su git -c "gitea admin user generate-access-token --username $GITEA_ADMIN_USER --token-name $TOKEN_NAME" | awk '{print $NF}')

echo $TOKEN > /secrets/gitea_token.txt
echo "Token saved to shared volume."

# 5. Create webhook for push events (idempotent)
echo "Checking for existing webhook..."
GITEA_HTTP_PORT=${GITEA_HTTP_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-8787}
WEBHOOK_BRANCH_FILTER=${WEBHOOK_BRANCH_FILTER:-main}
WEBHOOK_URL="http://backend:${BACKEND_PORT}/api/webhook/gitea"

# Check if webhook already exists
# Using localhost because we are inside the same container
EXISTING_WEBHOOK=$(curl -s -X GET "http://gitea:${GITEA_HTTP_PORT}/api/v1/admin/hooks?type=default" \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" | grep "${WEBHOOK_URL}" || true)

echo "Existing webhook check result: $EXISTING_WEBHOOK"

if [ -z "$EXISTING_WEBHOOK" ]; then
  echo "Creating new system webhook..."
  curl -X POST "http://gitea:${GITEA_HTTP_PORT}/api/v1/admin/hooks" \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"active\": true,
      \"branch_filter\": \"${WEBHOOK_BRANCH_FILTER}\",
      \"config\": {
        \"url\": \"${WEBHOOK_URL}\",
        \"content_type\": \"json\"
      },
      \"events\": [
        \"push\"
      ],
      \"type\": \"gitea\"
    }"
  echo ""
  echo "Webhook created successfully."
else
  echo "Webhook already exists, skipping creation."
fi

# 6. Bring Gitea back to foreground so Docker keeps running
wait $PID