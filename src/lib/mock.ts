/**
 * 預設本機 mock 回覆：不需 OPENAI_API_KEY，讓聊天可直接使用。
 * 之後若要接真實模型，設定 QINGMO_USE_OPENAI=true 與 OPENAI_API_KEY。
 */

const MOCK_REPLIES = [
  "你好！我是「青墨」。目前預設以本機模擬回覆運作，不需 API 金鑰也能完整聊天。\n\n你可以試側邊欄的新建、切換與刪除對話；之後若要接 OpenAI，再於伺服器啟用即可。",
  "收到。我會用簡短、友善的繁中回覆。\n\n試著再問一個問題，或按「新對話」開另一則討論。",
  "模擬串流進行中……青墨的介面以墨色氛圍為主，對話歷史存在瀏覽器本機，不會同步到其他裝置。",
  "這是本機模擬回覆。之後若啟用 OpenAI，回覆會由伺服器端安全呼叫 API，金鑰不會出現在前端。",
];

let mockIndex = 0;

/** 取得下一則模擬回覆文字 */
export function nextMockReply(userText: string): string {
  const base = MOCK_REPLIES[mockIndex % MOCK_REPLIES.length];
  mockIndex += 1;
  const preview = userText.trim().slice(0, 40);
  return `${base}\n\n——\n你剛才說：「${preview}${userText.trim().length > 40 ? "…" : ""}」`;
}

/**
 * 將文字以可讀的小片段「串流」寫入，模擬 token 輸出節奏。
 */
export async function streamMockText(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const chars = Array.from(text);
  let i = 0;
  while (i < chars.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // 每次送出 1～3 字，節奏略帶變化
    const take = 1 + Math.floor(Math.random() * 3);
    const chunk = chars.slice(i, i + take).join("");
    onChunk(chunk);
    i += take;
    await new Promise((r) => setTimeout(r, 18 + Math.random() * 28));
  }
}
