# OwoJudge Backend - Code Review Suggestions

Full review of the backend codebase covering security, reliability, performance, code quality, and testing.

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [High Severity Issues](#2-high-severity-issues)
3. [Medium Severity Issues](#3-medium-severity-issues)
4. [Low Severity Issues](#4-low-severity-issues)
5. [Test Coverage Gaps](#5-test-coverage-gaps)
6. [Script Issues](#6-script-issues)
7. [Prioritized Action Plan](#7-prioritized-action-plan)

---

## 1. Critical Security Issues

### 1.1 Command Injection in isolate-manager.ts

**File**: `src/utils/isolate-manager.ts:275`

The `run()` method interpolates unsanitized strings directly into a shell command:

```typescript
isolateCommand += `--run -- /bin/bash -c "${cwdPrefix}${command}"`;
```

If `command` or `cwd` ever contain user-influenced data, this enables arbitrary code execution.

**Fix**: Use `execFile` with argument arrays instead of string interpolation, or escape all shell metacharacters.

---

### 1.2 Command Injection in judger-worker.ts

**File**: `src/judger/judger-worker.ts:346`

```typescript
await execAsync(`cp -r ${generatedTestsDir} ${targetTestsDir}`);
```

Uses string interpolation for shell commands.

**Fix**: Use `fs.cpSync(src, dest, { recursive: true })` instead of shelling out.

---

### 1.3 Command Injection in generate-testcase.ts

**File**: `src/utils/generate-testcase.ts:301-306`

```typescript
finalCommand = `${finalCommand} ${randomArg}`;
await box.run(`./${finalCommand}`, ...);
```

The `finalCommand` is constructed from file system content (`gen_summary`) and testcase names without escaping.

**Fix**: Pass arguments as an array, not a concatenated string.

---

### 1.4 Weak Password Hashing with Shared Salt

**File**: `src/utils/hash-password.ts:8-40`

- Uses a **single global salt** for all passwords (stored in `salt.json`)
- `salt.json` is committed to the repository with a known value
- No per-user salt means all identical passwords produce identical hashes

**Fix**: Switch to `bcrypt` or `argon2` which handle per-password salts automatically. Remove `salt.json` from version control history.

---

### 1.5 Hardcoded Weak Session Secrets

**File**: `src/create-app.ts:59,62`

```typescript
cookieParser(process.env.COOKIE_SECRET || 'cj6u.4t/6')
session({ secret: process.env.SESSION_SECRET || 'z/ fup6ql4' })
```

Falls back to weak hardcoded defaults. If env vars are missing in production, sessions are trivially forgeable.

**Fix**: Throw an error at startup if `COOKIE_SECRET` or `SESSION_SECRET` are not set. Never provide defaults for secrets.

---

### 1.6 Webhook Signature Bypass

**File**: `src/routes/webhook.ts:72-75`

```typescript
if (!secret) {
  console.warn('[Webhook] GITEA_WEBHOOK_SECRET not set, skipping signature verification');
  next();
  return;
}
```

If `GITEA_WEBHOOK_SECRET` is unset, **all webhook requests are accepted unsigned**. An attacker could forge submissions.

**Fix**: Reject all webhooks if the secret is not configured. Fail closed, not open.

---

### 1.7 Credentials Logged to Console

**File**: `src/utils/gitea-service.ts:130,165`

Request bodies (containing passwords) and responses (containing tokens) are logged to console.

**Fix**: Remove or redact sensitive fields before logging.

---

## 2. High Severity Issues

### 2.1 Regex Injection (ReDoS)

**File**: `src/routes/users.ts:89`

```typescript
.equals({ $regex: `.*${value}.*`, $options: 'i' })
```

User input is directly embedded in a regex without escaping. Similar patterns in `src/routes/submission.ts:77,89`.

**Fix**: Escape regex special characters: `value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.

---

### 2.2 Path Traversal in problems.ts

**File**: `src/routes/problems.ts:714-716`

```typescript
if (problemDir.indexOf("..") !== -1 || tarFilePath.indexOf("..") !== -1) {
  throw new Error("Invalid file path");
}
```

Checking for `..` as a substring is insufficient (e.g., encoded sequences, symlinks).

**Fix**: Use `path.resolve()` and verify the resolved path is within the allowed base directory:
```typescript
const resolved = path.resolve(base, userInput);
if (!resolved.startsWith(path.resolve(base))) throw new Error("Invalid path");
```

---

### 2.3 Race Condition in Quota Checking

**Files**: `src/routes/submission.ts:299-324`, `src/routes/webhook.ts:246-276`

The quota check-then-increment is not atomic:
```typescript
if (currentUsage.count >= problem.dailyQuota) { ... }
currentUsage.count += 1;
await user.save();
```

Concurrent requests can both pass the check before either increments.

**Fix**: Use MongoDB's `$inc` with a conditional update (`findOneAndUpdate` with a `count < quota` filter) for atomic enforcement.

---

### 2.4 Missing Session Cookie Security Flags

**File**: `src/create-app.ts:66`

```typescript
cookie: { maxAge: oneHour * 24 * 120 }
```

Missing critical flags:
- `httpOnly: true` - prevents XSS from reading cookies
- `secure: true` - ensures cookies only sent over HTTPS
- `sameSite: 'strict'` or `'lax'` - prevents CSRF

Also, 120-day session lifetime is excessively long.

---

### 2.5 No Rate Limiting on Any Endpoint

No rate limiting middleware is applied anywhere. This enables:
- Brute force attacks on `/api/auth/login`
- Resource exhaustion on submission endpoints
- Abuse of proxy endpoints

**Fix**: Add `express-rate-limit` middleware, especially on auth and submission routes.

---

### 2.6 CORS Hardcoded and Not Configurable

**File**: `src/create-app.ts:48-51`

```typescript
app.use(cors({
  origin: ['http://gitea:3000', 'http://localhost:3500'],
  credentials: true,
}));
```

Hardcoded origins. In production deployments with different hostnames, CORS will either block legitimate requests or require code changes.

**Fix**: Read allowed origins from environment variables.

---

### 2.7 Docker Runs as Root with Privileged Mode

**Files**: `Dockerfile`, `docker-compose.yml:66,101`

- Container runs as root
- `privileged: true` is set
- AppArmor is disabled (`apparmor:unconfined`)
- Host `/run` is mounted read-write

While `isolate` may require elevated privileges, the Node.js application itself should run as a non-root user. Consider separating the judge worker into its own container.

---

### 2.8 Unverified Remote Script Execution in Dockerfile

**File**: `Dockerfile:51`

```dockerfile
RUN bash -c "$(curl -fsSL https://raw.githubusercontent.com/ioi-2017/tps/master/online-installer/install.sh)"
```

Downloads and executes a script from GitHub without checksum verification.

**Fix**: Pin to a specific commit and verify a SHA256 checksum, or vendor the script.

---

### 2.9 Information Disclosure via Error Responses

**Files**: Multiple routes (`auth.ts:51`, `contests.ts:45,87`, `submission.ts:340`, `problems.ts:394,722`)

Full error objects (including stack traces) are sent to clients:
```typescript
response.status(500).send(error);
```

**Fix**: Return generic error messages to clients. Log full errors server-side only.

---

## 3. Medium Severity Issues

### 3.1 No Pagination Limit Enforcement

**File**: `src/routes/submission.ts:102`

No maximum cap on the `limit` query parameter. A request with `?limit=999999` forces loading massive result sets.

**Fix**: `const limit = Math.min(parseInt(req.query.limit) || 20, 100);`

Same issue in `src/routes/users.ts:87-90` - user listing has no pagination at all.

---

### 3.2 N+1 Query in Webhook Processing

**File**: `src/routes/webhook.ts:163-316`

For each commit, for each changed file, the code:
1. Fetches file content from Gitea
2. Queries the problem from the database
3. Checks user quota

**Fix**: Batch-fetch all problems upfront. Cache Gitea file responses.

---

### 3.3 N+1 Query in Standing Calculation

**File**: `src/utils/standing-utils.ts:62`

```typescript
contest.problems.find(...)  // O(n) array scan per submission
```

**Fix**: Build a `Map` from `serialNumber -> problem` for O(1) lookups.

---

### 3.4 No Database Transactions for Standing Updates

**File**: `src/utils/standing-utils.ts:107-127`

Multiple `findOneAndUpdate()` calls without a MongoDB transaction. Concurrent submissions can produce inconsistent standings.

**Fix**: Wrap in a MongoDB session/transaction.

---

### 3.5 Submission Queue Race Condition

**File**: `src/judger/judger.ts:165-176`

```typescript
if (!this.submissionQueue.includes(submissionID)) {
  submission.status = SubmissionStatus.QU;
  await submission.save();
  this.submissionQueue.push(submissionID);
}
```

The check-then-push is not atomic. Use a `Set` and atomic database updates.

---

### 3.6 No MongoDB Connection Error Handling in Workers

**File**: `src/judger/judger-worker.ts:826`

```typescript
mongoose.connect(workerData.mongoUri);
```

No `.catch()`, no connection timeout, no retry logic. Workers silently fail if MongoDB is unavailable.

---

### 3.7 Worker Memory Leak Risk

**File**: `src/judger/judger.ts:44`

Worker error handler doesn't explicitly terminate dead workers. Failed workers may accumulate.

---

### 3.8 Synchronous File I/O Blocks Event Loop

**File**: `src/utils/hash-password.ts:14,22,27`

`readFileSync()` and `writeFileSync()` are called on the main thread during password operations.

**Fix**: Use async file I/O, or read the salt once at startup.

---

### 3.9 No Schema Constraints on Numeric Fields

**File**: `src/mongoose/schemas/problems.ts:142-146`

`timeLimit`, `memoryLimit`, `processes`, `fullScore`, and `dailyQuota` have no `min`/`max` constraints. Negative or zero values can cause undefined behavior.

---

### 3.10 Missing Timestamp Validation on Contests

**File**: `src/mongoose/schemas/contests.ts`

No validation that `startTime < endTime < submissionEndTime`. Invalid time ranges can break contest logic.

---

### 3.11 No Size Limit on Submission Content

**File**: `src/mongoose/schemas/submission.ts`

`userSolution.content` has no `maxlength`. A malicious user could store arbitrarily large code submissions.

---

### 3.12 Insecure Deserialization in Passport Strategy

**File**: `src/strategies/local-strategies.ts:7-9`

`serializeUser` uses unsafe type casting (`user.id as unknown as string`). `deserializeUser` doesn't verify the user's role hasn't changed between sessions.

---

### 3.13 Date Handling Uses Local Timezone

**File**: `src/routes/submission.ts:306-307`

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
```

Quota resets depend on server timezone. Different servers could reset at different times.

**Fix**: Use UTC: `today.setUTCHours(0, 0, 0, 0)`.

---

### 3.14 Polling Inefficiency in Judger

**File**: `src/judger/judger.ts:185`

Polls for new submissions every 1 second with a database query. Consider MongoDB change streams or a message queue for event-driven processing.

---

### 3.15 Hardcoded Isolate Sandbox Limits

**File**: `src/routes/problems.ts:606-623`

Sandbox limits (50 processes, 600 seconds, 2GB memory) are hardcoded. These should be configurable per-problem or via environment variables.

---

## 4. Low Severity Issues

### 4.1 `problems.ts` is 1400+ Lines

This file handles file uploads, test case generation, problem CRUD, and locking. The `ProblemLock` class should be a separate utility. Consider splitting into smaller route modules.

### 4.2 Quota Logic Duplicated in 3 Places

Quota checking/incrementing is copy-pasted across:
- `src/routes/submission.ts:299-324`
- `src/routes/webhook.ts:246-276`
- `src/routes/problems.ts:177-204`

Extract to a shared utility function to prevent drift.

### 4.3 Inconsistent HTTP Status Codes

Some update operations return `201 Created` (`contests.ts:165`, `problems.ts:858`) instead of `200 OK`. Reserve `201` for resource creation.

### 4.4 Unsafe `as any` Type Casts

- `src/routes/submission.ts:329`: `data.userID = user.id as any`
- `src/routes/submission.ts:71`: `const query: any = ...`
- `src/judger/judger-worker.ts:165`: `(submission._id as any).toString()`

Use proper TypeScript types instead.

### 4.5 `solvedProblems` Typed as `any`

**File**: `src/mongoose/schemas/users.ts:50`

```typescript
solvedProblems: any;
```

Should be properly typed as an array.

### 4.6 Hardcoded Relative Paths

**Files**: `src/judger/judger-worker.ts:295,517`, `src/utils/generate-testcase.ts:186`

Paths like `path.join('problems', ...)` break if the working directory changes. Use `process.cwd()` or an env var for the base path.

### 4.7 No Structured Logging

All logging uses raw `console.log` / `console.error` with no log levels, request IDs, or structured format. Consider a logging library (e.g., `pino` or `winston`).

### 4.8 Missing Audit Trail

No logging of security-relevant operations: user creation/deletion, role changes, problem deletion, contest modifications.

### 4.9 Isolate Branch Not Pinned

**File**: `Dockerfile:56`

```dockerfile
git switch fix/cgroup-v2
```

Uses a custom fork branch without pinning to a specific commit. Builds are non-reproducible.

---

## 5. Test Coverage Gaps

### 5.1 Missing Security Tests

- No brute force / rate limiting tests on auth endpoints
- No NoSQL injection tests (e.g., `{ "$gt": "" }` as username)
- No path traversal tests on file upload/download
- No CSRF protection tests
- No XSS tests on submission output
- No tests for concurrent session handling
- No tests for privilege escalation

### 5.2 Missing Judger/Worker Tests

- No tests for submission processing pipeline
- No tests for sandbox isolation correctness
- No tests for concurrent submission handling
- No tests for worker crash recovery

### 5.3 Incomplete Quota Tests

- `quota.test.ts` only tests basic 1-day boundary
- No timezone edge case tests
- No concurrent quota exhaustion tests
- No tests for negative quota values

### 5.4 Missing Contest Edge Cases

- `contests.test.ts` only tests standings with 3 users
- No tests for empty contests, tiebreakers, or concurrent standing updates

### 5.5 Brittle Mock Objects

Mock objects in tests don't fully match schemas. Schema changes can break real code while tests still pass. Consider using factory functions that derive mocks from actual schema definitions.

### 5.6 No Integration Tests

All tests mock the database layer. There are no integration tests that verify actual MongoDB queries, middleware chains, or end-to-end submission flows.

---

## 6. Script Issues

### 6.1 `.env` and `salt.json` Appear Committed

Both files contain secrets and appear to be tracked by git despite being in `.gitignore`. If they were committed before being gitignored, they remain in history.

**Fix**: Remove from git history using `git filter-repo` or BFG Repo Cleaner. Rotate all exposed credentials.

### 6.2 Admin Credential File Permissions

**File**: `scripts/init-admin.js:134-135`

Only `init-admin.js` uses restrictive permissions (`0o600`) when writing credential files. Other scripts that write credentials don't set permissions.

### 6.3 No Input Validation in CLI Scripts

Scripts like `create-mock-problems.js` parse arguments with `parseInt(args[0]) || 10` but don't validate bounds (e.g., negative values).

### 6.4 restore-backup.js Drops All Data Without Transaction

**File**: `scripts/restore-backup.js:198-211`

Drops all collections before restoring. If restore fails partway, the database is left in a corrupt state. Should use a transaction or restore to a temporary collection first.

### 6.5 Plaintext Passwords in Email

**File**: `scripts/create-student-accounts-from-csv.js:265-284`

Sends generated passwords in plaintext via SMTP with no TLS verification option.

---

## 7. Prioritized Action Plan

### Immediate (Security Critical)

| # | Issue | Location |
|---|-------|----------|
| 1 | Fix command injection in isolate-manager `run()` | `src/utils/isolate-manager.ts:275` |
| 2 | Fix command injection in judger-worker `cp` | `src/judger/judger-worker.ts:346` |
| 3 | Fix webhook signature bypass (fail closed) | `src/routes/webhook.ts:72-75` |
| 4 | Remove credential logging in gitea-service | `src/utils/gitea-service.ts:130,165` |
| 5 | Remove `.env` and `salt.json` from git history | Repository root |
| 6 | Require env vars for secrets (no fallback defaults) | `src/create-app.ts:59,62` |

### Short Term (High Priority)

| # | Issue | Location |
|---|-------|----------|
| 7 | Switch to bcrypt/argon2 for password hashing | `src/utils/hash-password.ts` |
| 8 | Add rate limiting middleware | `src/create-app.ts` |
| 9 | Fix regex injection in user/submission search | `src/routes/users.ts:89`, `submission.ts:77` |
| 10 | Add session cookie security flags | `src/create-app.ts:66` |
| 11 | Fix path traversal checks to use `path.resolve` | `src/routes/problems.ts:714` |
| 12 | Make quota check-and-increment atomic | `src/routes/submission.ts:299` |
| 13 | Stop returning raw error objects to clients | Multiple route files |
| 14 | Make CORS origins configurable via env var | `src/create-app.ts:48` |

### Medium Term

| # | Issue | Location |
|---|-------|----------|
| 15 | Add pagination limits (max cap) | `src/routes/submission.ts`, `users.ts` |
| 16 | Add MongoDB connection error handling in workers | `src/judger/judger-worker.ts:826` |
| 17 | Add schema constraints (min/max on numbers, maxlength) | `src/mongoose/schemas/*.ts` |
| 18 | Use UTC for quota date calculations | `src/routes/submission.ts:306` |
| 19 | Extract quota logic to shared utility | 3 duplicate locations |
| 20 | Add MongoDB transactions for standing updates | `src/utils/standing-utils.ts:107` |
| 21 | Optimize N+1 queries in webhook and standings | `src/routes/webhook.ts`, `standing-utils.ts` |
| 22 | Pin Dockerfile dependencies to specific commits | `Dockerfile:51,56` |
| 23 | Separate judge worker into its own container | `docker-compose.yml` |
| 24 | Add structured logging | Project-wide |

### Long Term

| # | Issue | Location |
|---|-------|----------|
| 25 | Split `problems.ts` route into smaller modules | `src/routes/problems.ts` |
| 26 | Replace polling with change streams or message queue | `src/judger/judger.ts:185` |
| 27 | Add integration tests with real MongoDB | `src/__test__/` |
| 28 | Add security-focused tests (injection, authz) | `src/__test__/` |
| 29 | Add audit logging for admin operations | Project-wide |
| 30 | Run Node.js as non-root in Docker | `Dockerfile`, `docker-compose.yml` |
