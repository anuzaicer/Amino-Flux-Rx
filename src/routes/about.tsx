import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, ShieldCheck, Stethoscope, Truck } from "lucide-react";
import telehealthMen from "@/assets/telehealth-men.jpg";
import telehealthWomen from "@/assets/telehealth-women.jpg";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { useGender } from "@/components/gender/GenderContext";
import { HEX_BL, HEX_TR } from "@/lib/hexTexture";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Amino Flux Rx — Provider-Guided Care" },
      {
        name: "description",
        content:
          "Learn how Amino Flux Rx connects lab testing, licensed provider review, and discreet pharmacy delivery in one clear care journey.",
      },
      { property: "og:title", content: "About Amino Flux Rx — Provider-Guided Care" },
      {
        property: "og:description",
        content:
          "A clear online care journey built around lab testing, licensed provider review, and discreet pharmacy delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const CARE_STEPS = [
  {
    number: "01",
    title: "Start with the right information",
    body: "Choose a treatment or lab panel and complete the required health information for your care path.",
  },
  {
    number: "02",
    title: "Reviewed by a licensed provider",
    body: "A clinician reviews your information, lab results, and treatment request before any prescription is approved.",
  },
  {
    number: "03",
    title: "Care delivered clearly",
    body: "Approved medication is dispensed by a US pharmacy and shipped discreetly to your door.",
  },
];

const TRUST_CHIPS = [
  { icon: FlaskConical, label: "Lab testing" },
  { icon: Stethoscope, label: "Licensed providers" },
  { icon: Truck, label: "Discreet delivery" },
];

const STEP_OFFSETS = ["md:mt-0", "md:mt-12", "md:mt-24"];





function AboutPage() {
  const { theme } = useGender();
  const accent = theme === "women" ? "#5C9330" : "#2173D1";

  return (
    <div className="bg-clinical-canvas text-clinical-ink">
      <SiteHeader />
      <main style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* ============ Hero — editorial split ============ */}
        <section className="flex items-center bg-clinical-canvas px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 md:grid-cols-12 md:gap-10 lg:gap-16">
            <div className="md:col-span-7">
              <p
                className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: accent }}
              >
                <span className="h-px w-10" style={{ backgroundColor: accent }} aria-hidden="true" />
                About Amino Flux Rx
              </p>
              <h1 className="mt-8 font-display text-5xl font-medium leading-[1.02] tracking-tight text-clinical-ink sm:text-6xl lg:text-7xl">
                A clearer path
                <span className="block">
                  through{" "}
                  <em className="font-light italic" style={{ color: accent }}>
                    personalized
                  </em>{" "}
                  care.
                </span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-clinical-copy sm:text-xl">
                Amino Flux Rx brings your treatment selection, lab testing, provider review, and
                care updates into one guided online experience. Each step explains what you need to
                do and what happens next.
              </p>
              <div className="mt-12 flex items-center gap-6">
                <div className="h-px w-24" style={{ backgroundColor: accent }} aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-clinical-ink">
                  How our care works
                </span>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="relative">
                {/* Corner accent frame */}
                <span
                  className="absolute -left-4 -top-4 z-10 h-24 w-24 border-l-2 border-t-2"
                  style={{ borderColor: accent }}
                  aria-hidden="true"
                />
                <div className="relative aspect-[4/5] overflow-hidden border border-clinical-border bg-clinical-tint">
                  <img
                    src={theme === "women" ? telehealthWomen : telehealthMen}
                    alt="Care provider guiding a patient through a telehealth consultation"
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                  <span
                    className="pointer-events-none absolute bottom-2 right-4 select-none font-display text-[8rem] font-bold leading-none opacity-[0.06] sm:text-[10rem]"
                    aria-hidden="true"
                  >
                    Rx
                  </span>
                  <div className="absolute bottom-4 left-4 right-4 p-5 shadow-xl backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-auto sm:p-6" style={{ backgroundColor: "rgba(255,255,255,0.88)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
                      Verified protocol
                    </p>
                    <p className="mt-1 flex items-center gap-2.5 font-display text-lg font-bold text-clinical-ink">
                      <ShieldCheck className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
                      Provider-reviewed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ Three steps — gender color band ============ */}
        <section
          className="relative overflow-hidden px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32"
          style={{ backgroundColor: accent }}
        >
          {/* Hexagon texture bleeding off the top-right and bottom-left corners */}
          <svg
            className="pointer-events-none absolute -right-20 -top-24 h-[900px] w-[1900px] select-none text-white"
            viewBox="0 0 1900 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {HEX_TR.map((cell, index) => (
              <polygon
                key={index}
                points={cell.points}
                stroke="currentColor"
                strokeOpacity={cell.opacity}
                strokeWidth="1"
              />
            ))}
          </svg>
          <svg
            className="pointer-events-none absolute -left-20 -bottom-24 h-[900px] w-[1900px] select-none text-white"
            viewBox="0 0 1900 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {HEX_BL.map((cell, index) => (
              <polygon
                key={index}
                points={cell.points}
                stroke="currentColor"
                strokeOpacity={cell.opacity}
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                The process
              </p>
              <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Three steps.
                <span className="block font-light italic text-white/85">Start to finish.</span>
              </h2>
              <div className="mt-10 flex">
                <Link
                  to="/how-it-works"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                  style={{ color: accent }}
                >
                  See the full process <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-10 md:grid-cols-3 md:gap-6">
                {CARE_STEPS.map(({ number, title, body }, index) => (
                  <div key={number} className={`flex flex-col ${STEP_OFFSETS[index]}`}>
                    <span
                      className="mb-4 block font-display text-6xl font-light italic text-white/20 md:text-7xl"
                      aria-hidden="true"
                    >
                      {number}
                    </span>
                    <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-widest">
                      {title}
                    </h3>
                    <p className="max-w-[240px] text-sm leading-relaxed text-white/85">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </section>

        {/* ============ Trust — quiet editorial block ============ */}
        <section className="flex flex-col items-center bg-clinical-canvas px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32">
          <div className="w-full max-w-4xl">
            <h2 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-clinical-ink sm:text-5xl lg:text-6xl">
              Rooted in{" "}
              <span className="font-light italic" style={{ color: accent }}>trust</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-clinical-copy sm:text-xl">
              Prescription treatments require a medical evaluation and provider approval. Complete
              your intake online, follow lab instructions, and receive clear updates as your
              request moves through review — every decision stays with you and your provider.
            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-3 sm:gap-4">
              {TRUST_CHIPS.map(({ icon: ChipIcon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2.5 border border-clinical-border bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-clinical-ink sm:px-5"
                >
                  <ChipIcon className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Link
                to="/how-it-works"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                style={{ backgroundColor: accent }}
              >
                See how it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
