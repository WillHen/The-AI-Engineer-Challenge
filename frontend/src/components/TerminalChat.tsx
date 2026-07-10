"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Role = "system" | "user" | "assistant" | "error";

type ChatLine = {
  id: string;
  role: Role;
  text: string;
  /** True while tokens are still arriving for this assistant line */
  streaming?: boolean;
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

/** How fast the oracle text paints on screen (network can be faster). */
const TYPEWRITER_MS = 32;
const CHARS_PER_TICK = 1;

/**
 * Neo-style terminal chat. Streams tokens from POST /api/chat as they arrive.
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

  // Keep the latest streamed characters in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, loading]);

  const appendLine = (role: Role, text: string, streaming = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLines((prev) => [...prev, { id, role, text, streaming }]);
    return id;
  };

  const patchLine = (id: string, patch: Partial<ChatLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading || booting) return;

    setInput("");
    appendLine("user", message);
    setLoading(true);

    // Open an empty oracle line immediately so tokens paint as they land
    const replyId = appendLine("assistant", "", true);

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

      if (!response.body) {
        throw new Error("No response stream from the oracle");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Network fills the buffer ASAP; the typewriter drains it slowly for the UI
      let buffer = "";
      let visible = "";
      let networkDone = false;
      let revealTimer: number | null = null;
      let resolveReveal: (() => void) | null = null;

      const drip = () => {
        if (visible.length < buffer.length) {
          visible = buffer.slice(0, visible.length + CHARS_PER_TICK);
          patchLine(replyId, { text: visible, streaming: true });
          revealTimer = window.setTimeout(drip, TYPEWRITER_MS);
          return;
        }

        revealTimer = null;

        // Only finish once the network is done AND every char has been painted
        if (networkDone) {
          const finalText = buffer.trim() || "[empty reply from the oracle]";
          patchLine(replyId, { text: finalText, streaming: false });
          resolveReveal?.();
          resolveReveal = null;
        }
      };

      const scheduleReveal = () => {
        if (revealTimer === null) {
          revealTimer = window.setTimeout(drip, TYPEWRITER_MS);
        }
      };

      const revealDone = new Promise<void>((resolve) => {
        resolveReveal = resolve;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        scheduleReveal();
      }

      buffer += decoder.decode();
      networkDone = true;
      scheduleReveal();
      await revealDone;
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unknown connection failure";
      // Replace the empty streaming line with a system error
      patchLine(replyId, {
        role: "error",
        text: `CONNECTION SEVERED — ${reason}. Is the backend running at ${API_URL}?`,
        streaming: false,
      });
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
            } ${line.streaming ? "blink-cursor" : ""}`}
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
