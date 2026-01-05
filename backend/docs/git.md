# Git Server Usage Guide

OwoJudge uses **Gitea** as a self-hosted Git server to provide a robust and automated submission workflow. This allows users to submit their solutions by simply pushing code to a Git repository.

## 1. Overview

When a user account is created in OwoJudge, the system automatically:
1. Creates a corresponding account in Gitea.
2. Creates a private repository for the user (named `<username>-dsa`).
3. Assigns an SSH URL for the repository to the user.

Submissions made via Git are processed automatically through **webhooks**. When you push code to the `main` branch, Gitea notifies OwoJudge, which then fetches your code, creates a submission, and triggers the grading process.

## 2. Getting Started

### Accessing Gitea
The Gitea web interface is available at the URL provided by your administrator (e.g., `http://your-judge-domain:3000`). You can log in using the same credentials as your OwoJudge account.

### Finding Your Repository
Your repository URL can be found on your OwoJudge profile page. It will look like this:
`ssh://git@your-judge-domain:22/<username>/<username>-dsa.git`

## 3. SSH Key Setup

To push code to the Git server, you must use **SSH authentication**.

### Step 1: Generate an SSH Key
If you don't have an SSH key, generate one using:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```
Press Enter to accept the default file location.

### Step 2: Add the Public Key to OwoJudge
1. Copy your **public** key (usually found in `~/.ssh/id_ed25519.pub`):
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. Go to your **Profile** or **Settings** page in OwoJudge.
3. Find the **Git Public Key** field and paste your key there.
4. Save the changes. OwoJudge will automatically sync this key to Gitea.

## 4. Submission Workflow

### Cloning Your Repository
```bash
git clone ssh://git@your-judge-domain:22/<username>/<username>-dsa.git
cd <username>-dsa
```

### Submitting a Solution
To submit a solution for a specific problem, you must follow the naming convention:

1. **Filename**: `<problem_serial_number>.c`
   - Example: For problem `1001`, name your file `1001.c`.
2. **Path**: Files should be in the root of the repository or any subdirectory (the system will find all `.c` files matching the pattern).
3. **Language**: Currently, only **C (GCC C17)** is supported for Git-based submissions.

### Push to Submit
Add, commit, and push your changes to the `main` branch:
```bash
git add 1001.c
git commit -m "Solve problem 1001"
git push origin main
```

Once pushed, the system will:
1. Detect the new commit.
2. Extract the code from any files matching the `<number>.c` pattern.
3. Create a submission in OwoJudge for the corresponding problem.
4. Update the submission status on the OwoJudge website.

## 5. Important Rules

- **Branch Filter**: Only pushes to the `main` branch will trigger a submission.
- **File Matching**: The system only processes files named exactly `[number].c`. Other files (like READMEs or helper scripts) will be ignored by the judge but stored in your repository.
- **Multiple Submissions**: You can submit multiple problems in a single push by including multiple validly named files.

## 6. Troubleshooting

- **Permission Denied (publickey)**: Ensure you have added your public key to OwoJudge and that your local SSH agent is using the correct private key.
- **Submission Not Appearing**: 
  - Check if the file name matches the problem serial number exactly (e.g., `1001.c`).
  - Ensure you pushed to the `main` branch.
  - Check the Gitea web UI to see if the push was successful.
- **Multiple Files for One Problem**: If a commit contains multiple files that match the same problem serial number, the system will include all of them in the submission (if the judge supports multi-file submissions).
