// /learn — the module hub: three books, every chapter a notebook cover.
import Link from "next/link";
import { BOOKS, chaptersOf, artifactStats } from "@/lib/learn/artifacts";

export const metadata = {
  title: "Learn — VidhyaSaathy modules | Saathy",
  description: "Every chapter as a full learning flow: slides, quiz, flashcards, games, reports.",
};

export default function LearnHub() {
  const stats = artifactStats();
  return (
    <main className="min-h-screen bg-[#f6f9fc]">
      {/* desk header */}
      <div className="relative overflow-hidden bg-[#102b4c] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#214F78] opacity-60 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-[#2a5298] opacity-40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold text-white backdrop-blur transition hover:bg-white/20">← Saathy chat</Link>
          <h1 className="font-hand mt-4 text-[40px] font-bold leading-none sm:text-[54px]">Learning, in flow.</h1>
          <p className="mt-2 max-w-xl text-[14.5px] font-semibold leading-relaxed text-[#cfe0f2]">
            Har chapter ka poora module — pehle level check, phir slides se samajh, quiz se test, flashcards se pakka, games me score, aur last me seedhi report.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              `${stats.slides} slides`,
              `${stats.cards} flashcards`,
              `${stats.quiz} quiz questions`,
              `${stats.examples} worked examples`,
              `${stats.maps} concept maps`,
              `${stats.flows} flowcharts`,
            ].map(t => (
              <span key={t} className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold text-[#dff0ff] backdrop-blur">{t}</span>
            ))}
            <span className="rounded-full bg-[#F6D5C6] px-3.5 py-1.5 text-[12px] font-extrabold text-[#7a3a12]">{stats.total} artifacts total</span>
          </div>
        </div>
      </div>

      {/* books */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {BOOKS.map(book => {
          const chapters = chaptersOf(book.key);
          return (
            <section key={book.key} className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-12 w-9 shrink-0 rounded-r-md rounded-l-sm shadow-[0_6px_14px_rgba(16,43,76,0.25)]" style={{ background: book.cover, borderLeft: "4px solid rgba(255,255,255,0.35)" }} aria-hidden />
                <div className="min-w-0">
                  <h2 className="truncate text-[19px] font-extrabold leading-tight text-[#16305b]">{book.name}</h2>
                  <p className="truncate text-[12.5px] font-bold text-[#637c96]">{book.subject} · {chapters.length} chapters · {book.blurb}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {chapters.map(c => (
                  <Link key={c.chapter} href={`/learn/${book.key}/${c.chapter}`}
                    className="group relative overflow-hidden rounded-2xl border border-[#e4e9f1] bg-white p-4 shadow-[0_4px_14px_rgba(16,43,76,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(16,43,76,0.13)]">
                    <div className="absolute right-0 top-0 h-10 w-10 rounded-bl-2xl" style={{ background: book.cover, opacity: 0.92 }} aria-hidden>
                      <span className="absolute right-2 top-1.5 font-hand text-[15px] font-bold text-white">{c.chapter}</span>
                    </div>
                    <p className="scribble text-[13px]">{book.subject}</p>
                    <h3 className="mt-0.5 line-clamp-2 min-h-[42px] text-[14px] font-extrabold leading-snug text-[#16305b]">{c.title}</h3>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10.5px] font-extrabold text-[#637c96]">
                      <span className="rounded-full bg-[#eef4fb] px-2 py-0.5">{c.slides.length} slides</span>
                      <span className="rounded-full bg-[#fff3ea] px-2 py-0.5">{c.flashcards.length} cards</span>
                      <span className="rounded-full bg-[#eef8f0] px-2 py-0.5">{c.quiz.length} quiz</span>
                    </div>
                    <p className="mt-2.5 text-[11.5px] font-extrabold text-[#2a5298] opacity-0 transition group-hover:opacity-100">Kholo → flow shuru</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
