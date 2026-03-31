# Password Reset

Users can reset their password via a two-step email flow.

## Setup

Add the following variables to your `.env`:

```env
# Domain used to derive user emails (e.g. alice -> alice@gmail.com)
USER_EMAIL_DOMAIN=gmail.com

# SMTP settings
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=OwoJudge <noreply@example.com>

# Base URL of your frontend (used to build the reset link)
FRONTEND_URL=http://localhost:3000
```

### Gmail example

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraddress@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=OwoJudge <youraddress@gmail.com>
```

Gmail requires a 16-character **App Password** — plain account passwords are blocked.
Generate one at: Google Account → Security → 2-Step Verification → App passwords.

Or follow the [link](https://myaccount.google.com/apppasswords)

### How email addresses are resolved

When `USER_EMAIL_DOMAIN` is set, every user's email is stored as `{username}@{USER_EMAIL_DOMAIN}` at creation time. The password reset flow reads this stored value directly.

If `USER_EMAIL_DOMAIN` is not set, or the generated address is not valid for a particular user, the system uses the `email` field stored on the user document instead. If neither is available, the request returns `500` with `{"message":"No email configured for this user"}`.

### Setting a user's email manually

When `USER_EMAIL_DOMAIN` does not produce a valid address for a user, the email can be set explicitly.

**Via API (admin or the user themselves):**

```
{ "email": "custom@example.com" }
```

Self-updates require `oldPassword` in the body, as with any other profile change.

**Via batch script (machine-level admin):**

Create a CSV file with `username` and `email` columns:

```csv
username,email
b12902033,b12902033@csie.ntu.edu.tw
r13922001,r13922001@ntu.edu.tw
```

Then run:

```bash
# Preview without writing
node scripts/set-emails.js --csv emails.csv --dry-run

# Apply
node scripts/set-emails.js --csv emails.csv --yes

# Custom MongoDB URI
node scripts/set-emails.js --csv emails.csv --mongo-uri mongodb://localhost:27017/judge --yes
```

The script connects directly to MongoDB and updates only users that exist. Any username not found in the database is skipped with a warning.

### Backward compatibility with old databases

Users restored from a backup (via `restore-backup.js`) will not have an `email` field in their documents. If `USER_EMAIL_DOMAIN` is set when running the restore, the script automatically populates `email` as `{username}@{USER_EMAIL_DOMAIN}` for any user that is missing one. These users can then use the password reset flow immediately after restore without any manual intervention.

## How a user resets their password

### Step 1 — Request a reset link

The user (or the frontend on their behalf) calls:

```
POST /api/auth/forgot-password
Content-Type: application/json

{ "username": "alice" }
```

The server sends an email to `alice@gmail.com` (or whatever the configured domain is) containing a reset link:

```
http://localhost:3000/reset-password?token=<token>
```

The token is valid for **1 hour**. The response is always `200 OK` regardless of whether the username exists, to prevent enumeration.


### Step 2 — Submit the new password

The frontend reads the `token` query parameter from the URL and calls:

```
POST /api/auth/reset-password/<token>
Content-Type: application/json

{ "newPassword": "newSecurePassword123" }
```

On success (`200 OK`) the password is updated and the token is invalidated immediately — the link cannot be reused.

**Error responses:**
- `400 Bad Request` — token is invalid or expired, or `newPassword` is shorter than 8 characters
- `500 Internal Server Error` — database or SMTP error


## Effect on Gitea

When a new user is created, their Gitea account is also assigned the email `{username}@{USER_EMAIL_DOMAIN}`. Changing the password via the reset flow only updates the OwoJudge password; Gitea credentials are unaffected.
