# Git 繳交教學

歡迎使用 DsaJudge+！本教學將帶領你一步一步學會如何使用 Git 繳交程式作業。

> 💡 **小提示**：使用 Git 是資訊人必備的技能，學會之後不僅能在這裡繳交作業，未來在職場或開源社群都會用到！

---

## 目錄

1. [什麼是 Git？](#什麼是-git)
2. [Git 安裝](#git-安裝)
3. [產生 SSH Key](#產生-ssh-key)
4. [設定 SSH Key 到 Judge](#設定-ssh-key-到-judge)
5. [Clone 你的專屬 Repository](#clone-你的專屬-repository)
6. [繳交程式碼](#繳交程式碼)
7. [查看繳交結果](#查看繳交結果)
8. [常見問題](#常見問題)
9. [注意事項](#注意事項)

---

## 什麼是 Git？

Git 是一個**版本控制系統**，可以幫助你追蹤程式碼的修改歷史。在這個 Judge 中，我們使用 Git 作為程式碼的繳交方式，取代傳統的上傳按鈕。

**簡單來說**：你只需要學會幾個簡單的 Git 指令，就能輕鬆繳交作業！

---

## Git 安裝

### Windows

1. 前往 [Git 官方下載頁面](https://git-scm.com/download/win)
2. 下載並執行安裝程式
3. 安裝過程中保持預設選項即可
4. 安裝完成後，使用 **Git Bash** 作為操作介面（推薦）

### macOS

開啟 Terminal，輸入以下指令：
```bash
xcode-select --install
```
或者使用 Homebrew：
```bash
brew install git
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install git
```

### 驗證安裝

安裝完成後，開啟終端機（Windows 請使用 Git Bash），輸入：
```bash
git --version
```
如果看到版本號（例如 `git version 2.40.0`），代表安裝成功！

---

## 產生 SSH Key

DsaJudge+ 的 Git 上傳方式**只支援 SSH Public Key 登入**。

### 步驟一：檢查是否已有 SSH Key

```bash
ls ~/.ssh
```

如果看到類似 `id_rsa` 和 `id_rsa.pub`（或 `id_ed25519` 和 `id_ed25519.pub`）這樣成對的檔案，代表你已經有 SSH Key，可以跳過產生步驟。

### 步驟二：產生新的 SSH Key

如果沒有 SSH Key，請執行以下指令：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

> 💡 如果你的系統不支援 Ed25519，可以使用：
> ```bash
> ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
> ```

執行後會詢問幾個問題：
- **Enter file in which to save the key**：直接按 Enter 使用預設路徑
- **Enter passphrase**：可以設定密碼保護（選填，直接 Enter 跳過也可以）
- **Enter same passphrase again**：再輸入一次密碼（或直接 Enter）

### 步驟三：複製你的 Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

或者（如果你使用 RSA）：
```bash
cat ~/.ssh/id_rsa.pub
```

你會看到類似這樣的內容：
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG... your_email@example.com
```
或
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... your_email@example.com
```

**請完整複製這一整行**（從 `ssh-` 開始到最後）。

---

## 設定 SSH Key 到 Judge

1. 登入 DsaJudge+ 網站
2. 點擊右上角的 **Settings**（或個人設定）
3. 找到 **SSH Public Key** 欄位
4. 將剛才複製的 SSH Public Key 貼上
5. 在下方的 **Current Password** 輸入你目前登入用的密碼
6. 點擊 **Save Changes** 送出


> ✅ 如果右下角出現**綠色**提示，代表設定成功！
> 
> ❌ 如果出現**紅色**提示，請檢查：
> - SSH Key 格式是否正確
> - 密碼是否輸入正確

---

## Clone 你的專屬 Repository

每個使用者在 DsaJudge+ 上都有一個專屬的 Git repository。

### 步驟一：找到你的 Git Repository URL

在 **Settings** 頁面或個人資料頁面，你可以看到你的 **Git Repository** URL，格式類似：

```
ssh://git@dsa.csie.ntu.edu.tw:22/b14902000/b14902000-dsa.git
```

### 步驟二：Clone Repository

找一個你喜歡的資料夾位置，執行：

```bash
git clone <你的 Git Repository URL>
```

例如：
```bash
git clone ssh://git@dsa.csie.ntu.edu.tw:22/b14902000/b14902000-dsa.git
```

如果一切正常，你會看到一個以你的使用者名稱命名的資料夾被建立。

### 首次連接確認

第一次連接時，系統可能會詢問是否信任此伺服器：
```
The authenticity of host 'dsajudge' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
請輸入 `yes` 並按 Enter。

---

## 繳交程式碼

### 檔案命名規則

**非常重要！** 你的程式碼檔案必須遵循以下命名規則：

| 規則 | 說明 | 範例 |
|------|------|------|
| 檔名 | `<題目序號>.c` | `0.c`、`5.c` |
| 語言 | 目前只支援 **C 語言** | 只接受 `.c` 副檔名 |
| 位置 | 放在 repository 根目錄 | `0.c` 或 `5.c` |

### 繳交流程

1. **進入你的 repository 資料夾**
   ```bash
   cd <你的使用者名稱>-dsa
   ```

2. **撰寫或複製你的程式碼**
   
   建立一個以題目序號命名的 `.c` 檔案，例如 `0.c`。

3. **加入 Git 追蹤**
   ```bash
   git add 0.c
   ```
   
   或者一次加入所有變更：
   ```bash
   git add .
   ```

4. **建立 Commit**
   ```bash
   git commit -m "完成題目 0"
   ```
   
   > 💡 引號內的訊息可以自己修改，用來描述這次的變更。

5. **Push 到 Judge**
   ```bash
   git push origin main
   ```

### 首次 Commit 設定

如果是第一次使用 Git commit，系統可能會要求你設定使用者資訊：
```bash
git config --global user.email "your_email@example.com"
git config --global user.name "Your Name"
```

---

## 🎯 練習：Problem 0（A+B 問題）

這是一個讓你練習 Git 繳交流程的測試題目。完成這個題目後，你就學會如何使用 Git 繳交作業了！

### 題目說明

**Problem 0** 是一個簡單的加法問題：
- **輸入**：兩個整數 a 和 b（以空格分隔）
- **輸出**：a + b 的結果
- **限制**：1 ≤ a, b ≤ 100

### 參考解答

在你的 repository 中建立一個名為 `0.c` 的檔案，內容如下：

```c
#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a + b);
    return 0;
}
```

### 完整繳交步驟

```bash
# 1. 進入你的 repository 資料夾
cd <你的使用者名稱>-dsa

# 2. 建立 0.c 檔案（使用你喜歡的編輯器）
# 例如使用 nano：
nano 0.c
# 貼上上面的程式碼，儲存並離開

# 3. 查看目前狀態（可選）
git status

# 4. 將 0.c 加入 Git 追蹤
git add 0.c

# 5. 建立 commit
git commit -m "Solve problem 0 - A+B"

# 6. Push 到 Judge
git push origin main
```

### 預期結果

如果一切順利，你應該會：
1. 在 `git push` 的輸出中看到 Submission ID
2. 在 DsaJudge+ 網站的 Submissions 頁面看到你的繳交紀錄
3. 看到這題的結果是 **AC（Accepted）**🎉

> 💡 **恭喜你！** 如果成功拿到 AC，代表你已經學會使用 Git 繳交程式了！

---

## 查看繳交結果

Push 完成後，你可以：

1. **在 Judge 網站查看**
   
   登入 DsaJudge+ 後，前往 **Submissions** 頁面，你應該能看到剛才上傳的程式。

   ![Submission List](https://i.imgur.com/3MmgoBH.png)

2. **查看評測結果**

   點擊 Submission 可以查看詳細的評測結果。

   ![Submission Detail](https://i.imgur.com/OI2xTxY.png)

---

## 常見問題

### Q1: Permission denied (publickey)

**原因**：SSH Key 沒有正確設定。

**解決方式**：
1. 確認已將 Public Key 加入 DsaJudge+ Settings
2. 確認本機有對應的 Private Key
3. 執行 `ssh-add ~/.ssh/id_ed25519`（或 `id_rsa`）將 Key 加入 SSH Agent

### Q2: Submission 沒有出現在 Judge 上

**可能原因**：
1. 檔案名稱不符合規則（必須是 `<題號>.c`）
2. Push 到了錯誤的分支（必須是 `main` 分支）
3. 檔案沒有被修改（Git 只會上傳有變更的檔案）

**解決方式**：
1. 確認檔名是正確的題目序號，例如 `1001.c`
2. 確認執行的是 `git push origin main`
3. 對檔案做一些修改後重新 push

### Q3: Git 說 "everything up-to-date" 但沒有繳交成功

**原因**：你沒有做任何新的修改，或修改沒有被 commit。

**解決方式**：
```bash
git status          # 查看目前狀態
git add .           # 加入所有變更
git commit -m "訊息" # 建立 commit
git push origin main
```

### Q4: 出現 "Please tell me who you are" 錯誤

**解決方式**：
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "your-name"
```

### Q5: Repository URL 找不到

**解決方式**：
前往 DsaJudge+ 的 **Settings** 頁面查看你的 Git Repository URL。

---

## 注意事項

> ⚠️ 請仔細閱讀以下注意事項，避免繳交失敗！

1. **Submission 確認**
   - 如果你沒有在 Judge 的 Submissions 頁面看到記錄，就代表**沒有成功繳交**
   - 請務必在 push 後到網站確認

2. **繳交次數限制**
   - 每人每天每題最多只能上傳 **5 次**
   - 次數**無法累積**，請珍惜使用

3. **分支限制**
   - 只有 push 到 **main** 分支的修改會被視為繳交
   - 其他分支（如 `submit`、`master`）的修改**不會**被傳到 Judge

4. **檔案格式**
   - 只會處理符合 `<題號>.c` 格式的檔案
   - 其他檔案（如 README、筆記）會被忽略，但仍會保存在 repository 中

5. **只上傳有修改的檔案**
   - Git 只會上傳你在這次 push 中**有修改**的檔案
   - 如果想重新繳交同一份程式，請對檔案做一些修改（加空白或換行也可以）

6. **不要 Rebase 已 Push 的 Commit**
   - 對於已經傳上 main 分支的 commit，**不要**做 rebase 或其他會改變 commit 樹狀結構的操作
   - 否則可能會造成後續 push 失敗

7. **Repository 容量限制**
   - 請不要把大型檔案或過多垃圾 commit 推上來
   - 超過使用上限可能導致無法繼續 push
---

## 快速指令參考

| 目的 | 指令 |
|------|------|
| 安裝 Git | 參考[安裝章節](#git-安裝) |
| 產生 SSH Key | `ssh-keygen -t ed25519 -C "email"` |
| 查看 SSH Public Key | `cat ~/.ssh/id_ed25519.pub` |
| Clone Repository | `git clone <URL>` |
| 查看狀態 | `git status` |
| 加入追蹤 | `git add <檔案>` 或 `git add .` |
| 建立 Commit | `git commit -m "commit message"` |
| Push 繳交 | `git push origin main` |
| 設定使用者 | `git config --global user.name "username"` |
| 設定 Email | `git config --global user.email "email"` |
