"use client";
// LearnModuleCard — rendered in chat when Saathy resolves "learn <topic>" to a
// chapter of the artifact library. One tap opens the full-screen learning flow:
// level check → slides → quiz → flashcards → games → report.
import Link from "next/link";
import { GraduationCap, BookOpen, Layers, HelpCircle } from "lucide-react";
import type { LearnMeta } from "@/lib/saathy-types";

export function LearnModuleCard({ learn }: { learn: LearnMeta }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#d8e6f4] bg-gradient-to-br from-[#f3f9ff] to-[#eaf3fb] shadow-[0_6px_20px_rgba(30,58,138,0.10)]">
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#16305b] text-white shadow-[0_4px_10px_rgba(22,48,91,0.3)]">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2a5298]">Learning module matched</p>
          <p className="mt-0.5 truncate text-[15px] font-extrabold leading-snug text-[#16305b]">{learn.title}</p>
          <p className="text-[12px] font-bold text-[#637c96]">{learn.bookName} · Chapter {learn.chapter}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 px-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-extrabold text-[#2a5298]"><BookOpen className="h-3 w-3" />{learn.slides} slides</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-extrabold text-[#2a5298]"><Layers className="h-3 w-3" />{learn.cards} flashcards</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-extrabold text-[#2a5298]"><HelpCircle className="h-3 w-3" />{learn.quiz} quiz Qs</span>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[#e2ecf6] bg-white/60 px-4 py-3">
        <Link
          href={`/learn/${learn.book}/${learn.chapter}`}
          className="rounded-full bg-[#16305b] px-5 py-2 text-[12.5px] font-extrabold text-white shadow-[0_4px_12px_rgba(22,48,91,0.3)] transition hover:bg-[#214F78]"
        >
          Open full module →
        </Link>
        <p className="text-[11px] font-semibold leading-snug text-[#637c96]">level check → slides → quiz → flashcards → games → report</p>
      </div>
    </div>
  );
}
