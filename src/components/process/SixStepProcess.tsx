import {
  FlaskConical,
  MailCheck,
  CalendarDays,
  FileText,
  Stethoscope,
  PackageCheck,
  Check,
} from "lucide-react";

export const SIX_STEPS = [
  {
    icon: FlaskConical,
    title: "Order your lab",
    text: "Pick the lab panel for your treatment and pay for it. Next: we set up your order with Quest.",
  },
  {
    icon: MailCheck,
    title: "Watch for our email",
    text: "We put your order into Quest Diagnostics. Next: you get an email with your booking link.",
  },
  {
    icon: CalendarDays,
    title: "Book your blood draw",
    text: "Use the link to choose a Quest location and time. Next: go in and have your blood drawn.",
  },
  {
    icon: FileText,
    title: "Get your results",
    text: "Quest sends your results to us and they appear in your account. Next: book your review.",
  },
  {
    icon: Stethoscope,
    title: "Talk to a practitioner",
    text: "Book a Zoom or phone call to go over your results. Next: they decide if treatment is right for you.",
  },
  {
    icon: PackageCheck,
    title: "Order your medication",
    text: "Once approved, you can place your order. It ships discreetly to your door.",
  },
] as const;

type Props = {
  /** 1-6 — highlights the step the patient is on right now. */
  activeStep?: number;
  variant?: "dark" | "light";
  compact?: boolean;
  accent?: string;
  showIntro?: boolean;
  /** Shorter heading block so the section fits one screen. */
  briefIntro?: boolean;
};

/**
 * The 6 STEP PROCESS — the controlled-substance ordering protocol, shown on the
 * homepage, the how-it-works page, product pages and the patient portal.
 */
export function SixStepProcess({
  activeStep,
  variant = "dark",
  compact = false,
  accent = "#2173D1",
  showIntro = true,
  briefIntro = false,
}: Props) {
  const dark = variant === "dark";
  const titleColor = dark ? "text-white" : "text-[#0B2545]";
  const bodyColor = dark ? "text-white/70" : "text-[#0B2545]/70";
  const cardClass = dark
    ? "border-white/12 bg-white/[0.06] backdrop-blur-xl"
    : "border-black/5 bg-white shadow-sm";

  return (
    <div className={compact ? "" : "mx-auto max-w-6xl px-4 sm:px-6"}>
      {showIntro && (
        <header className="max-w-3xl">
          <p
            className={`font-mono text-[14px] uppercase tracking-[0.28em] ${dark ? "text-white" : "text-[var(--process-accent)]"}`}
            style={{ "--process-accent": accent } as React.CSSProperties}
          >
            The 6 step process
          </p>
          <h2
            className={`mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl ${titleColor}`}
          >
            The way of the future — order your medication online
          </h2>
          {!briefIntro && (
            <p className={`mt-3 text-[17px] leading-relaxed ${bodyColor}`}>
              No drive to the doctor&apos;s office. No waiting room. Six simple steps you can do
              from home — and your medication comes to your door. Each step tells you exactly what
              happens next.
            </p>
          )}
        </header>
      )}

      <ol
        className={`${showIntro ? (briefIntro ? "mt-4" : "mt-10") : ""} grid gap-2.5 min-[390px]:grid-cols-2 sm:grid-cols-3`}
      >
        {SIX_STEPS.map((step, i) => {
          const n = i + 1;
          const done = activeStep !== undefined && n < activeStep;
          const current = activeStep === n;
          return (
            <li
              key={step.title}
              className={`relative rounded-2xl border p-3.5 transition ${cardClass} ${
                current ? "ring-2" : ""
              }`}
              style={
                current
                  ? ({ borderColor: accent, "--tw-ring-color": accent } as React.CSSProperties)
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
                  style={{ backgroundColor: done ? "#1F9254" : accent }}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <step.icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: dark ? "#ffffff" : accent }}
                />
                {current && (
                  <span
                    className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: accent }}
                  >
                    You are here
                  </span>
                )}
              </div>
              <h3 className={`mt-2 text-[15px] font-semibold ${titleColor}`}>{step.title}</h3>
              <p className={`mt-1 text-[13px] leading-snug ${bodyColor}`}>{step.text}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default SixStepProcess;
