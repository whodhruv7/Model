'use client';

// Saathy — the chat experience. Orchestrates context, streaming, the mastery
// loop, and the three-panel layout (sidebar / chat / settings).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon, Sparkles, Download, FileDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Mascot, type MascotPose } from './mascot';
import { MessageBubble, type UiMessage } from './message-bubble';
import { Composer } from './composer';
import { SidebarContent, type ConversationListItem } from './sidebar';
import { SettingsSheet } from './settings-sheet';
import { parseSaathyMeta, stripStreamingMeta } from '@/lib/saathy-meta';
import type { ChatMeta, ChatMode, ConceptCtx, ContextResponse, MasterySnapshot, ProfileCtx, QuickCheck } from '@/lib/saathy-types';

let tempId = 0;
const nextTempId = () => `temp-${Date.now()}-${tempId++}`;

export function ChatApp() {
  const { toast } = useToast();

  const [ctx, setCtx] = useState<ContextResponse | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'chat' | 'student' | 'founder'>('chat');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  // Client-only: sessionStorage is not available during SSR.
  const [founderUnlocked, setFounderUnlocked] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const animations = ctx?.profile.animations ?? true;

  // ---------- data loading ----------

  const refreshContext = useCallback(async () => {
    try {
      const res = await fetch('/api/context');
      if (!res.ok) return;
      const j: ContextResponse = await res.json();
      setCtx(j);
    } catch {
      /* offline — keep last known */
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const j = await res.json();
      setConversations(j.conversations ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshContext();
    refreshConversations();
  }, [refreshContext, refreshConversations]);

  // Refresh the founder lock state whenever settings opens/closes (client only).
  useEffect(() => {
    try {
      setFounderUnlocked(!!window.sessionStorage.getItem('saathy_founder_pin'));
    } catch {
      setFounderUnlocked(false);
    }
  }, [settingsOpen]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) return;
      const j = await res.json();
      setActiveId(j.conversation.id);
      setMessages(
        (j.conversation.messages as UiMessage[]).map((m) => ({ ...m, meta: m.meta ?? null }))
      );
      stickRef.current = true;
    } catch {
      /* ignore */
    }
  }, []);

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setSendError(null);
    setMobileSidebar(false);
  };

  const deleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' }).catch(() => null);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    refreshConversations();
    toast({ title: 'Chat deleted', duration: 1800 });
  };

  const clearAllChats = async () => {
    for (const c of conversations) {
      await fetch(`/api/conversations/${c.id}`, { method: 'DELETE' }).catch(() => null);
    }
    setActiveId(null);
    setMessages([]);
    refreshConversations();
    toast({ title: 'All chats deleted', duration: 2000 });
  };

  // ---------- profile / focus ----------

  const patchProfile = async (patch: Partial<ProfileCtx>) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const j = await res.json();
      setCtx((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...j.profile } } : prev));
      toast({ title: 'Saved — Saathy has adapted ☁️', duration: 1500 });
    } catch {
      toast({ title: 'Could not save right now', duration: 2000 });
    }
  };

  const focusConcept: ConceptCtx | null = useMemo(() => {
    if (!ctx?.profile.focusConceptId) return null;
    for (const s of ctx.subjects) {
      for (const ch of s.chapters) {
        const c = ch.concepts.find((x) => x.id === ctx.profile.focusConceptId);
        if (c) return c;
      }
    }
    return null;
  }, [ctx]);

  const currentChapterInfo = useMemo(() => {
    if (!ctx) return null;
    const subj = ctx.subjects.find((s) => s.id === ctx.profile.focusSubjectId) ?? ctx.subjects[0];
    const ch = subj?.chapters.find((c) => c.id === ctx.profile.focusChapterId) ?? subj?.chapters[0];
    return subj && ch ? { subject: subj.name, chapter: ch } : null;
  }, [ctx]);

  // The weakest concept in the current chapter — the gap-detector chip (AI-07 vibe)
  const weakestConcept = useMemo(() => {
    if (!currentChapterInfo) return null;
    const withTier = currentChapterInfo.chapter.concepts.filter((c) => c.tier !== null);
    if (withTier.length === 0) return null;
    return withTier.reduce((a, b) => ((a.tier ?? 3) <= (b.tier ?? 3) ? a : b));
  }, [currentChapterInfo]);

  // ---------- sounds ----------

  const playChime = (good: boolean) => {
    if (!ctx?.profile.sounds) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const audio = new AC();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = good ? 880 : 300;
      gain.gain.setValueAtTime(0.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.4);
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.4);
      setTimeout(() => audio.close(), 700);
    } catch {
      /* audio unavailable — silent */
    }
  };

  // ---------- streaming send ----------

  const send = useCallback(
    async (rawContent: string, opts?: { mode?: ChatMode; hintLevel?: 1 | 2; whyRequest?: boolean }) => {
      const content = rawContent.trim();
      if (!content || streaming) return;

      setSendError(null);
      setInput('');
      stickRef.current = true;

      const userMsg: UiMessage = { id: nextTempId(), role: 'user', content, meta: null };
      const streamMsg: UiMessage = { id: 'streaming', role: 'assistant', content: '', meta: null, streaming: true };
      setMessages((prev) => [...prev, userMsg, streamMsg]);
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            conversationId: activeId,
            content,
            mode: opts?.mode ?? 'chat',
            focusConceptId: ctx?.profile.focusConceptId ?? null,
            hintLevel: opts?.hintLevel ?? null,
            whyRequest: opts?.whyRequest ?? false,
          }),
        });

        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buffer = '';
        let acc = '';
        let finalMeta: ChatMeta = {};
        let streamId = 'streaming';

        const flushEvent = (raw: string) => {
          for (const line of raw.split('\n')) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            try {
              const ev = JSON.parse(t.slice(5).trim()) as { type: string; text?: string; conversationId?: string; meta?: ChatMeta; message?: string; assistantMessageId?: string };
              if (ev.type === 'meta') {
                if (ev.conversationId) {
                  const convId = ev.conversationId;
                  streamId = 'streaming';
                  setActiveId((prevActive) => {
                    if (prevActive !== convId) {
                      // refresh history list (new conversation created server-side)
                      refreshConversations();
                    }
                    return convId;
                  });
                }
              } else if (ev.type === 'delta' && typeof ev.text === 'string') {
                acc += ev.text;
                const shown = stripStreamingMeta(acc);
                setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, content: shown } : m)));
              } else if (ev.type === 'done') {
                finalMeta = ev.meta ?? {};
              } else if (ev.type === 'error') {
                throw new Error(ev.message ?? 'Saathy hit an error');
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            flushEvent(event);
          }
        }

        // finalize — strip the meta block from the visible text (the server
        // already saved the clean version; the client shows the same).
        const parsed = parseSaathyMeta(acc);
        const serverHasMeta = !!(
          finalMeta.followups?.length ||
          finalMeta.sources?.length ||
          finalMeta.quickcheck ||
          finalMeta.levelcheck ||
          finalMeta.artifact
        );
        const finalResolvedMeta: ChatMeta = serverHasMeta ? { ...parsed.meta, ...finalMeta } : parsed.meta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? { ...m, id: nextTempId(), content: parsed.clean || m.content, streaming: false, meta: finalResolvedMeta, error: null }
              : m
          )
        );
        refreshConversations();
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === 'AbortError';
        const msg = aborted
          ? null
          : err instanceof Error
            ? `Saathy couldn't finish this reply — ${err.message}. Nothing was faked; tap the send button to try again.`
            : 'Saathy could not be reached. Check the connection and try again.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === 'streaming'
              ? { ...m, id: nextTempId(), streaming: false, error: msg, content: m.content }
              : m
          )
        );
        if (msg) setSendError(msg);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeId, ctx, refreshConversations, streaming]
  );

  const stop = () => {
    abortRef.current?.abort();
  };

  // ---------- evidence loop ----------

  const onEvidence = async (qc: QuickCheck, correct: boolean, difficulty: number): Promise<MasterySnapshot | null> => {
    playChime(correct);
    if (correct) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1600);
    }
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptName: qc.concept, correct, difficulty, source: 'quickcheck' }),
      });
      if (!res.ok) return null;
      const j = await res.json();
      const snap = j.snapshot as MasterySnapshot;
      // live-update the mastery tree
      setCtx((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map((s) => ({
            ...s,
            chapters: s.chapters.map((ch) => ({
              ...ch,
              concepts: ch.concepts.map((c) =>
                c.name === snap.concept
                  ? { ...c, score: snap.score, tier: snap.tier, label: snap.label }
                  : c
              ),
            })),
          })),
        };
      });
      if (correct) toast({ title: `${snap.concept}: ${snap.label}`, description: 'Mastery updated from your answer.', duration: 2200 });
      return snap;
    } catch {
      return null;
    }
  };

  const onHint = (qc: QuickCheck, level: 1 | 2) => {
    send(level === 1 ? `Give me a hint for this Quick Check: ${qc.question}` : `Give me a bigger hint for this Quick Check: ${qc.question}`, { hintLevel: level });
  };

  const onWhy = (qc: QuickCheck) => {
    send(`Why was my answer wrong for: ${qc.question}`, { whyRequest: true });
  };

  const onRetry = (qc: QuickCheck) => {
    send(`One more fresh question on ${qc.concept}, same level please`, { mode: 'practise' });
  };

  const onFollowup = (text: string) => send(text, { mode: 'chat' });

  // ---------- Level Check completion → tier stored → teach in the student's way ----------
  const onLevelCheckComplete = async (correct: number, total: number, concept: string, results: boolean[]) => {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1800);
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptName: concept,
          levelcheck: { results: results.map((r) => ({ correct: r })), total: results.length },
        }),
      });
      if (res.ok) {
        const snap = (await res.json()).snapshot as MasterySnapshot;
        // live-update the mastery tree like the quick-check path does
        setCtx((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subjects: prev.subjects.map((s) => ({
              ...s,
              chapters: s.chapters.map((ch) => ({
                ...ch,
                concepts: ch.concepts.map((c) =>
                  c.name === snap.concept ? { ...c, score: snap.score, tier: snap.tier, label: snap.label } : c
                ),
              })),
            })),
          };
        });
      }
    } catch {
      /* keep going — teaching matters more than the write */
    }
    send(`Level check done on ${concept} — now teach me according to my level, step by step.`, { mode: 'explain' });
  };

  // ---------- auto-scroll (stick to bottom unless user scrolled up) ----------

  useEffect(() => {
    if (stickRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, streaming]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  // ---------- derived UI ----------

  const headerPose: MascotPose = streaming ? 'thinking' : celebrate ? 'excited' : 'idle';
  const showWelcome = messages.length === 0 && !streaming;

  const chipSend = (text: string, mode: ChatMode) => send(text, { mode });
  const chipPrefill = (text: string) => {
    setInput(text);
    document.querySelector<HTMLTextAreaElement>('[aria-label="Message Saathy"]')?.focus();
  };

  return (
    <div className="saathy-bg flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-[#f0e4d8] transition-[width] duration-300 md:block ${
          collapsed ? 'w-0' : 'w-[290px]'
        }`}
      >
        <div className="h-full w-[290px]">
          <SidebarContent
            profile={ctx?.profile ?? null}
            subjects={ctx?.subjects ?? []}
            conversations={conversations}
            activeId={activeId}
            focusConceptId={ctx?.profile.focusConceptId ?? null}
            animationsEnabled={animations}
            onSelect={loadConversation}
            onNew={newChat}
            onDelete={deleteConversation}
            onFocusConcept={(c) => patchProfile({ focusConceptId: c ? c.id : null })}
            onOpenSettings={(t) => {
              setSettingsTab(t);
              setSettingsOpen(true);
            }}
          />
        </div>
      </aside>
      {/* Mobile sidebar */}
      <Sheet open={mobileSidebar} onOpenChange={setMobileSidebar}>
        <SheetContent side="left" className="w-[300px] border-[#f0e4d8] p-0">
          <SheetTitle className="sr-only">Chats and menu</SheetTitle>
          <SheetDescription className="sr-only">Your chat history, concepts and settings</SheetDescription>
          <SidebarContent
            profile={ctx?.profile ?? null}
            subjects={ctx?.subjects ?? []}
            conversations={conversations}
            activeId={activeId}
            focusConceptId={ctx?.profile.focusConceptId ?? null}
            animationsEnabled={animations}
            onSelect={(id) => {
              setMobileSidebar(false);
              loadConversation(id);
            }}
            onNew={newChat}
            onDelete={deleteConversation}
            onFocusConcept={(c) => patchProfile({ focusConceptId: c ? c.id : null })}
            onOpenSettings={(t) => {
              setMobileSidebar(false);
              setSettingsTab(t);
              setSettingsOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-[#f0e4d8]/80 bg-[#fff9f5]/80 px-3 py-2.5 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setMobileSidebar(true)}
            className="rounded-xl p-2 text-[#5c6f8a] hover:bg-[#e6f0ff] md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden rounded-xl p-2 text-[#5c6f8a] hover:bg-[#e6f0ff] md:block"
            aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Mascot pose={headerPose} size={34} animationsEnabled={animations} thinking={streaming} interactive />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-extrabold leading-tight text-[#16305b]">
                {currentChapterInfo ? `${currentChapterInfo.subject} — ${currentChapterInfo.chapter.name}` : 'Saathy'}
              </p>
              <p className="truncate text-[10.5px] font-bold text-[#7a3b1d]">
                {ctx ? `${ctx.profile.className}-${ctx.profile.section} · ${ctx.profile.board}` : 'Loading…'}
                {focusConcept ? ` · Focus: ${focusConcept.name}` : ''}
              </p>
            </div>
          </div>

          {weakestConcept && (weakestConcept.tier ?? 3) <= 1 ? (
            <button
              type="button"
              onClick={() => chipSend(`Help me fix my ${weakestConcept.name} basics from the very beginning`, 'explain')}
              disabled={streaming}
              className="chip-in hidden items-center gap-1 rounded-full border border-[#ffd9bd] bg-[#fff3ea] px-3 py-1.5 text-[11.5px] font-extrabold text-[#a05c2e] transition hover:bg-[#ffe6d7] disabled:opacity-50 sm:flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Fix {weakestConcept.name}
            </button>
          ) : null}

          <a
              href="/api/download/app"
              download="Saathy.html"
              className="hidden rounded-xl p-2 text-[#5c6f8a] transition hover:bg-[#ffe6d7] hover:text-[#a05c2e] sm:block"
              aria-label="Download the standalone Saathy app as an HTML file"
              title="Download app as HTML (works offline)"
            >
              <FileDown className="h-5 w-5" />
            </a>

          {activeId ? (
            <a
              href={`/api/export/html?conversationId=${activeId}`}
              download
              className="hidden rounded-xl p-2 text-[#5c6f8a] transition hover:bg-[#e6f0ff] hover:text-[#2a5298] sm:block"
              aria-label="Download this chat as an HTML file"
              title="Download this chat as HTML"
            >
              <Download className="h-5 w-5" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setSettingsTab('chat');
              setSettingsOpen(true);
            }}
            className="rounded-xl p-2 text-[#5c6f8a] hover:bg-[#e6f0ff]"
            aria-label="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="chat-scroll min-h-0 flex-1 overflow-y-auto px-3 sm:px-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-6 pt-4">
            {showWelcome ? (
              <div className="flex flex-col items-center pt-6 text-center sm:pt-10">
                <Mascot pose={celebrate ? 'excited' : 'happy'} size={120} float animationsEnabled={animations} interactive alt="Saathy, your learning companion" />
                <h1 className="mt-3 text-[24px] font-extrabold tracking-tight text-[#16305b] sm:text-[28px]">
                  Hi {ctx?.profile.name ?? 'there'}! I&apos;m Saathy. ☁️
                </h1>
                <p className="mt-1.5 max-w-[44ch] text-[14px] font-semibold leading-relaxed text-[#5c6f8a]">
                  {currentChapterInfo
                    ? `Ready for ${currentChapterInfo.subject} — ${currentChapterInfo.chapter.name}? I know your class material and I adapt to how you're doing.`
                    : 'What are we learning today?'}
                </p>

                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { label: 'Explain a concept', desc: 'Step-by-step, from your notes', act: () => chipPrefill(`Explain ${focusConcept?.name ?? currentChapterInfo?.chapter.name ?? 'a concept'} `) },
                    { label: 'Solve a question', desc: 'Guided, not copy-paste', act: () => chipPrefill('Solve this: ') },
                    { label: 'Practise with questions', desc: 'Quick checks at your level', act: () => chipSend(`Start a practice round on ${currentChapterInfo?.chapter.name ?? 'my current chapter'}`, 'practise') },
                    { label: 'Summarise my notes', desc: 'From your teacher\u2019s material', act: () => chipSend(`Summarise my teacher's notes for ${currentChapterInfo?.chapter.name ?? 'the current chapter'}`, 'summarise') },
                  ].map((chip, i) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.act}
                      className="chip-in group rounded-2xl border border-[#ece7e0] bg-white/85 px-4 py-3 text-left shadow-[0_1px_6px_rgba(30,58,138,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#7fb3ff] hover:shadow-[0_6px_16px_rgba(127,179,255,0.25)]"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <p className="text-[13.5px] font-extrabold text-[#16305b]">{chip.label}</p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-[#8a94a8]">{chip.desc}</p>
                    </button>
                  ))}
                </div>

                {weakestConcept && (weakestConcept.tier ?? 3) <= 1 ? (
                  <button
                    type="button"
                    onClick={() => chipSend(`Help me fix my ${weakestConcept.name} basics from the very beginning`, 'explain')}
                    className="chip-in mt-3 flex items-center gap-1.5 rounded-full border border-[#ffd9bd] bg-[#fff3ea] px-4 py-2 text-[12.5px] font-extrabold text-[#a05c2e] transition hover:bg-[#ffe6d7]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Because you&apos;re working on it: let&apos;s fix {weakestConcept.name}
                  </button>
                ) : null}
              </div>
            ) : null}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                animationsEnabled={animations}
                busy={streaming}
                onEvidence={onEvidence}
                onWhy={onWhy}
                onHint={onHint}
                onRetry={onRetry}
                onFollowup={onFollowup}
                onLevelCheckComplete={onLevelCheckComplete}
              />
            ))}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <Composer
          value={input}
          onChange={setInput}
          onSend={() => send(input, { mode: 'chat' })}
          onStop={stop}
          streaming={streaming}
          disabled={false}
          focusConceptName={focusConcept?.name ?? null}
          onClearFocus={() => patchProfile({ focusConceptId: null })}
        />
      </main>

      {/* Settings */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
        ctx={ctx}
        founderUnlocked={founderUnlocked}
        onPatchProfile={patchProfile}
        onConceptFocus={(id) =>
          setCtx((prev) => (prev ? { ...prev, profile: { ...prev.profile, focusConceptId: id } } : prev))
        }
        onClearAllChats={clearAllChats}
      />
    </div>
  );
}
