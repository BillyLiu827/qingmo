"use client";

import { useEffect, useRef } from "react";

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  streaming?: boolean;
  onStop?: () => void;
}

/** 底部輸入列：自動增高、Enter 送出、Shift+Enter 換行 */
export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  streaming,
  onStop,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (streaming) {
          onStop?.();
          return;
        }
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="chat-input">
        輸入訊息
      </label>
      <textarea
        id="chat-input"
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled && !streaming}
        placeholder="寫下你想談的事…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (streaming) onStop?.();
            else onSubmit();
          }
        }}
      />
      <button
        type="submit"
        className={`send-btn ${streaming ? "is-stop" : ""}`}
        disabled={!streaming && (!value.trim() || disabled)}
        aria-label={streaming ? "停止產生" : "送出訊息"}
      >
        {streaming ? "停止" : "送出"}
      </button>
    </form>
  );
}
