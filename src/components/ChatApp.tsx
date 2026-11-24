"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { MessageList } from "@/components/MessageList";
import { Sidebar } from "@/components/Sidebar";
import {
  createId,
  loadConversations,
  saveConversations,
  titleFromMessage,
} from "@/lib/storage";
import type { ChatMessage, Conversation } from "@/lib/types";

/** 主聊天殼層：側邊欄 + 訊息區 + 輸入列 */
export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 首次掛載：從本機還原對話
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    if (stored[0]) setActiveId(stored[0].id);
    setHydrated(true);
  }, []);

  // 持久化
  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const upsertConversation = useCallback((next: Conversation) => {
    setConversations((prev) => {
      const others = prev.filter((c) => c.id !== next.id);
      return [next, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const handleNew = useCallback(() => {
    abortRef.current?.abort();
    setStreamingId(null);
    setError(null);
    setDraft("");
    setActiveId(null);
    setSidebarOpen(false);
  }, []);

  const handleSelect = useCallback((id: string) => {
    abortRef.current?.abort();
    setStreamingId(null);
    setError(null);
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setDraft("");
      }
    },
    [activeId]
  );

  const handleRename = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      )
    );
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingId(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = draft.trim();
    if (!text || streamingId) return;

    setError(null);
    setDraft("");

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: createId("msg"),
      role: "user",
      content: text,
      createdAt: now,
    };
    const assistantId = createId("msg");
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: now + 1,
    };

    let conv: Conversation;
    if (active) {
      conv = {
        ...active,
        messages: [...active.messages, userMsg, assistantMsg],
        updatedAt: now,
        title:
          active.messages.length === 0
            ? titleFromMessage(text)
            : active.title,
      };
    } else {
      conv = {
        id: createId("conv"),
        title: titleFromMessage(text),
        messages: [userMsg, assistantMsg],
        createdAt: now,
        updatedAt: now,
      };
    }

    setActiveId(conv.id);
    upsertConversation(conv);
    setStreamingId(assistantId);

    const controller = new AbortController();
    abortRef.current = controller;

    const payloadMessages = conv.messages
      .filter((m) => m.id !== assistantId)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          conversationId: conv.id,
        }),
        signal: controller.signal,
      });

      const mode = res.headers.get("X-Qingmo-Mode");
      if (mode) setMockMode(mode === "mock");

      if (!res.ok) {
        let msg = "無法取得回覆，請稍後再試。";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) msg = data.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      if (!res.body) throw new Error("伺服器未回傳串流內容。");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conv.id) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot } : m
              ),
            };
          })
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // 使用者主動停止
      } else {
        const msg =
          err instanceof Error ? err.message : "發生未知錯誤。";
        setError(msg);
        // 若助理氣泡仍空，補上錯誤提示
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conv.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId && !m.content
                  ? { ...m, content: `（${msg}）` }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setStreamingId(null);
      abortRef.current = null;
    }
  }, [active, draft, streamingId, upsertConversation]);

  if (!hydrated) {
    return <div className="boot-shell" aria-busy="true" />;
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden>
        <div className="mist mist-a" />
        <div className="mist mist-b" />
        <div className="grain" />
      </div>

      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onNew={handleNew}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onRename={handleRename}
        onClose={() => setSidebarOpen(false)}
        mockMode={mockMode}
      />

      <main className="chat-main">
        <header className="chat-top">
          <button
            type="button"
            className="menu-btn"
            aria-label="開啟對話歷史"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="top-title">
            <span className="top-brand">青墨</span>
            <span className="top-sep" aria-hidden>
              ·
            </span>
            <span className="top-conv">
              {active?.title ?? "新對話"}
            </span>
          </div>
          <button type="button" className="ghost-new" onClick={handleNew}>
            新對話
          </button>
        </header>

        <section className="chat-stage">
          <MessageList
            messages={active?.messages ?? []}
            streamingId={streamingId}
          />
        </section>

        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        <div className="composer-wrap">
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            streaming={Boolean(streamingId)}
            onStop={handleStop}
            disabled={Boolean(streamingId)}
          />
          <p className="composer-note">
            Enter 送出 · Shift+Enter 換行
            {mockMode ? " · 目前為本機模擬（預設）" : ""}
          </p>
        </div>
      </main>
    </div>
  );
}
