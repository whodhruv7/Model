"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  learnDeck,
  LETTERS,
  type Chapter,
  type ImpQ,
  type LearnCard,
  type McqResult,
  type Progress,
} from "@/lib/revision";
import { Html, ProgressBar, Chip } from "./atoms";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  BookOpen,
  ListChecks,
  Zap,
  Eye,
  Check,
  X,
  GraduationCap,
} from "lucide-react";

type Mode = "learn" | "imp" | "mcq";

export function ChapterView({
  chapter,
  progress,
  setProgress,
  onBack,
}: {
  chapter: Chapter;
  progress: Progress;
  setProgress: (fn: (p: Progress) => Progress) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>("learn");
  const chKey = String(chapter.num);

  const [learnIdx, setLearnIdx] = useState(0);
  const [impIdx, setImpIdx] = useState(0);
  const [mcqIdx, setMcqIdx] = useState(0);
  const deck = useMemo(() => learnDeck(chapter), [chapter]);

  /* mark learn card done */
  useEffect(() => {
    setProgress((p) => {
      const done = p.learnDone[chKey] ?? [];
      if (done.includes(learnIdx)) return p;
      return {
        ...p,
        learnDone: { ...p.learnDone, [chKey]: [...done, learnIdx] },
      };
    });
  }, [learnIdx, chKey, setProgress]);

  /* keyboard nav */
  const go = (dir: 1 | -1) => {
    if (mode === "learn") {
      setLearnIdx((i) => Math.min(deck.length - 1, Math.max(0, i + dir)));
    } else if (mode === "imp") {
      setImpIdx((i) => Math.min(chapter.imps.length - 1, Math.max(0, i + dir)));
    } else {
      setMcqIdx((i) => Math.min(chapter.mcqs.length - 1, Math.max(0, i + dir)));
    }
  };
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goRef.current(1);
      if (e.key === "ArrowLeft") goRef.current(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* swipe */
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const starKey =
    mode === "learn"
      ? `L:${chKey}:${learnIdx}`
      : mode === "imp"
      ? `Q:${chKey}:${impIdx}`
      : `M:${chKey}:${chapter.mcqs[mcqIdx]?.n ?? 0}`;
  const starred = !!progress.stars[starKey];
  const toggleStar = () =>
    setProgress((p) => ({
      ...p,
      stars: { ...p.stars, [starKey]: !p.stars[starKey] },
    }));

  const doneCount =
    mode === "learn"
      ? (progress.learnDone[chKey] ?? []).length
      : mode === "imp"
      ? (progress.impDone[chKey] ?? []).length
      : Object.keys(progress.mcq[chKey] ?? {}).length;
  const total =
    mode === "learn"
      ? deck.length
      : mode === "imp"
      ? chapter.imps.length
      : chapter.mcqs.length;

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "learn", label: "Learn", icon: <BookOpen className="h-4 w-4" /> },
    { id: "imp", label: `IMP Qs`, icon: <ListChecks className="h-4 w-4" /> },
    { id: "mcq", label: "MCQ Drill", icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-4 sm:max-w-2xl">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-600"
          aria-label="Back to chapters"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                chapter.star ? "bg-amber-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {chapter.num}
            </span>
            <p className="truncate text-sm font-bold text-zinc-100">{chapter.short}</p>
            {chapter.star && <Chip className="bg-amber-400/15 text-amber-300">★</Chip>}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar value={total ? (doneCount / total) * 100 : 0} className="h-1" />
            <span className="shrink-0 text-[10px] font-bold text-zinc-500">
              {doneCount}/{total}
            </span>
          </div>
        </div>
        <button
          onClick={toggleStar}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            starred
              ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
              : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-amber-300"
          }`}
          aria-label={starred ? "Remove star" : "Star for later"}
        >
          <Star className={`h-5 w-5 ${starred ? "fill-amber-300" : ""}`} />
        </button>
      </div>

      {/* mode tabs */}
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
              mode === t.id
                ? "bg-amber-400 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* card area */}
      <div
        className="mt-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {mode === "learn" && (
          <LearnCardView
            chapter={chapter}
            card={deck[learnIdx]}
            pos={learnIdx}
            total={deck.length}
          />
        )}
        {mode === "imp" && (
          <ImpQView
            key={`imp-${impIdx}`}
            q={chapter.imps[impIdx]}
            pos={impIdx}
            total={chapter.imps.length}
            solved={!!(progress.impDone[chKey] ?? []).includes(impIdx)}
            onSolve={() =>
              setProgress((p) => {
                const done = p.impDone[chKey] ?? [];
                if (done.includes(impIdx)) return p;
                return { ...p, impDone: { ...p.impDone, [chKey]: [...done, impIdx] } };
              })
            }
          />
        )}
        {mode === "mcq" && (
          <McqView
            key={`mcq-${chapter.mcqs[mcqIdx]?.n ?? mcqIdx}`}
            chapter={chapter}
            idx={mcqIdx}
            progress={progress}
            setProgress={setProgress}
          />
        )}
      </div>

      {/* nav bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3 sm:max-w-2xl">
          <button
            onClick={() => go(-1)}
            disabled={
              (mode === "learn" && learnIdx === 0) ||
              (mode === "imp" && impIdx === 0) ||
              (mode === "mcq" && mcqIdx === 0)
            }
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-bold text-zinc-300 transition-all enabled:hover:border-zinc-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Pichhla
          </button>
          <span className="shrink-0 text-xs font-black text-zinc-500">
            {mode === "learn" ? learnIdx + 1 : mode === "imp" ? impIdx + 1 : mcqIdx + 1} /{" "}
            {total}
          </span>
          <button
            onClick={() => go(1)}
            disabled={
              (mode === "learn" && learnIdx === deck.length - 1) ||
              (mode === "imp" && impIdx === chapter.imps.length - 1) ||
              (mode === "mcq" && mcqIdx === chapter.mcqs.length - 1)
            }
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl bg-amber-400 text-sm font-black text-zinc-950 transition-all enabled:hover:bg-amber-300 disabled:opacity-30"
          >
            {mode === "learn" && learnIdx === deck.length - 2
              ? "Almost done!"
              : mode === "learn" && learnIdx === deck.length - 1
              ? "Complete"
              : "Agla"}{" "}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= LEARN (one concept at a time) ================= */

function LearnCardView({
  chapter,
  card,
  pos,
  total,
}: {
  chapter: Chapter;
  card: LearnCard;
  pos: number;
  total: number;
}) {
  const key = `${chapter.num}-${card.kind}-${"idx" in card ? card.idx : "i"}`;
  return (
    <div key={key} className="card-in rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      {card.kind === "intro" && (
        <>
          <Chip className="bg-violet-400/10 text-violet-300">
            <GraduationCap className="h-3 w-3" /> Chapter intro
          </Chip>
          <p className="mt-3 text-lg font-bold leading-snug text-zinc-100">
            {chapter.short} — ek line mein
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            <Html html={chapter.intro} />
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { n: chapter.formulas.length, l: "Formulas" },
              { n: chapter.checks.length, l: "Concept rules" },
              { n: chapter.tricks.length, l: "Speed tricks" },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-zinc-950/60 p-2.5">
                <p className="text-lg font-black text-amber-300">{x.n}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  {x.l}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {card.kind === "formula" && (
        <>
          <div className="flex items-center justify-between">
            <Chip className="bg-amber-400/15 text-amber-300">
              Formula {card.idx + 1}/{chapter.formulas.length}
            </Chip>
          </div>
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-lg font-black leading-relaxed tracking-tight text-amber-200 sm:text-xl">
              <Html html={chapter.formulas[card.idx].f} />
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            <Html html={chapter.formulas[card.idx].meaning} />
          </p>
          <div className="mt-3 rounded-xl bg-zinc-950/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Tiny example
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              <Html html={chapter.formulas[card.idx].ex} />
            </p>
          </div>
        </>
      )}

      {card.kind === "check" && (
        <>
          <Chip className="bg-emerald-400/10 text-emerald-300">
            <Check className="h-3 w-3" /> Concept rule {card.idx + 1}/{chapter.checks.length}
          </Chip>
          <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-200">
            <Html html={chapter.checks[card.idx]} />
          </p>
        </>
      )}

      {card.kind === "trick" && (
        <>
          <Chip className="bg-fuchsia-400/10 text-fuchsia-300">
            <Zap className="h-3 w-3" /> Speed trick {card.idx + 1}/{chapter.tricks.length}
          </Chip>
          <div className="mt-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300/80">
              Instant trick
            </p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-zinc-100">
              <Html html={chapter.tricks[card.idx].trick} />
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            <span className="font-bold text-zinc-300">Kab fire kare: </span>
            <Html html={chapter.tricks[card.idx].when} />
          </p>
        </>
      )}
      <div className="mt-5 flex justify-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${
              i === pos ? "w-4 bg-amber-400" : "w-1 bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ================= IMP QUESTIONS ================= */

function ImpQView({
  q,
  pos,
  total,
  solved,
  onSolve,
}: {
  q: ImpQ;
  pos: number;
  total: number;
  solved: boolean;
  onSolve: () => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="card-in rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className="bg-fuchsia-400/10 text-fuchsia-300">IMP Q {pos + 1}/{total}</Chip>
        {solved && (
          <Chip className="bg-emerald-400/10 text-emerald-300">
            <Check className="h-3 w-3" /> done
          </Chip>
        )}
        <Chip className="bg-zinc-800 text-zinc-400">{q.level}</Chip>
        <span className="truncate text-[11px] font-semibold text-zinc-500">{q.concept}</span>
      </div>

      <p className="mt-3 text-base font-bold leading-relaxed text-zinc-100">
        <Html html={q.stem} />
      </p>

      {q.fig && (
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/figs/${q.fig}`}
          alt="Question figure"
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-white"
        />
      )}

      {!show ? (
        <button
          onClick={() => {
            setShow(true);
            onSolve();
          }}
          className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300"
        >
          <Eye className="h-4 w-4" /> Pehle KHUD try karo — phir solution dikhao
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-zinc-950/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Solution
            </p>
            <ol className="mt-2 space-y-2">
              {q.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-black text-amber-300">
                    {i + 1}
                  </span>
                  <span>
                    <Html html={s} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Answer
            </p>
            <p className="mt-1 text-sm font-black text-emerald-200">
              <Html html={q.answer} />
            </p>
          </div>
          {q.why.length > 0 && (
            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Why this works
              </p>
              <ul className="mt-2 space-y-1.5">
                {q.why.map((w, i) => (
                  <li key={i} className="text-xs leading-relaxed text-zinc-400">
                    • <Html html={w} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
              Teacher note
            </p>
            <p className="mt-1 text-xs italic leading-relaxed text-zinc-400">
              <Html html={q.hinglish} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MCQ DRILL ================= */

function McqView({
  chapter,
  idx,
  progress,
  setProgress,
}: {
  chapter: Chapter;
  idx: number;
  progress: Progress;
  setProgress: (fn: (p: Progress) => Progress) => void;
}) {
  const q = chapter.mcqs[idx];
  const chKey = String(chapter.num);
  const saved = (progress.mcq[chKey] ?? {})[String(q.n)];
  const [picked, setPicked] = useState<"A" | "B" | "C" | "D" | null>(saved ?? null);

  const answered = picked !== null;
  const isRight = picked === q.ans;

  const results = Object.values(progress.mcq[chKey] ?? {});
  const c = results.filter((r) => r === "C").length;
  const w = results.filter((r) => r === "W").length;

  const pick = (L: "A" | "B" | "C" | "D") => {
    if (answered) return;
    setPicked(L);
    const res: McqResult = L === q.ans ? "C" : "W";
    setProgress((p) => ({
      ...p,
      mcq: { ...p.mcq, [chKey]: { ...(p.mcq[chKey] ?? {}), [String(q.n)]: res } },
    }));
  };

  return (
    <div className="card-in rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip className="bg-amber-400/15 text-amber-300">MCQ {idx + 1}/{chapter.mcqs.length}</Chip>
        <Chip className="bg-zinc-800 text-zinc-400">{q.level}</Chip>
        <span className="truncate text-[11px] font-semibold text-zinc-500">{q.concept}</span>
        <div className="ml-auto flex items-center gap-2 text-[11px] font-black">
          <span className="flex items-center gap-1 text-emerald-400">
            <Check className="h-3.5 w-3.5" /> {c}
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <X className="h-3.5 w-3.5" /> {w}
          </span>
        </div>
      </div>

      <p className="mt-3 text-base font-bold leading-relaxed text-zinc-100">
        <Html html={q.stem} />
      </p>

      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const L = LETTERS[i];
          const isAns = L === q.ans;
          let cls = "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-amber-400/40";
          if (answered) {
            if (isAns) cls = "border-emerald-400/60 bg-emerald-400/10 text-emerald-200";
            else if (L === picked) cls = "border-rose-400/60 bg-rose-400/10 text-rose-200";
            else cls = "border-zinc-800/60 bg-zinc-950/40 text-zinc-600";
          }
          return (
            <button
              key={L}
              onClick={() => pick(L)}
              disabled={answered}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold transition-all ${cls} ${
                answered ? "cursor-default" : "active:scale-[0.99]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                  answered && isAns
                    ? "bg-emerald-400 text-zinc-950"
                    : answered && L === picked
                    ? "bg-rose-400 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {answered && isAns ? <Check className="h-3.5 w-3.5" /> : answered && L === picked ? <X className="h-3.5 w-3.5" /> : L}
              </span>
              <span className="leading-relaxed">
                <Html html={opt} />
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="card-in mt-4 space-y-3">
          <div
            className={`rounded-2xl p-4 ${
              isRight ? "bg-emerald-400/10" : "bg-rose-400/10"
            }`}
          >
            <p
              className={`flex items-center gap-1.5 text-sm font-black ${
                isRight ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {isRight ? (
                <>
                  <Check className="h-4 w-4" /> Sahi! Answer: ({q.ans})
                </>
              ) : (
                <>
                  <X className="h-4 w-4" /> Galat — correct answer: ({q.ans})
                </>
              )}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              <Html html={q.expl} />
            </p>
          </div>
          {!isRight && Object.keys(q.traps).length > 0 && (
            <div className="rounded-2xl bg-zinc-950/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-300/80">
                Trap analysis — options ne phansaya kaise
              </p>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(q.traps).map(([L, t]) => (
                  <li key={L} className="text-xs leading-relaxed text-zinc-400">
                    <span className="font-black text-rose-300">({L})</span>{" "}
                    <Html html={t} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">
              1-line logic
            </p>
            <p className="mt-1 text-xs italic leading-relaxed text-zinc-300">
              <Html html={q.hinglish} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
