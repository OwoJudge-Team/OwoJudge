#!/bin/bash

# Adds a pre-receive hook to all Gitea repositories to enforce a max file size limit.
# The hook rejects pushes containing any single file larger than 1 MB.
#
# Usage: ./set_limit.sh

set -e

CONTAINER="judge-gitea"
HOOK_NAME="check-file-size"
REPO_BASE="/data/git/repositories"
TMP_HOOK=$(mktemp)

cat > "$TMP_HOOK" << 'HOOKEOF'
#!/bin/sh

MAX_SIZE=1048576
NULL_SHA="0000000000000000000000000000000000000000"

while read oldrev newrev refname; do
    [ "$newrev" = "$NULL_SHA" ] && continue

    # Use process substitution to avoid subshell
    while read sha path; do
        [ -z "$path" ] && continue
        if [ "$(git cat-file -t "$sha")" = "blob" ]; then
            size=$(git cat-file -s "$sha")
            if [ "$size" -gt "$MAX_SIZE" ]; then
                echo "----------------------------------------------------"
                echo "File '$path' is too big!"
                echo "Size: $(expr $size / 1024) KB, limit 1024 KB."
                echo "----------------------------------------------------"
                exit 1  # now this exit kills the main hook process
            fi
        fi
    done < <(git rev-list --objects "$newrev" --not --all)

done
HOOKEOF

chmod +x "$TMP_HOOK"

echo "Installing pre-receive hook '$HOOK_NAME' into all repos in container '$CONTAINER'..."

# Copy the hook file into the container at a temporary location
docker cp "$TMP_HOOK" "$CONTAINER:/tmp/$HOOK_NAME"
rm -f "$TMP_HOOK"

# Distribute the hook to every repository's pre-receive.d directory
docker exec "$CONTAINER" sh -c "
    find \"$REPO_BASE\" -type d -name 'pre-receive.d' | while read hook_dir; do
        cp /tmp/$HOOK_NAME \"\$hook_dir/$HOOK_NAME\"
        chmod +rx \"\$hook_dir/$HOOK_NAME\"
        echo \"  ✔ \$hook_dir/$HOOK_NAME\"
    done
    rm -f /tmp/$HOOK_NAME
"

echo "Done."