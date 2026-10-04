# sidecard

[English](README.md) · [简体中文](README_zhs.md) · **繁體中文**

一個 Claude Code **模組（mod）**：把等待智慧代理工作的時間變成一張張小巧、用完即棄的學習卡片。卡片以帶邊框的形式顯示在載入動畫（spinner）下方，一旦 Claude 需要你介入或已經完成，卡片會立刻消失。

```
⠋ Thinking…
╭─ sidecard · french ───────────────╮
│ pourtant                          │
│ however / yet                     │
│                                   │
│ Il était fatigué, pourtant il a … │
│ ┄ answer in 4s ▰▰▱▱▱▱             │
╰───────────────────────────────────╯
```

卡片分兩種：**唯讀**，或**延遲揭曉答案**（先倒數，再顯示答案）。

## 環境需求

- Claude Code **v2.1.287 或更新版本**（支援模組）。用 `claude --version` 查看。
- 卡片只會顯示在終端機和桌面應用程式的 Code 分頁中（VS Code 聊天面板和 `claude -p` 不會顯示）。

## 安裝

```text
/plugin marketplace add phunterlau/sidecard
/plugin install sidecard@sidecard
/reload-plugins
```

確認已載入：`/plugin` 會顯示 `1 mod active · sidecard`。模組是以你的權限執行的程式碼，請先閱讀 `hooks/register.ts`。`claude plugin validate .` 會列出它監聽的所有事件和呼叫的所有介面。

## 使用

| 指令 | 作用 |
| --- | --- |
| `/sidecard` 或 `/sidecard menu` | 分類選單：`✓`/`☐` 開關（快速鍵 1–9），以及每個分類的參數下拉選單 |
| `/sidecard now` | 立即顯示一張卡片（回合進行中顯示在 spinner 下方，閒置時顯示在輸入框上方） |
| `/sidecard review [n]` | 列出最近顯示的 `n` 張卡片（預設 10），最新的在前，附帶答案和你大概還記得多少 |
| `/sidecard on` / `off` | 啟用或關閉所有卡片 |
| `/sidecard <category>` | 開關某個分類，例如 `/sidecard french` |
| `/sidecard <category> key=value` | 設定某個參數，例如 `/sidecard french level=B1` |
| `/sidecard generate on\|off` | 開啟或關閉用 Claude Code 的 Haiku 產生新卡片 |
| `/sidecard reload` | 重新掃描分類檔案 |
| `/sidecard status` | 查看目前設定 |

預設行為：回合開始 8 秒後出現卡片，停留 20 秒（有延遲答案的卡片更久），兩張卡片之間至少間隔 45 秒。回合結束，或 Claude 要求權限或輸入時，卡片消失。設定會跨工作階段保存。

### 回顧與遺忘曲線

每張顯示過的卡片都會連同時間一起跨工作階段保存。`/sidecard review` 列出最近的幾張，沒看完的卡片也不會遺失：

```text
2. french · 2d ago · seen 2× · memory 50%
   manquer à
   to be missed by
```

標記為**高價值**的卡片（內建的易錯點和回憶題；產生的卡片中有少數由 Haiku 評定）可能再次出現。卡片的估計記憶度為 `exp(-距上次顯示的時間 / 穩定度)`，穩定度起始為一天，每次重新顯示後增長：在快要忘記時重複增長最多，剛看過就重複幾乎不增長。高價值卡片的記憶度降到 50% 以下後，出現新卡片的時機有 30% 的機率改為展示這張。低價值卡片不會再出現，也不需要你作答：只依據時間。

### 卡片從哪裡來

- **產生**：模組在背景呼叫 Claude Code 內建的 `haiku`（`$.model.complete`，低推理強度），每批產生 10 張卡片，快取並避免重複。不需要另外的 API 金鑰，但會**消耗你的方案或 API 額度**。可用 `/sidecard generate off` 關閉。
- **內建**：48 張離線卡片，涵蓋 `french`、`python-advanced`、`ml-general` 和 `llm`，在第一批產生的卡片送達前或關閉產生時使用。

## 分類與開發

卡片來自**分類（category）**，每個分類就是一個 Markdown 檔案。內建分類位於 `categories/`：`french`、`python-advanced`、`ml-general`、`llm`。

只要檔案出現在下列任一目錄（包含一層子目錄），新分類就會自動出現，所以你可以直接把分類包 `git clone` 到那裡：

- 本外掛的 `categories/`
- `~/.claude/sidecard/categories/`

檔案會在工作階段開始、開啟選單以及執行 `/sidecard reload` 時被讀取。

```markdown
---
name: french                 # 必填：小寫字母、數字、- 或 _
title: French                # 選單中的名稱
color: cyan                  # cyan|green|magenta|yellow|blue|red|white
mode: delayed                # read | delayed
revealAfter: 6               # 答案出現前的秒數（僅 delayed）
model: haiku
input.level: A2 | A1, A2, B1, B2, C1, C2   # <預設值> | <選項>
---
Teach practical French for a learner at CEFR level {{level}}.
Each card is a phrase with an example, or a recall prompt with the answer in "answer".
```

- `input.<key>: <預設值> | <選項>` 會在選單裡新增一個下拉選單。每個參數都必須有預設值。
- 內文中的 `{{key}}` 會替換為所選的值（或預設值）。
- 模組會要求模型回傳由 `{"body", "answer"?}` 組成的 JSON 陣列；你只需要寫教學指令。
- 沒有內建離線卡片的分類，需要開啟產生才能使用。

### 參與貢獻

歡迎貢獻，尤其是新的分類和更好的卡片：

- **新增分類**：複製 `categories/` 裡的一個檔案，修改 frontmatter 和教學提示詞，然後提交 Pull Request。適合的方向有其他語言、SQL、Shell、系統設計、演算法、數學，或你自己的專業領域。
- **新增或改進離線卡片**：`hooks/cards.ts` 中的內建卡片會在第一批產生的卡片送達前以及關閉產生時使用。
- **改進模組本身**：卡片排版在 `hooks/draw.ts`，分類解析在 `hooks/frontmatter.ts`，歷史紀錄與遺忘曲線在 `hooks/memory.ts`，掛鉤、指令和選單在 `hooks/register.ts`。

提交 Pull Request 前，請在儲存庫的複製目錄中執行：

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .      # 僅為本次工作階段載入該複製目錄，儲存檔案時自動重新載入掛鉤
```

凡是修改解析器或繪製邏輯，請在 `hooks/*.test.ts` 中補上測試。

## 授權

MIT，見 `LICENSE`。
