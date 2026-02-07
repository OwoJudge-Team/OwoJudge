# 如何使用設計問題

使用這個 Judge 修改過的 TPS 設計問題包含五個步驟：

1. 問題描述
2. Generator
3. Validator
4. Checker
5. Metadata

接下來我將逐一介紹這些步驟。包括一些你可能會覺得有用的工具。

## 1. 問題敘述

在描述中，你可以遵照我們在 DSA2025 問題中使用的推薦方式。被 `<` 和 `>` 包圍的欄位是可選的。我們使用英文作為主要的出題語言。

```
# Title
## <Modification Notes>
## Problem Description
## <Illustration>
## Input
## Output
## Constraint
## Subtask
### Subtask 1 (10pt)
### Subtask 2 (20pt)
## Sample Testcases
### Sample Input 1
### Sample Output 1
```

根據政策，我們可能會稍微修改描述的結構。但總體而言，我們應該遵循上述的格式。

## 2. Generator

Generator 是一個用來產生題目測試資料的程式。一個常見而重要，卻常被忽略的 generator 特性是**確定性 (determinism)**。每次使用相同的種子執行 `tps gen` 指令時，它應該產生相同的測試資料。

為了做到這一點，你可以使用 `gen` 目錄中的 `jngen.h`。以下是如何使用它的一個範例。

```cpp
#include "jngen.h"

int main(int argc, char* argv[]) {
  // 註冊 generator。整個 argv 將構成隨機種子。
  registerGen(argc, argv, 1);
  // 從命令行參數解析重要參數
  int n = atoi(argv[1]), m = atoi(argv[2]), q = atoi(argv[3]);
  // 使用 rnd.next 產生隨機數 [2, 15]。
  rnd.next(2, 15);
}
```

接下來，你應該編寫 `data` 檔案。此檔案描述了 TPS 系統如何使用你的 generator 來產生測試資料。有一些關鍵字：

- `@testset`: 一個 testset 是一組測試案例 (testcases)。
- `@include`: 包含一個 testset 或一個測試案例。
- `@subtask`: 一個 subtask 是一組 testsets。這是我們計算分數的方式。
- `manual`: 這個 testset 不是由 generator 產生的。你應該自己提供輸入檔案。通常，我們將輸入放在 `gen/manual` 目錄中。

**Subtask 的名稱應該以 "subtask" 開頭，而 testset 的名稱則不應如此**。這是我們的 judge 系統區分它們的方式。

```
@testset sample1
manual 0-01.in
manual 0-02.in

@testset sample2
manual 0-03.in

@subtask sample
@include sample1
@include sample2
```

要使用你編寫的 generator，你應該提供 generator 的名稱以及命令行參數。最後一個參數是隨機填充 (random padding)，它使得同一個生成器提供不同的測試，即使關鍵參數相同。

```
@testset 5
gen_sub5 5 300000 100000 bon97dus2
```

如果你想產生一個圖 (graph)，你可以考慮使用 `bicycle-parking-tree/gen` 目錄中的 `GraphGen.h`，或者自己寫一個。

## 3. Validator

Validator 是一個用來檢查 generator 產生的測試輸入是否合法的程式。一般來說，你應該根據問題的描述來編寫 validators，而不是根據 generator。

你應該從 `inf` 物件讀取輸入。

```cpp
#include "testlib.h"

constexpr int kMaxN = 1e5;

int main(int argc, char* argv[]) {
  registerValidation(argc, argv);
  // 讀取一個整數 n，限制為 1 <= n <= kMaxN。如果輸入無效，validator 會通知你 "n" 無效。
  int n = inf.readInt(1, kMaxN, "n");
  // 讀取行尾的 '\n'。
  inf.readEoln();
  for (int i = 0; i < n; ++i) {
    // 這裡我們傳遞 "u[" + to_string(i) + "]" 作為名稱。如果輸入 u[5] 無效，validator
    // 會通知你 "u[5]" 無效。
    int u = inf.readInt(0, n, "u[" + to_string(i) + "]");
    // 讀取整數後的一個空格。
    inf.readSpace();
  }
  inf.readEoln();
  // 讀取檔案結尾。
  inf.readEof();
}
```

當然，你也可以讀取其他類型的輸入，你可以使用 language server 來查找可用的方法（輸入 `inf.read`）。注意你應該讀取輸入檔案中的所有內容。如果你忘記讀取空格或 `'\n'`，validator 也會回報錯誤。

有時，你可能想要檢查輸入的一些屬性。例如，如果輸入是一棵樹。那麼你可以使用 `ensure(is_tree(t))` 巨集，其中 `is_tree` 函數是一個回傳布林值的檢查器。你應該自己編寫 `is_tree` 函數。

要提早結束程式，你也可以使用 `quitf` 函數。以下是一個範例：

```
inf.quitf(_fail, "Unknown operation %d", op);
```

## 4. Checker

通常，我們可以保留預設的 checker。但如果你希望自己寫一個。你可以參考 `bicycle-parking-tree/checker` 目錄中的 `checker.cpp`。

如果你的問題允許多個正確答案，你可能必須從 `inf` 和 `ouf` 讀取輸入和使用者輸出。否則，你可以只從 `ans` 和 `ouf` 讀取答案和使用者輸出。詳細邏輯由你決定。

與 validator 相同，你可以使用 `inf|ouf|ans.read` 來查找可用的讀取方法。

```cpp
string j;
// 從使用者輸出讀取一個單字 (直到遇到空格|tab|換行) 並將其存儲在 j 中。
ans.readWordTo(j);
```

你可以使用 `quitf` 來回報 checker 的結果。

```cpp
// WA
quitf(_wa, "%d%s words differ - expected: '%s', found: '%s'", n, englishEnding(n).c_str(),
                  compress(j).c_str(), compress(p).c_str());
// AC
quitf(_ok, "%d tokens", n);
```

如果你希望對單一測資給部分分數，請聯繫我們。

## 5. Metadata

有兩個 metadata 檔案：`problem.json` 和 `judgemeta.json`。

### problem.json

`name` 和 `code` 欄位不應包含任何空格。`time_limit` 單位為秒，`memory_limit` 單位為 megabytes。在 DSA 課程期間，`score_policy` 為 `sum`，這是目前唯一的方法。這意味著 subtask 加總而不是每個測試案例的直接加總。

```json
{
    "name": "BicycleParkingTree",
    "code": "bicycle-parking-tree",
    "title": "Bicycle Parking Tree",
    "type": "Batch",
    "time_limit": 1.0,
    "memory_limit": 2048,
    "score_policy": "sum",
    "has_grader": false,
    "java_enabled": false,
    "python_enabled": false
}
```

### judgemeta.json

`full_score` 是問題的總分。`tags` 和 `problemRelatedTags` 用於問題推薦，在 DSA 課程期間你可以忽略它們。`allowed_languages` 是問題允許的語言列表。在 DSA 中，通常我們只允許 `C`。`process_limit` 是使用者解決方案可以建立的最大進程數。在 DSA 中，這通常是 1。`dailyQuota` 是使用者一天可以提交的最大提交次數。

```json
{
  "full_score": 100,
  "tags": [
      "basic"
  ],
  "problemRelatedTags": [
      "math"
  ],
  "allowed_languages": [
      "gcc c17",
      "gcc c23"
  ],
  "process_limit": 1,
  "dailyQuota": 5
}
```