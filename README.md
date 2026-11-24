# 青墨 — AI 對話網站

繁體中文 AI 聊天介面：側邊欄對話歷史、**預設本機模擬串流**，可選接上 OpenAI。

## 技術棧

- **Next.js**（App Router）+ TypeScript + Tailwind CSS
- **預設**：伺服器端本機 mock 串流（不需 API 金鑰）
- **可選**：**OpenAI** Chat Completions（僅在 `/api/chat` 伺服器端呼叫）
- 對話歷史：瀏覽器 `localStorage`（無帳號、無跨裝置同步）

## 本機執行

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。開箱即用本機模擬回覆。

### 環境變數

| 變數 | 說明 |
|------|------|
| （無） | 預設 mock，可直接聊天 |
| `QINGMO_USE_OPENAI` | 設為 `true` 或 `1` 才啟用 OpenAI |
| `OPENAI_API_KEY` | OpenAI API 金鑰（**勿**放前端、勿提交；需搭配上項） |
| `OPENAI_MODEL` | 可選，預設 `gpt-4o-mini` |

未啟用 OpenAI 時一律走本機模擬串流；介面與側邊欄歷史皆可完整操作。

## 功能

- 新對話／切換歷史／刪除／重新命名
- 串流回覆、停止產生
- 繁體中文 UI 與程式註解
