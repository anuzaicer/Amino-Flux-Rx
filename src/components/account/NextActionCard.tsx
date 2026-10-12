import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Lock,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import {
  consultStatus,
  labStatus,
  medicationOrderStatus,
  missingOnboarding,
  onboardingComplete,
  resolveNextAction,
  treatmentStatus,
  type JourneyContext,
  type JourneyState,
  type NextAction,
  type NextActionCta,
  type NextActionTone,
} from "@/lib/journey";

type Variant = "light" | "dark";

const DONE_GREEN = "#1F9254";
const BLOCKED_AMBER = "#B45309";

/** Badge copy + icon per tone — the patient must be able to tell "do something" from "wait" at a glance. */
export const TONE_META: Record<
  NextActionTone,
  { badge: string; icon: typeof Sparkles; color: (accent: string) => string }
> = {
  action: { badge: "Action needed", icon: Sparkles, color: (a) => a },
  waiting: { badge: "We're working on it", icon: Clock, color: () => "#5B6B82" },
  done: { badge: "Complete", icon: CheckCircle2, color: () => DONE_GREEN },
  blocked: { badge: "Needs your attention", icon: AlertTriangle, color: () => BLOCKED_AMBER },
  start: { badge: "Getting started", icon: Compass, color: (a) => a },
};

