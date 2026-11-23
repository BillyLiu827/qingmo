"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

interface MessageListProps {
  messages: ChatMessage[];
  streamingId: string | null;
}

/** 訊息列表：使用者／助理氣泡，串流中顯示游標 */
export function MessageList({ messages, streamingId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingId]);

  if (messages.length === 0) {
    return (
      <div className="empty-stage">
        <p className="empty-kicker">青墨</p>
        <h1 className="empty-title">從一句話開始</h1>
        <p className="empty-sub">
          問問題、整理思緒，或只是找人聊聊。回覆會以串流方式緩緩展開。
        </p>
      </div>
    );
  }

  return (
    <div className="messages" role="log" aria-live="polite">
      {messages.map((m) => {
        if (m.role === "system") return null;
        const isUser = m.role === "user";
        const isStreaming = m.id === streamingId;
        return (
          <article
            key={m.id}
            className={`bubble-row ${isUser ? "is-user" : "is-assistant"}`}
          >
            {!isUser && <span className="role-label">青墨</span>}
            <div className={`bubble ${isUser ? "user" : "assistant"}`}>
              <p className="bubble-text">
                {m.content}
                {isStreaming && <span className="stream-caret" aria-hidden />}
              </p>
            </div>
          </article>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
