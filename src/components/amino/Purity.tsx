import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Activity, FlaskConical, BadgeCheck, FileCheck2 } from "lucide-react";

const timeline = [
  { icon: FlaskConical, label: "Synthesis", value: "SPPS" },
  { icon: Activity, label: "HPLC Analysis", value: "99.4%" },
  { icon: BadgeCheck, label: "Mass Spec", value: "MALDI-TOF" },
  { icon: FileCheck2, label: "3rd-Party COA", value: "Released" },
];

export function Purity() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section id="quality" className="relative py-32">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#2173D1]">
            Scientific credibility
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-gradient md:text-6xl">
            Purity you can verify
          </h2>
          <p className="mt-5 text-white/60">
            Every batch is independently analyzed. Every certificate is publicly published.
          </p>
        </div>

        <div ref={ref} className="mt-20 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Purity meter */}
          <div className="relative overflow-hidden rounded-3xl glass-strong p-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#5C9330] opacity-30 blur-3xl" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">
              HPLC Purity
            </span>
            <div className="mt-3 flex items-end gap-2">
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="font-display text-7xl font-semibold text-gradient md:text-8xl"
              >
                99.4
              </motion.span>
              <span className="mb-3 text-2xl text-white/60">%</span>
            </div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: "99.4%" } : {}}
                transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#5C9330] to-[#2173D1] shadow-[0_0_24px_rgba(116,180,57,0.7)]"
              />
            </div>
            <div className="mt-3 flex justify-between font-mono text-[10px] text-white/40">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            {/* HPLC chart */}
            <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
                <span>HPLC · Lot AF-2406</span>
                <span>λ 220nm</span>
              </div>
              <svg viewBox="0 0 300 80" className="w-full">
                <defs>
                  <linearGradient id="hplc" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2173D1" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#5C9330" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 2.4, ease: "easeInOut" }}
                  d="M0,70 L60,68 L80,67 L100,65 L130,68 L150,15 L155,8 L160,15 L180,66 L210,67 L240,66 L270,68 L300,69"
                  stroke="#2173D1"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M0,70 L60,68 L80,67 L100,65 L130,68 L150,15 L155,8 L160,15 L180,66 L210,67 L240,66 L270,68 L300,69 L300,80 L0,80 Z"
                  fill="url(#hplc)"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>

          {/* Workflow timeline */}
          <div className="relative rounded-3xl glass-strong p-10">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">
              Verification workflow
            </span>
            <ul className="mt-8 space-y-5">
              {timeline.map((t, i) => (
                <motion.li
                  key={t.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#5C9330]/30 to-[#2173D1]/20 ring-1 ring-white/10">
                    <t.icon className="h-5 w-5 text-[#2173D1]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/80">{t.label}</div>
                    <div className="font-mono text-xs text-white/40">Step {i + 1} of 4</div>
                  </div>
                  <div className="font-mono text-xs text-electric">{t.value}</div>
                </motion.li>
              ))}
            </ul>

            <div
              id="certificates"
              className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80">Certificate of Analysis</div>
                  <div className="font-mono text-[10px] text-white/40">
                    Independent laboratory · Public ledger
                  </div>
                </div>
                <a className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">
                  View all
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
