"use client";

import type { Conversation } from "@/lib/types";

interface SidebarProps {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClose: () => void;
  mockMode: boolean;
}

/** 側邊欄：對話歷史、新建／切換／刪除／重新命名 */
export function Sidebar({
  open,
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onClose,
  mockMode,
}: SidebarProps) {
  return (
    <>
      {/* 行動版遮罩 */}
      <button
        type="button"
        aria-label="關閉側邊欄"
        className={`sidebar-scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="對話歷史">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden>
            <span className="brand-ink" />
          </div>
          <div>
            <p className="brand-name">青墨</p>
            <p className="brand-tag">安靜地談下去</p>
          </div>
        </div>

        <button type="button" className="btn-new" onClick={onNew}>
          <span aria-hidden>+</span>
          新對話
        </button>

        {mockMode && (
          <p className="mode-hint" role="status">
            本機模擬模式（預設）：無需 API 金鑰即可聊天。
          </p>
        )}

        <nav className="conv-list" aria-label="歷史對話">
          {conversations.length === 0 && (
            <p className="empty-hint">尚無對話，開始第一則吧。</p>
          )}
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`conv-item ${active ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="conv-main"
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                >
                  <span className="conv-title">{c.title}</span>
                  <span className="conv-time">
                    {formatRelative(c.updatedAt)}
                  </span>
                </button>
                <div className="conv-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="重新命名"
                    title="重新命名"
                    onClick={() => {
                      const next = window.prompt("重新命名對話", c.title);
                      if (next && next.trim()) onRename(c.id, next.trim());
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="刪除對話"
                    title="刪除"
                    onClick={() => {
                      if (window.confirm(`確定刪除「${c.title}」？`)) {
                        onDelete(c.id);
                      }
                    }}
                  >
                    ⌫
                  </button>
                </div>
              </div>
            );
          })}
        </nav>

        <footer className="sidebar-foot">
          <p>對話僅存於此裝置瀏覽器</p>
        </footer>
      </aside>
    </>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(ts).toLocaleDateString("zh-TW");
}
