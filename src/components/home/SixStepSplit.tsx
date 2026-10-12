import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { SIX_STEPS } from "@/components/process/SixStepProcess";
import { useGender } from "@/components/gender/GenderContext";
import telehealthMen from "@/assets/telehealth-men.jpg";
import telehealthWomen from "@/assets/telehealth-women.jpg";

/**
 * Split-screen 6 step process — medical photo on the left, luminous glass
 * accordion on the right: translucent white glass rows over the bright
 * gender-colored section, with the active step lifted to a solid white card.
 * Used on the homepage.
 */
export function SixStepSplit() {
  const { theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";
  const photo = theme === "women" ? telehealthWomen : telehealthMen;
  const [open, setOpen] = useState<number>(1);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="grid overflow-hidden rounded-[26px] md:grid-cols-2" style={{ backgroundColor: accent }}>
        {/* Left — photo */}
        <div className="relative min-h-[280px] md:min-h-[620px]">
          <img
            src={photo}
            alt="Amino Flux Rx provider on a video consultation"
            width={1200}
            height={1200}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 60%, ${accent}99 100%)`,
            }}
          />
        </div>

        {/* Right — glass accordion */}
        <div className="relative px-6 py-10 sm:px-10 md:px-12 md:py-14">
          {/* faint medical-cross pattern */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-44 w-44 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(currentColor 2px, transparent 2px)",
              color: "#ffffff",
              backgroundSize: "26px 26px",
            }}
          />

          {/* pill tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/15 px-4 py-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#ffffff" }}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
              The 6 step process
            </span>
          </div>

          <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            The way of the future — order your medication online
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
            No drive to the doctor's office. No waiting room. Six simple steps
            from home — and your medication comes to your door.
          </p>

          {/* accordion */}
          <ul className="mt-7 space-y-4">
            {SIX_STEPS.map((step, i) => {
              const n = i + 1;
              const isOpen = open === n;
              if (isOpen) {
                return (
                  <li
                    key={step.title}
                    className="rounded-[1.25rem] bg-white p-6 shadow-xl ring-1 ring-white/20 transition-all duration-300"
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(-1)}
                      aria-expanded="true"
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="flex items-center gap-5">
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white shadow-md"
                          style={{ backgroundColor: accent }}
                        >
                          {String(n).padStart(2, "0")}
                        </span>
                        <span
                          className="text-[20px] font-bold tracking-tight"
                          style={{ color: accent }}
                        >
                          {step.title}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 rotate-180 transition-transform duration-300`}
                        style={{ color: accent }}
                      />
                    </button>
                    <div className="mt-4 pl-[60px]">
                      <p className="text-[15px] font-normal leading-relaxed text-slate-600">
                        {step.text}
                      </p>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={step.title}
                  className="group cursor-pointer overflow-hidden rounded-[1.25rem] border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/15"
                  onClick={() => setOpen(n)}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(n)}
                    aria-expanded="false"
                    className="flex w-full items-center justify-between gap-4 p-5 text-left sm:px-6"
                  >
                    <span className="flex items-center gap-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-[13px] font-semibold text-white transition-colors group-hover:bg-white/20">
                        {String(n).padStart(2, "0")}
                      </span>
                      <span className="text-[18px] font-semibold tracking-tight text-white/90">
                        {step.title}
                      </span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-all duration-300 group-hover:text-white" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 flex items-center gap-3">
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-[12px] font-bold uppercase tracking-[0.2em] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.2)]"
              style={{ color: accent }}
            >
              <Plus className="h-4 w-4" />
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SixStepSplit;
