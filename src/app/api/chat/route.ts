import OpenAI from "openai";
import { nextMockReply, streamMockText } from "@/lib/mock";
import type { ChatRequestBody } from "@/lib/types";

export const runtime = "nodejs";

/** 單則訊息長度上限，避免資源耗盡 */
const MAX_MESSAGE_CHARS = 4000;
/** 對話上下文最多保留則數 */
const MAX_CONTEXT_MESSAGES = 40;
/** 簡單的記憶體速率限制（單程序） */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const hitMap = new Map<string, number[]>();

function clientKey(req: Request): string {
  // 以 IP（或 fallback）做粗略節流；私有發布仍建議搭配 Cursor 登入
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function allowRequest(key: string): boolean {
  const now = Date.now();
  const prev = (hitMap.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_MAX) {
    hitMap.set(key, prev);
    return false;
  }
  prev.push(now);
  hitMap.set(key, prev);
  return true;
}

/** 將模擬回覆編碼成與 OpenAI 相同的 SSE 文字串流 */
function mockSseStream(userText: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const full = nextMockReply(userText);
  return new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };
      try {
        await streamMockText(full, send);
      } catch {
        // 中止時安靜結束
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  if (!allowRequest(clientKey(req))) {
    return Response.json(
      { error: "請求過於頻繁，請稍候再試。" },
      { status: 429 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "無法解析請求內容。" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: "請提供至少一則訊息。" }, { status: 400 });
  }

  // 正規化並截斷，避免過長輸入
  const normalized = messages
    .filter((m) => m && typeof m.content === "string" && m.role)
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
    }));

  const lastUser = [...normalized].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return Response.json({ error: "請輸入訊息。" }, { status: 400 });
  }

  // 預設走本機 mock；僅在明確啟用且有金鑰時才呼叫 OpenAI
  const useOpenAI =
    process.env.QINGMO_USE_OPENAI === "1" ||
    process.env.QINGMO_USE_OPENAI === "true";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!useOpenAI || !apiKey) {
    return new Response(mockSseStream(lastUser.content), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Qingmo-Mode": "mock",
      },
    });
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "你是「青墨」，一位溫暖、清晰的繁體中文助理。回覆簡潔有條理，必要時使用條列。",
        },
        ...normalized,
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of stream) {
            const delta = part.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "串流過程發生錯誤。";
          controller.enqueue(encoder.encode(`\n\n（錯誤：${msg}）`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Qingmo-Mode": "openai",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "呼叫 OpenAI 失敗。";
    // 不把金鑰或詳細內部資訊回給客戶端
    return Response.json(
      { error: `無法取得回覆：${message.slice(0, 120)}` },
      { status: 502 }
    );
  }
}
