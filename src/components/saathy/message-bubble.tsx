'use client';

// One chat message. Saathy's replies are structured: markdown + KaTeX,
// source chips (honesty layer), Quick Check card, follow-up chips.
import { useState } from 'react';
import { Check, Copy, BookOpen } from 'lucide-react';
import { Mascot } from './mascot';
import { Markdown } from './markdown';
import { QuickCheckCard } from './quick-check';
import { LevelCheckCard } from './level-check';
import { ArtifactCard } from './artifacts/artifact-card';
import type { ChatMeta, MasterySnapshot } from '@/lib/saathy-types';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: ChatMeta | null;
  streaming?: boolean;
  error?: string | null;
}

export interface MessageBubbleProps {
  message: UiMessage;
  animationsEnabled: boolean;
  busy: boolean;
  onEvidence: (qc: QuickCheckMetaQC, correct: boolean, difficulty: number) => Promise<MasterySnapshot | null>;
  onWhy: (qc: QuickCheckMetaQC) => void;
  onHint: (qc: QuickCheckMetaQC, level: 1 | 2) => void;
  onRetry: (qc: QuickCheckMetaQC) => void;
  onFollowup: (text: string) => void;
  onLevelCheckComplete: (correct: number, total: number, concept: string, results: boolean[]) => void;
}

type QuickCheckMetaQC = NonNullable<ChatMeta['quickcheck']>;

export function MessageBubble({
  message,
  animationsEnabled,
  busy,
  onEvidence,
  onWhy,
  onHint,
  onRetry,
  onFollowup,
  onLevelCheckComplete,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const meta = message.meta;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  if (isUser) {
    return (
      <div className="msg-in flex justify-end" data-message-role="user">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#7fb3ff] to-[#6aa6ff] px-4 py-2.5 text-[14px] font-semibold leading-relaxed text-[#0e2a5e] shadow-[0_2px_10px_rgba(30,58,138,0.12)]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in flex gap-2.5" data-message-role="assistant">
      <Mascot
        pose={message.streaming ? 'thinking' : 'explaining'}
        size={34}
        animationsEnabled={animationsEnabled}
        thinking={message.streaming}
        className="mt-0.5"
      />
      <div className="min-w-0 max-w-[calc(100%-3rem)] flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold tracking-wide text-[#16305b]">Saathy</span>
          {!message.streaming ? (
            <button
              type="button"
              onClick={copy}
              className="rounded-md p-1 text-[#5c6f8a] opacity-60 transition hover:bg-[#e6f0ff] hover:opacity-100"
              aria-label="Copy reply"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#46a758]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl rounded-tl-md border border-[#ece7e0] bg-white/85 px-4 py-3 shadow-[0_1px_8px_rgba(30,58,138,0.05)] backdrop-blur-sm">
          {message.content ? (
            <Markdown content={message.content} />
          ) : message.streaming ? null : (
            <p className="text-[13px] italic text-[#5c6f8a]">…</p>
          )}

          {message.streaming ? (
            <span className="mt-1 flex items-center gap-1" aria-label="Saathy is typing">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#7fb3ff]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#7fb3ff]" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#7fb3ff]" />
            </span>
          ) : null}

          {message.error ? (
            <div className="mt-2 rounded-lg border border-[#f3c1c2] bg-[#fdf0f0] px-3 py-2 text-[12.5px] font-semibold text-[#9c2c30]">
              {message.error}
            </div>
          ) : null}

          {/* Honesty layer: visible sources */}
          {meta?.sources && meta.sources.length > 0 && !message.streaming ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {meta.sources.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-[#cfe3fb] bg-[#f3f9ff] px-2.5 py-0.5 text-[11px] font-bold text-[#2a5298]"
                >
                  <BookOpen className="h-3 w-3" />
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {/* Interactive Quick Check */}
          {meta?.quickcheck && !message.streaming ? (
            <QuickCheckCard
              qc={meta.quickcheck}
              busy={busy}
              onEvidence={(correct, difficulty) => onEvidence(meta.quickcheck as QuickCheckMetaQC, correct, difficulty)}
              onWhy={() => onWhy(meta.quickcheck as QuickCheckMetaQC)}
              onHint={(level) => onHint(meta.quickcheck as QuickCheckMetaQC, level)}
              onRetry={() => onRetry(meta.quickcheck as QuickCheckMetaQC)}
            />
          ) : null}

          {/* Level Check — the cute-cards gate before teaching */}
          {meta?.levelcheck && !message.streaming ? (
            <LevelCheckCard plan={meta.levelcheck} animationsEnabled={animationsEnabled} onComplete={onLevelCheckComplete} />
          ) : null}

          {/* Artifact — interactive chart / concept machine */}
          {meta?.artifact && !message.streaming ? (
            <ArtifactCard artifact={meta.artifact} animationsEnabled={animationsEnabled} />
          ) : null}
        </div>

        {/* Follow-up chips */}
        {meta?.followups && meta.followups.length > 0 && !message.streaming ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.followups.map((f, i) => (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => onFollowup(f)}
                className="chip-in rounded-full border border-[#e6e2dc] bg-white/80 px-3 py-1.5 text-[12px] font-bold text-[#2a5298] transition-all hover:-translate-y-px hover:border-[#7fb3ff] hover:bg-[#f3f9ff] disabled:opacity-50"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
