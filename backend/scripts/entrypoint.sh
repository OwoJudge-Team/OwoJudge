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

# 3. Create the Admin User (Idempotent: won't fail if exists)
# We use 'su git' because Gitea commands must run as the git user
if ! su git -c "gitea admin user list" | grep -q "gary940610@gmail.com"; then
  su git -c "gitea admin user create \
    --username admin \
    --password admin \
    --email gary940610@gmail.com \
    --admin"
fi
# 4. Generate the Access Token
# We verify if the token file already exists to avoid overwriting/duplicating
if [ ! -f /secrets/gitea_token.txt ]; then
    echo "Generating new Token..."
    # Generate token and parse it (simple awk/sed or just raw output)
    # The command returns user and token. We filter for the token.
    TOKEN=$(su git -c "gitea admin user generate-access-token --username admin --token-name firsttoken" | awk '{print $NF}')
    
    echo $TOKEN > /secrets/gitea_token.txt
    echo "Token saved to shared volume."
else
    echo "Token already exists."
fi

# 5. Bring Gitea back to foreground so Docker keeps running
wait $PID