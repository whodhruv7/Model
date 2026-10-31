'use client';

// YouTube study card — the video power. Renders:
//  1. an inline player when a real video was shared (pasted link)
//  2. honest channel search deep-links (never invented video IDs)
//  3. a relative watch-plan timeline (what to DO at each phase)
import { useState } from 'react';
import { Clapperboard, ExternalLink, Play } from 'lucide-react';
import type { YoutubePlan } from '@/lib/saathy-types';

export function YoutubeCard({ plan }: { plan: YoutubePlan }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-[#f3d9c8] bg-gradient-to-b from-[#fff7f1] to-white">
      <p className="flex items-center gap-1.5 px-3.5 pt-3 text-[11.5px] font-extrabold uppercase tracking-wider text-[#a05c2e]">
        <Clapperboard className="h-3.5 w-3.5" />
        Video plan{plan.topic ? ` — ${plan.topic}` : ''}
      </p>

      {/* Inline player for a real, pasted video */}
      {plan.videoId ? (
        <div className="px-3.5 pt-2.5">
          {playing ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-[#ece7e0] bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${plan.videoId}?autoplay=1&rel=0`}
                title={plan.title || 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-[#ece7e0] bg-[#102b4c]"
            >
              {/* thumbnail straight from YouTube's CDN — real asset, no invented data */}
              <img
                src={`https://i.ytimg.com/vi/${plan.videoId}/hqdefault.jpg`}
                alt={plan.title || 'Video thumbnail'}
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
                loading="lazy"
              />
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#f6d5c6]/95 shadow-lg transition group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-[#102b4c] text-[#102b4c]" />
              </span>
            </button>
          )}
          <p className="mt-1.5 truncate text-[12px] font-bold text-[#16305b]">{plan.title || 'YouTube video'}</p>
        </div>
      ) : null}

      {/* Honest search deep-links */}
      {plan.searches && plan.searches.length > 0 ? (
        <div className="px-3.5 pt-2.5">
          <p className="text-[11px] font-bold text-[#8a94a8]">Pick any video from these trusted channels — plan sab pe chalega:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {plan.searches.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#ffd9bd] bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-[#a05c2e] transition hover:-translate-y-px hover:bg-[#fff1e6] hover:shadow-sm"
              >
                <ExternalLink className="h-3 w-3" />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* Relative watch-plan timeline */}
      {plan.timeline && plan.timeline.length > 0 ? (
        <div className="px-3.5 pb-3.5 pt-2.5">
          <p className="text-[11px] font-bold text-[#8a94a8]">Watch plan — har phase me ye karo:</p>
          <ol className="mt-1.5 space-y-0">
            {plan.timeline.map((st, i) => {
              const steps = plan.timeline as NonNullable<typeof plan.timeline>;
              return (
              <li key={i} className="relative flex gap-2.5 pb-2.5 last:pb-0">
                {i < steps.length - 1 ? <span className="absolute left-[9px] top-4 h-full w-[2px] rounded bg-[#f6d5c6]" aria-hidden /> : null}
                <span className="z-10 mt-0.5 flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full bg-[#f6d5c6] text-[10px] font-extrabold text-[#7a3b1d]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-extrabold text-[#7a3b1d]">{st.t}</p>
                  <p className="text-[12.5px] font-semibold leading-snug text-[#16305b]">{st.do}</p>
                </div>
              </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
