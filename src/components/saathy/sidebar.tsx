'use client';

// Sidebar — brand, New chat, searchable history, the concept mastery panel
// (heat-map colours: green=secure, peach=mixed, red=stuck — VS-61 semantics,
// student-friendly labels only), and the student/settings footer.
import { useMemo, useState } from 'react';
import { MessageSquarePlus, Search, Trash2, Settings, Target, BookOpen } from 'lucide-react';
import { Mascot } from './mascot';
import { Button } from '@/components/ui/button';
import type { ConceptCtx, ProfileCtx, SubjectCtx } from '@/lib/saathy-types';

export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface SidebarProps {
  profile: ProfileCtx | null;
  subjects: SubjectCtx[];
  conversations: ConversationListItem[];
  activeId: string | null;
  focusConceptId: string | null;
  animationsEnabled: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onFocusConcept: (concept: ConceptCtx | null) => void;
  onOpenSettings: (tab: 'chat' | 'student' | 'founder') => void;
}

export function SidebarContent({
  profile,
  subjects,
  conversations,
  activeId,
  focusConceptId,
  animationsEnabled,
  onSelect,
  onNew,
  onDelete,
  onFocusConcept,
  onOpenSettings,
}: SidebarProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  // Current chapter concepts (focus subject/chapter, else first)
  const currentChapter = useMemo(() => {
    const subj = subjects.find((s) => s.id === profile?.focusSubjectId) ?? subjects[0];
    const ch = subj?.chapters.find((c) => c.id === profile?.focusChapterId) ?? subj?.chapters[0];
    return ch ? { subject: subj, chapter: ch } : null;
  }, [subjects, profile]);

  return (
    <div className="flex h-full flex-col bg-[#fdf4ec]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        {/* Local logo asset — plain img (avoids next/image preflight aspect warning). */}
        <img src="/saathy/logo_vs.png" alt="VidhyaSaathy" width={40} height={40} className="rounded-xl" draggable={false} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold leading-tight text-[#16305b]">VidhyaSaathy</p>
          <p className="truncate text-[11px] font-bold text-[#7a3b1d]">Saathy · Learning, with you.</p>
        </div>
      </div>

      <div className="px-3">
        <Button
          onClick={onNew}
          className="h-10 w-full justify-start gap-2 rounded-xl bg-gradient-to-r from-[#7fb3ff] to-[#5e97f0] px-3 text-[13.5px] font-extrabold text-[#0e2a5e] shadow-[0_2px_10px_rgba(127,179,255,0.45)] hover:brightness-105"
        >
          <MessageSquarePlus className="h-4.5 w-4.5" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-[#f0e4d8] bg-white/70 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#9aa8bf]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-transparent text-[12.5px] font-semibold text-[#1e3a8a] placeholder:text-[#b3bdcf] focus:outline-none"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* History */}
      <div className="chat-scroll mt-2 min-h-0 flex-1 overflow-y-auto px-2.5 pb-1">
        <p className="px-1.5 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa8bf]">History</p>
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-[12px] font-medium text-[#9aa8bf]">
            {query ? 'No chats match that.' : 'No chats yet — say hi to Saathy!'}
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`group mb-0.5 flex items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                activeId === c.id ? 'bg-[#ffe6d7]' : 'hover:bg-[#fbe9df]/70'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="min-w-0 flex-1 text-left"
                title={c.title}
              >
                <p className="truncate text-[13px] font-bold text-[#1e3a8a]">{c.title}</p>
                <p className="text-[10.5px] font-semibold text-[#9aa8bf]">{c.messageCount} messages</p>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="rounded-lg p-1.5 text-[#b3bdcf] opacity-0 transition hover:bg-[#fdf0f0] hover:text-[#e5484d] group-hover:opacity-100"
                aria-label={`Delete chat: ${c.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Mastery panel */}
      {currentChapter ? (
        <div className="border-t border-[#f0e4d8] px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-[#9aa8bf]">
              <BookOpen className="h-3 w-3" />
              {currentChapter.subject.name} · {currentChapter.chapter.name}
            </p>
          </div>
          <div className="chat-scroll max-h-40 space-y-0.5 overflow-y-auto">
            {currentChapter.chapter.concepts.map((c) => {
              const isFocus = focusConceptId === c.id;
              const dot = c.tier !== null ? ['#e5484d', '#f19937', '#7fb3ff', '#46a758'][c.tier] : '#d7dbe4';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onFocusConcept(isFocus ? null : c)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isFocus ? 'bg-[#e6f0ff] ring-1 ring-[#7fb3ff]' : 'hover:bg-white/80'
                  }`}
                  title={isFocus ? 'Tap to stop focusing' : `Focus on ${c.name}`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: dot, boxShadow: `0 0 0 3px ${dot}22` }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#1e3a8a]">{c.name}</span>
                  <span className="shrink-0 text-[10px] font-extrabold text-[#8a94a8]">{isFocus ? <Target className="h-3 w-3 text-[#2a5298]" /> : c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Student + settings */}
      <div className="border-t border-[#f0e4d8] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/70 p-2.5">
          <Mascot pose={profile?.name ? 'wink' : 'idle'} size={38} animationsEnabled={animationsEnabled} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-[#16305b]">{profile?.name ?? 'Learner'}</p>
            <p className="truncate text-[10.5px] font-bold text-[#7a3b1d]">
              {profile ? `${profile.className}-${profile.section} · ${profile.board}` : '…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSettings('chat')}
            className="rounded-xl border border-[#f0e4d8] bg-white p-2 text-[#5c6f8a] transition hover:border-[#7fb3ff] hover:text-[#2a5298]"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
