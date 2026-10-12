import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Check,
  FileText,
  FlaskConical,
  Package,
  Stethoscope,
} from "lucide-react";
import type { ActiveCareItem, TimelineStep } from "@/lib/journey";

const DONE_GREEN = "#1F9254";
const BLOCKED_AMBER = "#B45309";

/**
 * Compact progress trail under the "Your next step" card. Vertical on phones,
 * horizontal from `sm` up. Completed steps get check marks, the current step
 * is called out, upcoming steps are subdued.
 */
export function ProgressTimeline({ steps, accent }: { steps: TimelineStep[]; accent: string }) {
  const done = steps.filter((s) => s.state === "done").length;
  const currentIdx = steps.findIndex((s) => s.state === "current" || s.state === "blocked");
  const total = steps.length;

  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-heading" className="text-lg font-bold tracking-tight text-[#0F1E33]">
          Your progress
        </h2>
        <p className="text-[15px] text-[#0F1E33]/60">
          {done === total
            ? "All steps complete"
            : currentIdx >= 0
              ? `Step ${currentIdx + 1} of ${total}`
              : `${done} of ${total} complete`}
        </p>
      </div>

      <ol className="mt-5 flex flex-col gap-0 sm:grid sm:auto-cols-fr sm:grid-flow-col sm:gap-2">
        {steps.map((s, i) => {
          const isLast = i === total - 1;
          const isDone = s.state === "done";
          const isCurrent = s.state === "current";
          const isBlocked = s.state === "blocked";
          const circleStyle: React.CSSProperties = isDone
            ? { backgroundColor: DONE_GREEN, color: "#fff" }
            : isBlocked
              ? { backgroundColor: BLOCKED_AMBER, color: "#fff" }
              : isCurrent
                ? { backgroundColor: "#fff", color: accent, boxShadow: `0 0 0 3px ${accent}` }
                : { backgroundColor: "#E6EAF0", color: "#6B7A90" };
          return (
            <li
              key={s.key}
              aria-current={isCurrent || isBlocked ? "step" : undefined}
              className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center"
            >
              {/* Connector: vertical on phones, horizontal on larger screens. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 sm:hidden"
                  style={{ backgroundColor: isDone ? DONE_GREEN : "#E6EAF0" }}
                />
              )}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1/2 top-4 hidden h-0.5 w-[calc(100%-2rem)] translate-x-[-1rem] sm:block"
                  style={{
                    backgroundColor: isDone || isCurrent || isBlocked ? DONE_GREEN : "#E6EAF0",
                  }}
                />
              )}
              <span
                className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold"
                style={circleStyle}
              >
                {isDone ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : isBlocked ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <div className={`min-w-0 pb-5 sm:pb-0 ${isLast ? "pb-0" : ""}`}>
                <p
                  className={`text-[15px] leading-snug ${
                    isCurrent || isBlocked
                      ? "font-bold text-[#0F1E33]"
                      : isDone
                        ? "font-semibold text-[#0F1E33]/80"
                        : "text-[#0F1E33]/45"
                  }`}
                >
                  {s.label}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold uppercase tracking-[0.1em]">
                  {isDone ? (
                    <span style={{ color: DONE_GREEN }}>Done</span>
                  ) : isCurrent ? (
                    <span style={{ color: accent }}>You are here</span>
                  ) : isBlocked ? (
                    <span style={{ color: BLOCKED_AMBER }}>Needs attention</span>
                  ) : (
                    <span className="text-[#0F1E33]/35">Up next</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const KIND_ICON = {
  lab: FlaskConical,
  upload: FileText,
  appointment: CalendarCheck,
  treatment: Stethoscope,
  order: Package,
} as const;

/** The 1–3 things the patient is working on right now — never the whole history. */
export function ActiveCareList({ items, accent }: { items: ActiveCareItem[]; accent: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="active-care-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="active-care-heading" className="text-lg font-bold tracking-tight text-[#0F1E33]">
          What you're working on
        </h2>
        <Link
          to="/account/orders"
          className="text-[15px] font-semibold underline-offset-4 hover:underline"
          style={{ color: accent }}
        >
          Full history
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          return (
            <li
              key={item.key}
              className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              style={item.needsAction ? { boxShadow: `inset 0 0 0 2px ${accent}` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${accent}1A`, color: accent }}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.1em]"
                  style={
                    item.needsAction
                      ? { backgroundColor: accent, color: "#fff" }
                      : { backgroundColor: "#EEF2F7", color: "#3D4C63" }
                  }
                >
                  {item.needsAction ? "Action needed" : item.status}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-[16px] font-bold leading-snug text-[#0F1E33]">
                {item.title}
              </p>
              {item.needsAction && (
                <p className="mt-0.5 text-[15px] text-[#0F1E33]/70">{item.status}</p>
              )}
              {item.meta && <p className="mt-0.5 text-[14px] text-[#0F1E33]/55">{item.meta}</p>}
              {item.link && (
                <div className="mt-auto pt-3">
                  <Link
                    to={item.link.to ?? "/account"}
                    params={item.link.params as never}
                    search={item.link.search as never}
                    hash={item.link.hash}
                    className="inline-flex items-center gap-1 text-[15px] font-semibold underline-offset-4 hover:underline"
                    style={{ color: accent }}
                  >
                    {item.link.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
