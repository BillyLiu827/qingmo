# 青墨 — AI 對話網站

繁體中文 AI 聊天介面：側邊欄對話歷史、伺服器端 OpenAI 串流回覆、本機示範模式。

## 技術棧

- **Next.js**（App Router）+ TypeScript + Tailwind CSS
- **OpenAI** Chat Completions（僅在 `/api/chat` 伺服器端呼叫）
- 對話歷史：瀏覽器 `localStorage`（無帳號、無跨裝置同步）

## 本機執行

```bash
cd chatbot
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

### 環境變數

| 變數 | 說明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 金鑰（**勿**放前端、勿提交） |
| `OPENAI_MODEL` | 可選，預設 `gpt-4o-mini` |

未設定 `OPENAI_API_KEY` 時會進入**示範模式**（友善模擬串流回覆），介面仍可完整操作。

正式發布請在 Cursor 以應用機密綁定 `OPENAI_API_KEY`，不要在聊天中貼上金鑰。

## 功能

- 新對話／切換歷史／刪除／重新命名
- 串流回覆、停止產生
- 繁體中文 UI 與程式註解
