"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Role = "system" | "user" | "assistant" | "error";

type ChatLine = {
  id: string;
  role: Role;
  text: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const BOOT_LINES = [
  "WAKE UP, NEO...",
  "THE MATRIX HAS YOU...",
  "FOLLOW THE WHITE RABBIT.",
  "",
  "ZION MAINFRAME // MENTAL COACH LINK ESTABLISHED",
  "TYPE YOUR MESSAGE AND PRESS ENTER.",
  "",
];

/**
 * Neo-style terminal chat. Talks to the FastAPI backend at POST /api/chat.
 */
export default function TerminalChat() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot sequence — drip the classic Matrix lines before chat unlocks
  useEffect(() => {
    let cancelled = false;
    let index = 0;

    const tick = () => {
      if (cancelled) return;
      if (index >= BOOT_LINES.length) {
        setBooting(false);
        inputRef.current?.focus();
        return;
      }

      const text = BOOT_LINES[index];
      setLines((prev) => [
        ...prev,
        { id: `boot-${index}`, role: "system", text },
      ]);
      index += 1;
      window.setTimeout(tick, text === "" ? 120 : 280);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the latest line in view as messages stream in
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, loading]);

  const appendLine = (role: Role, text: string) => {
    setLines((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text },
    ]);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading || booting) return;

    setInput("");
    appendLine("user", message);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as { reply?: string };
      appendLine("assistant", data.reply?.trim() || "[empty reply from the oracle]");
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unknown connection failure";
      appendLine(
        "error",
        `CONNECTION SEVERED — ${reason}. Is the backend running at ${API_URL}?`
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="relative z-10 flex h-dvh w-full flex-col px-3 py-4 sm:px-8 sm:py-8"
      onClick={() => inputRef.current?.focus()}
    >
      <header className="terminal-glow mb-4 shrink-0 border-b border-matrix-muted/60 pb-3">
        <p className="text-xs tracking-[0.35em] text-matrix-green-dim sm:text-sm">
          OPERATOR TERMINAL — NEO
        </p>
        <h1 className="mt-1 text-2xl tracking-widest text-matrix-green-bright sm:text-4xl">
          THE MATRIX
        </h1>
        <p className="mt-1 text-sm text-matrix-green-dim">
          chat with the oracle // supportive mental coach uplink
        </p>
      </header>

      <div
        ref={scrollRef}
        className="terminal-scroll terminal-glow flex-1 overflow-y-auto pr-1 text-sm leading-relaxed sm:text-base"
        aria-live="polite"
      >
        {lines.map((line, i) => (
          <p
            key={line.id}
            className={`boot-line whitespace-pre-wrap break-words ${
              line.role === "error"
                ? "text-matrix-error"
                : line.role === "user"
                  ? "text-matrix-green-bright"
                  : line.role === "assistant"
                    ? "text-matrix-green"
                    : "text-matrix-green-dim"
            }`}
            style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}
          >
            {line.role === "user" && (
              <span className="text-matrix-green-dim">neo@matrix:~$ </span>
            )}
            {line.role === "assistant" && (
              <span className="text-matrix-green-dim">ORACLE&gt; </span>
            )}
            {line.role === "error" && (
              <span className="text-matrix-error">SYSTEM&gt; </span>
            )}
            {line.text}
          </p>
        ))}

        {loading && (
          <p className="blink-cursor text-matrix-green-dim">ORACLE&gt; decoding signal</p>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="terminal-glow mt-4 flex shrink-0 items-center gap-2 border-t border-matrix-muted/60 pt-3"
      >
        <label htmlFor="matrix-input" className="sr-only">
          Message the oracle
        </label>
        <span className="shrink-0 text-matrix-green-dim" aria-hidden>
          neo@matrix:~$
        </span>
        <input
          id="matrix-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={booting || loading}
          autoComplete="off"
          spellCheck={false}
          placeholder={booting ? "booting..." : "enter the matrix..."}
          className="w-full bg-transparent text-matrix-green-bright outline-none placeholder:text-matrix-muted disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={booting || loading || !input.trim()}
          className="shrink-0 border border-matrix-green/50 px-3 py-1 text-xs tracking-widest text-matrix-green transition hover:bg-matrix-green/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