export function ActionButton({
  cta,
  accent,
  kind,
  variant = "light",
  className = "",
}: {
  cta: NextActionCta;
  accent: string;
  kind: "primary" | "secondary" | "quiet";
  variant?: Variant;
  className?: string;
}) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const look =
    kind === "primary"
      ? "text-white shadow-md hover:brightness-110"
      : kind === "secondary"
        ? variant === "light"
          ? "border-2 bg-white text-[#0F1E33] hover:bg-black/[0.03]"
          : "border-2 border-white/40 bg-white/10 text-white hover:bg-white/20"
        : variant === "light"
          ? "min-h-10 px-3 text-[15px] underline-offset-4 hover:underline"
          : "min-h-10 px-3 text-[15px] text-white/85 underline-offset-4 hover:underline";
  const style =
    kind === "primary"
      ? { backgroundColor: accent, "--tw-ring-color": accent }
      : kind === "secondary"
        ? { borderColor: `${accent}55`, color: variant === "light" ? "#0F1E33" : undefined }
        : { color: variant === "light" ? accent : undefined };
  const cls = `${base} ${look} ${className}`;

  if (cta.href) {
    return (
      <a
        href={cta.href}
        target="_blank"
        rel="noreferrer"
        className={cls}
        style={style as React.CSSProperties}
      >
        {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link
      to={cta.to ?? "/account"}
      params={cta.params as never}
      search={cta.search as never}
      hash={cta.hash}
      className={cls}
      style={style as React.CSSProperties}
    >
      {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/**
 * The single "what do I need to do next?" card at the top of the patient
 * dashboard. Every label comes from the shared journey resolver, so it can
 * never disagree with the server gates.
 */
export function NextActionCard({
  state,
  context,
  accent,
  variant = "light",
  action = resolveNextAction(state, context),
}: {
  state: JourneyState;
  context?: JourneyContext;
  accent: string;
  variant?: Variant;
  /** Pre-resolved action (lets the page share one resolution with the timeline). */
  action?: NextAction;
}) {
  const light = variant === "light";
  const meta = TONE_META[action.tone];
  const Icon = meta.icon;
  const toneColor = meta.color(accent);
  const isAction = action.tone === "action" || action.tone === "start";

  const heading = light ? "text-[#0F1E33]" : "text-white";
  const body = light ? "text-[#0F1E33]/75" : "text-white/80";
  const muted = light ? "text-[#0F1E33]/55" : "text-white/60";
  const surface = light ? "bg-[#F6F8FB]" : "bg-white/10";

  return (
    <section
      aria-labelledby="next-step-heading"
      className={
        light
          ? "overflow-hidden rounded-[1.5rem] bg-white shadow-[0_8px_30px_rgba(15,30,51,0.08)] ring-1 ring-black/5"
          : "overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/[0.06] backdrop-blur-xl"
      }
    >
      {/* Tone bar: instant visual difference between "do something" and "wait". */}
      <div className="h-2 w-full" style={{ backgroundColor: toneColor }} aria-hidden="true" />

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2
            id="next-step-heading"
            className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${heading}`}
          >
            Your next step
          </h2>
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-white"
            style={{ backgroundColor: toneColor }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.badge}
          </span>
        </div>

        <div className="mt-5 flex items-start gap-4">
          <span
            className="mt-0.5 hidden h-12 w-12 shrink-0 place-items-center rounded-2xl sm:grid"
            style={{ backgroundColor: `${toneColor}1A`, color: toneColor }}
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={`text-xl font-bold leading-snug sm:text-2xl ${heading}`}>
              {action.title}
            </h3>
            <p className={`mt-2 text-[16px] leading-relaxed ${body}`}>{action.body}</p>

            {action.when && (
              <div className={`mt-4 flex items-start gap-3 rounded-2xl p-4 ${surface}`}>
                <CalendarDays
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: accent }}
                  aria-hidden="true"
                />
                <div className="text-[16px]">
                  <p className={`font-bold ${heading}`}>
                    {action.when.date}
                    {action.when.time ? ` at ${action.when.time}` : ""}
                  </p>
                  <p className={muted}>
                    {action.when.mode} with {action.when.provider}
                  </p>
                </div>
              </div>
            )}

            {action.detail && (
              <figure
                className={`mt-4 rounded-2xl border-l-4 p-4 ${surface}`}
                style={{ borderColor: toneColor }}
              >
                <figcaption
                  className={`flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] ${muted}`}
                >
                  <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />{" "}
                  {action.detail.label}
                </figcaption>
                <blockquote
                  className={`mt-1.5 whitespace-pre-line break-words text-[16px] leading-relaxed ${heading}`}
                >
                  {action.detail.text}
                </blockquote>
              </figure>
            )}

            {(action.cta || action.secondary || action.choices?.length) && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {action.cta && (
                  <ActionButton
                    cta={action.cta}
                    accent={accent}
                    kind="primary"
                    variant={variant}
                    className="w-full sm:w-auto"
                  />
                )}
                {action.choices?.map((choice, i) => (
                  <ActionButton
                    key={choice.label}
                    cta={choice}
                    accent={accent}
                    kind={i === 0 ? "primary" : "secondary"}
                    variant={variant}
                    className="w-full sm:w-auto"
                  />
                ))}
                {action.secondary && (
                  <ActionButton
                    cta={action.secondary}
                    accent={accent}
                    kind={isAction ? "quiet" : "secondary"}
                    variant={variant}
                    className={isAction ? "self-start" : "w-full sm:w-auto"}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={`mt-6 flex items-start gap-3 border-t pt-5 ${light ? "border-black/5" : "border-white/10"}`}
        >
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <p className={`text-[15px] leading-relaxed ${body}`}>
            <span className={`font-bold ${heading}`}>What happens next: </span>
            {action.whatNext}
          </p>
        </div>
      </div>
    </section>
  );
}

/** One-line reminder shown above the secondary tabs so patients never lose the thread. */
export function NextStepStrip({
  action,
  accent,
  onBack,
}: {
  action: NextAction;
  accent: string;
  onBack: () => void;
}) {
  const meta = TONE_META[action.tone];
  const Icon = meta.icon;
  const toneColor = meta.color(accent);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white"
        style={{ backgroundColor: toneColor }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.badge}
      </span>
      <p className="min-w-0 flex-1 text-[15px] text-[#0F1E33]">
        <span className="font-bold">Your next step:</span> {action.title}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="text-[15px] font-semibold underline-offset-4 hover:underline"
        style={{ color: accent }}
      >
        Back to overview
      </button>
    </div>
  );
}

type ChecklistItem = { label: string; done: boolean; current: boolean; why?: string };

/** Prerequisite trail behind the current action — done, current, or locked. */
export function buildChecklist(state: JourneyState, ctx: JourneyContext = {}): ChecklistItem[] {
  const treatmentJourney = Boolean(ctx.productId) || state.eligibility.length > 0;
  const labs = labStatus(state, ctx.requiresLabs ?? true);
  const labsDone = labs === "verified" || labs === "results_received" || labs === "not_required";
  const onboarding = onboardingComplete(state);
  const consult = consultStatus(state, ctx.requiresConsult ?? treatmentJourney);
  const decision = treatmentStatus(state, ctx.productId);
  const med = medicationOrderStatus(state, ctx.productId);

  const items: ChecklistItem[] = [
    {
      label: "Blood work on file",
      done: labsDone,
      current: !labsDone,
      why: "Upload results or order a panel",
    },
  ];

  if (!treatmentJourney) return items;

  items.push(
    {
      label: "Medical profile complete",
      done: onboarding,
      current: labsDone && !onboarding,
      why: missingOnboarding(state).join(", ") || undefined,
    },
    {
      label: "Practitioner consultation",
      done: consult === "completed" || consult === "booked",
      current: labsDone && onboarding && consult === "available",
      why: "Unlocks once your profile is complete",
    },
    {
      label: "Practitioner decision",
      done: decision === "approved",
      current: decision === "pending_review" || decision === "more_information_required",
      why: "Made after your visit",
    },
    {
      label: "Order your medication",
      done: med !== "locked" && med !== "available_to_purchase",
      current: med === "available_to_purchase",
      why: "Unlocks once you're approved",
    },
  );

  return items;
}

export { Lock as ChecklistLockIcon };
export default NextActionCard;
