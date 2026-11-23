import type { Conversation } from "./types";

/** localStorage 鍵名：本機對話歷史（無帳號、無跨裝置同步） */
const STORAGE_KEY = "qingmo-conversations-v1";

/** 安全讀取所有對話；解析失敗時回傳空陣列 */
export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 寫入對話列表到本機 */
export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

/** 產生簡易唯一 ID */
export function createId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 依首則使用者訊息產生對話標題 */
export function titleFromMessage(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "新對話";
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
}
