Welcome to DSA Judge+! This tutorial will guide you step by step on how to submit your programming assignments using Git.

> **Tip**: Git is an essential skill for every programmer. Once you learn it, you can use it not only here but also in the workplace and open-source communities!


## What is Git?

Git is a **version control system** that helps you track the history of changes to your code. In this Judge, we use Git as the method for submitting code, replacing the traditional upload button.


## Installing Git

### Windows

1. Go to the [official Git download page](https://git-scm.com/download/win)
2. Download and run the installer
3. Keep the default options during installation
4. After installation, use **Git Bash** as your command interface (recommended)

### macOS

Open Terminal and run:
```bash
xcode-select --install
```
Or using Homebrew:
```bash
brew install git
```


### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install git
```


### Linux (Fedora/CentOS)

```bash
sudo dnf update
sudo dnf install git
```


### Verify Installation

After installation, open a terminal (use Git Bash on Windows) and run:
```bash
git --version
```
If you see a version number (e.g., `git version 2.40.0`), the installation was successful!


## Generating an SSH Key

DSA Judge+'s Git submission **only supports SSH Public Key authentication**. Therefore, you need to generate an SSH Key and add the Public Key to your Judge account.

### Step 1: Check if You Already Have an SSH Key

```bash
ls ~/.ssh
```

> Note: If you are on Windows, you should use Git Bash, PowerShell, or WSL to run this command.

If you see paired files like `id_rsa` and `id_rsa.pub` (or `id_ed25519` and `id_ed25519.pub`), you already have an SSH Key and can skip the generation step.

### Step 2: Generate a New SSH Key

If you don't have an SSH Key, run:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

> <b>Note:</b> If your system doesn't support Ed25519, use:
> ```bash
> ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
> ```

You'll be asked a few questions:
- **Enter file in which to save the key**: Press Enter to use the default path
- **Enter passphrase**: Optionally set a password (press Enter to skip)
- **Enter same passphrase again**: Re-enter the password (or press Enter)

### Step 3: Copy Your Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

Or (if you used RSA):
```bash
cat ~/.ssh/id_rsa.pub
```

You'll see something like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG... your_email@example.com
```
or
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... your_email@example.com
```

**Copy the entire line** (from `ssh-` to the end).


## Adding Your SSH Key to the Judge

1. Log in to DSA Judge+
2. Click **Settings** in the top-right corner
3. Find the **SSH Public Key** field
4. Paste the SSH Public Key you just copied
5. Enter your current login password in **Current Password**
6. Click **Save Changes**

> A **<span style="color:lime">green</span>** notification means the settings were saved successfully!
>
> A **<span style="color:red">red</span>** notification means something went wrong. Check:
> - The SSH Key format is correct
> - The password is correct


## Cloning Your Personal Repository

Every user on DSA Judge+ has a personal Git repository.

### Step 1: Find Your Git Repository URL

On your **profile** page, you can find your **Git Repository** URL in this format:

```
ssh://git@dsa.csie.ntu.edu.tw:22/B14902000/B14902000-dsa.git
```

You can copy this URL by clicking the URL.


### Step 2: Clone the Repository

Navigate to a folder of your choice and run:

```bash
git clone <your Git Repository URL>
```

For example:
```bash
git clone ssh://git@dsa.csie.ntu.edu.tw:22/B14902000/B14902000-dsa.git
```

If everything is correct, a folder named after your username will be created.

### First-Time Connection Confirmation

On the first connection, the system may ask if you trust the server:
```
The authenticity of host 'dsa.csie.ntu.edu.tw' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
Type `yes` and press Enter.


## Submitting Your Code

### File Naming Rules

**Very important!** Your code files must follow these naming rules:

| Rule | Description | Example |
|------|-------------|---------|
| Filename | `<problem number>.c` | `0.c`, `5.c` |
| Language | Only **C** is supported | Only `.c` extension |
| Location | Place in the repository root | `0.c` or `5.c` |

### Submission Workflow

1. **Navigate to your repository folder**
   ```bash
   cd <your-username>-dsa
   ```

2. **Write or paste your code**

   Create a `.c` file named after the problem number, e.g., `0.c`.

3. **Stage the file**
   ```bash
   git add 0.c
   ```

   Or stage all changes at once:
   ```bash
   git add .
   ```

4. **Create a commit**
   ```bash
   git commit -m "Solve problem 0"
   ```

   > **Tip**: The message in quotes can be anything describing your change.

5. **Push to the Judge**
   ```bash
   git push origin main
   ```

### First-Time Commit Setup

If this is your first time using Git, you may need to set your identity:
```bash
git config --global user.email "your_email@example.com"
git config --global user.name "Your Name"
```

---

## Practice: Problem 0 (A+B Problem)

This is a problem to help you practice the Git submission workflow. Once you complete it, you'll know how to submit assignments using Git!

### Problem Description

Given two integers a and b, calculate their sum.

### Input

The input consists of a single line containing two integers a and b, separated by a space.

### Output

Output a single integer, which is the sum of a and b.

### Constraints
- $1 \leq a, b \leq 100$


### Sample Solution

Create a file named `0.c` in your repository with the following content:

```c
#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a + b);
    return 0;
}
```

### Complete Submission Steps

```bash
# 1. Navigate to your repository folder
cd <your-username>-dsa

# 2. Create the 0.c file (use your preferred editor)
# For example, using nano:
nano 0.c
# Paste the code above, save, and exit

# 3. Check current status (optional)
git status

# 4. Stage 0.c
git add 0.c

# 5. Create a commit
git commit -m "Solve problem 0 - A+B"

# 6. Push to the Judge
git push origin main
```

### Expected Result

If everything goes well, you should:
1. See a Submission ID in the `git push` output
2. See your submission on the **Submissions** page of DSA Judge+
3. See the result as **AC (Accepted)**

> **Congratulations!** If you get AC, you've successfully learned how to submit with Git!


## Viewing Submission Results

After pushing, you can:

1. **Check on the Judge website**

   Log in to DSA Judge+ and go to the **Submissions** page to see your uploaded code.

2. **View the judging result**

   Click on a submission to view detailed results.


## FAQ

### Q1: Permission denied (publickey)

**Cause**: SSH Key is not correctly configured.

**Solution**:
1. Make sure the Public Key is added to DSA Judge+ Settings
2. Confirm the corresponding Private Key exists locally
3. Run `ssh-add ~/.ssh/id_ed25519` (or `id_rsa`) to add the key to SSH Agent

### Q2: Submission doesn't appear on the Judge

**Possible causes**:
1. File name doesn't follow the rules (must be `<problem number>.c`)
2. Pushed to the wrong branch (must be `main`)
3. File was not modified (Git only uploads changed files)

**Solution**:
1. Confirm the filename is the correct problem number, e.g., `1001.c`
2. Confirm you ran `git push origin main`
3. Make a change to the file and push again

### Q3: Git says "everything up-to-date" but submission didn't go through

**Cause**: No new changes were made, or changes weren't committed.

**Solution**:
```bash
git status           # Check current status
git add .            # Stage all changes
git commit -m "msg"  # Create a commit
git push origin main
```

### Q4: "Please tell me who you are" error

**Solution**:
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "your-name"
```


## Important Notes

> Please read the following carefully to avoid submission failures!

1. **Confirm Your Submission**
   - If you don't see a record on the Judge's Submissions page, the submission **was not successful**
   - Always verify on the website after pushing

2. **Submission Limit**
   - Each user may submit at most **10 times per problem per day**
   - Unused attempts **do not carry over**

3. **Branch Restriction**
   - Only pushes to the **main** branch are treated as submissions
   - Changes on other branches (e.g., `submit`, `master`) will **not** be sent to the Judge

4. **File Format**
   - Only files matching `<problem number>.c` will be processed
   - Other files (e.g., README, notes) will be ignored but remain in the repository

5. **Only Modified Files Are Uploaded**
   - Git only uploads files that were **changed** in the current push
   - To resubmit the same code, make a minor change (e.g., add a blank line)

6. **Do Not Rebase Already-Pushed Commits**
   - Do **not** rebase or restructure commits that have already been pushed to the main branch
   - Doing so may cause future pushes to fail

7. **Repository Size Limit**
   - Do not push large files or excessive junk commits
   - Exceeding the limit may prevent further pushes


## Quick Command Reference

| Purpose | Command |
|---------|---------|
| Install Git | See [Installation section](#installing-git) |
| Generate SSH Key | `ssh-keygen -t ed25519 -C "email"` |
| View SSH Public Key | `cat ~/.ssh/id_ed25519.pub` |
| Clone Repository | `git clone <URL>` |
| Check status | `git status` |
| Stage files | `git add <file>` or `git add .` |
| Create commit | `git commit -m "commit message"` |
| Push submission | `git push origin main` |
| Set username | `git config --global user.name "username"` |
| Set email | `git config --global user.email "email"` |