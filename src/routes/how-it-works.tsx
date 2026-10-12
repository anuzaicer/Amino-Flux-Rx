import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Truck, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SIX_STEPS } from "@/components/process/SixStepProcess";
import { useGender } from "@/components/gender/GenderContext";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "The 6 Step Process — Amino Flux Rx" },
      {
        name: "description",
        content:
          "Order labs, get your Quest appointment, review results with a nurse practitioner and receive approved medication at your door — the Amino Flux Rx 6 step process.",
      },
      { property: "og:title", content: "The 6 Step Process — Amino Flux Rx" },
      {
        property: "og:description",
        content:
          "Six easy steps from lab order to approved medication delivered to your door — no waiting rooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

/** Split "description. Next: what happens next." into its two halves. */
function splitStep(text: string) {
  const marker = " Next: ";
  const idx = text.indexOf(marker);
  if (idx === -1) return { desc: text, next: null };
  return { desc: text.slice(0, idx).replace(/\.$/, ""), next: text.slice(idx + marker.length) };
}

function HowItWorksPage() {
  const { theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";
  const deep = theme === "women" ? "#1C4A28" : "#0F2F66";

  return (
    <div className="relative min-h-screen bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main className="bg-slate-50 px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 sm:gap-16">
          {/* Header */}
          <header className="flex flex-col justify-between gap-8 border-b border-slate-200 pb-10 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span
                className="mb-3 block text-[13px] font-bold uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                The 6 step process
              </span>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl md:text-5xl">
                The way of the future — <span style={{ color: accent }}>order your medication online</span>
              </h1>
              <p className="mt-4 text-[17px] leading-relaxed text-clinical-copy">
                No drive to the doctor&apos;s office. No waiting room. Six simple steps you can do
                from home — and your medication comes to your door. Each step tells you exactly
                what happens next.
              </p>
            </div>
            <Link
              to="/lab-testing"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-95"
              style={{ backgroundColor: accent }}
            >
              Start with step 1 <ArrowRight className="h-4 w-4" />
            </Link>
          </header>

          {/* Steps */}
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-slate-200 bg-white shadow-[0_2px_20px_-6px_rgba(15,23,42,0.08)]">
            {SIX_STEPS.map((step, i) => {
              const { desc, next } = splitStep(step.text);
              const isFinal = !next;
              return (
                <li
                  key={step.title}
                  className={`group relative flex flex-col p-7 border-r border-b border-slate-200 transition-colors duration-300 sm:p-8 ${
                    isFinal ? "" : "hover:bg-slate-50/80"
                  }`}
                  style={
                    isFinal
                      ? {
                          backgroundColor: deep,
                          boxShadow: `inset 0 0 0 3px ${accent}`,
                        }
                      : undefined
                  }
                >
                  {/* Corner number */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-6 top-5 select-none text-5xl font-black leading-none tracking-tight sm:text-6xl"
                    style={{ color: isFinal ? "rgba(255,255,255,0.08)" : "rgb(226 232 240 / 0.55)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-7 flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          isFinal ? "rounded-sm text-white" : "rounded-sm"
                        }`}
                        style={
                          isFinal
                            ? { backgroundColor: accent, color: "#ffffff" }
                            : {
                                color: accent,
                                border: `1px solid ${accent}33`,
                                backgroundColor: `${accent}0D`,
                              }
                        }
                      >
                        {isFinal ? "Final step" : `Step ${String(i + 1).padStart(2, "0")}`}
                      </span>
                    </div>

                    <h3
                      className={`mb-3 font-display text-xl font-bold tracking-tight ${
                        isFinal ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`flex-1 text-sm leading-relaxed ${
                        isFinal ? "text-white/70" : "text-slate-600"
                      }`}
                    >
                      {desc}
                    </p>

                    <div className="mt-8 flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isFinal ? "#ffffff" : accent }}
                      >
                        {isFinal ? "Complete" : "Next step"}
                      </span>
                      <span
                        className={`h-px flex-1 ${isFinal ? "bg-white/20" : "bg-slate-200"}`}
                        aria-hidden="true"
                      />
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${
                          isFinal ? "text-white" : ""
                        }`}
                        style={isFinal ? undefined : { color: accent }}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium leading-snug ${
                        isFinal ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {next ?? "Delivered to your door"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Trust / CTA panel */}
          <section
            className="relative overflow-hidden rounded-3xl p-8 text-white md:p-12"
            style={{ backgroundColor: deep }}
          >
            <div
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ backgroundColor: accent }}
            />
            <div
              className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: accent }}
            />
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="mb-3 font-display text-2xl font-bold sm:text-3xl">
                  Ready to take control of your health journey?
                </h2>
                <p className="max-w-md text-[16px] text-white/80">
                  Start by ordering your lab. We guide you through every step after that.
                </p>
              </div>
              <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
                <Link
                  to="/lab-testing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white whitespace-nowrap px-7 py-4 text-[15px] font-bold shadow-lg transition-transform active:scale-95"
                  style={{ color: deep }}
                >
                  Order your lab <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/account"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 whitespace-nowrap px-7 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
                >
                  Go to my portal
                </Link>
              </div>
            </div>
            <div className="relative z-10 mt-10 grid gap-6 border-t border-white/15 pt-8 md:grid-cols-3">
              <TrustRow icon={Stethoscope} title="Licensed practitioners">
                Every controlled-substance order is reviewed by a licensed nurse practitioner before
                it ships.
              </TrustRow>
              <TrustRow icon={ShieldCheck} title="Your labs, your choice">
                Take your Quest results to your own doctor, or book a lab review with our
                practitioners.
              </TrustRow>
              <TrustRow icon={Truck} title="Delivered discreetly">
                Approved medication is dispensed by a US pharmacy and shipped straight to your door.
              </TrustRow>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TrustRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white" />
      <div>
        <h4 className="mb-1 font-bold text-white">{title}</h4>
        <p className="text-sm leading-relaxed text-white/75">{children}</p>
      </div>
    </div>
  );
}

export default HowItWorksPage;
