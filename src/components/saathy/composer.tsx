'use client';

// Composer — multi-line input, Enter sends, Shift+Enter newlines, stop while
// streaming, focus-concept chip, and honest disabled/error states.
import { useEffect, useRef } from 'react';
import { ArrowUp, Square, X } from 'lucide-react';

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  focusConceptName: string | null;
  onClearFocus: () => void;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  disabled,
  focusConceptName,
  onClearFocus,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [value]);

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div className="composer-safe px-3 pb-3 sm:px-5">
      <div className="mx-auto max-w-3xl">
        {focusConceptName ? (
          <div className="mb-1.5 flex items-center gap-1.5 pl-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ffd9bd] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-extrabold text-[#7a3b1d]">
              Focusing on: {focusConceptName}
              <button
                type="button"
                onClick={onClearFocus}
                className="rounded-full p-0.5 hover:bg-[#ffe6d7]"
                aria-label={`Stop focusing on ${focusConceptName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        ) : null}

        <div
          className={`flex items-end gap-2 rounded-2xl border bg-white/95 p-2 shadow-[0_4px_18px_rgba(30,58,138,0.08)] backdrop-blur transition-colors ${
            disabled ? 'border-[#f3c1c2]' : 'border-[#e6e2dc] focus-within:border-[#7fb3ff] focus-within:ring-2 focus-within:ring-[#7fb3ff]/30'
          }`}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? 'Reconnect to continue…' : focusConceptName ? `Ask anything about ${focusConceptName}…` : 'Ask Saathy anything… (Enter to send, Shift+Enter for a new line)'}
            className="max-h-[180px] min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[14px] font-medium leading-relaxed text-[#1e3a8a] placeholder:text-[#9aa8bf] focus:outline-none disabled:opacity-60"
            aria-label="Message Saathy"
          />
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a8a] text-white transition hover:bg-[#16305b]"
              aria-label="Stop generating"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7fb3ff] to-[#5e97f0] text-white shadow-[0_2px_8px_rgba(127,179,255,0.5)] transition-all hover:brightness-105 active:scale-95 disabled:from-[#dfe4ee] disabled:to-[#dfe4ee] disabled:text-[#9aa8bf] disabled:shadow-none"
              aria-label="Send message"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className="mt-1.5 hidden text-center text-[10.5px] font-semibold text-[#9aa8bf] sm:block">
          Saathy answers from your class context &amp; teacher&apos;s notes — always double-check important steps. ☁️
        </p>
      </div>
    </div>
  );
}
