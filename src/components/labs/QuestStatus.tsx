import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { myLabFulfillments } from "@/lib/admin.functions";
import { markMyQuestDrawBooked, markMyQuestDrawCompleted } from "@/lib/quest.functions";
import { Button } from "@/components/ui/button";

type Fulfillment = {
  id: string;
  status: "awaiting_setup" | "ready" | "results_received";
  quest_reference: string | null;
  quest_link: string | null;
  admin_note: string | null;
  ready_at: string | null;
  draw_booked_at: string | null;
  draw_completed_at: string | null;
  created_at: string;
  orders: { order_number: string; created_at: string; status?: string } | null;
};

type Stage = "setup" | "ready" | "booked" | "drawn" | "results";

function stageOf(f: Fulfillment): Stage {
  if (f.status === "results_received") return "results";
  if (f.status === "awaiting_setup") return "setup";
  if (f.draw_completed_at) return "drawn";
  if (f.draw_booked_at) return "booked";
  return "ready";
}

const STAGE_LABEL: Record<Stage, string> = {
  setup: "Quest setup in progress",
  ready: "Ready to schedule",
  booked: "Appointment booked",
  drawn: "Report pending",
  results: "Results ready",
};

const STAGE_PROGRESS: Record<Stage, number> = {
  setup: 20,
  ready: 40,
  booked: 60,
  drawn: 80,
  results: 100,
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

/** Patient-facing Quest fulfillment tracker for purchased lab panels. */
export function QuestStatus({ onStep }: { onStep?: (step: number) => void }) {
  const load = useServerFn(myLabFulfillments);
  const markBooked = useServerFn(markMyQuestDrawBooked);
  const markDrawn = useServerFn(markMyQuestDrawCompleted);
  const [rows, setRows] = useState<Fulfillment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await load();
    const list = r.fulfillments as unknown as Fulfillment[];
    setRows(list);
    if (onStep && list.length) {
      const latest = list[0];
      onStep(latest.status === "awaiting_setup" ? 2 : latest.status === "ready" ? 3 : 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    void refresh().catch(() => setRows([]));
  }, [refresh]);

  async function confirm(id: string, kind: "booked" | "drawn") {
    setBusyId(id);
    setError(null);
    try {
      if (kind === "booked") await markBooked({ data: { fulfillmentId: id } });
      else await markDrawn({ data: { fulfillmentId: id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!rows) {
    return (
      <div className="grid min-h-40 place-items-center rounded-xl border border-[color:var(--pd-brand)]/10 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--pd-brand)]" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--pd-brand)]/20 bg-white px-5 py-12 text-center">
        <FlaskConical className="mx-auto h-8 w-8 text-[color:var(--pd-brand)]/50" />
        <h3 className="mt-3 font-semibold text-[color:var(--pd-deep)]">No lab orders yet</h3>
        <p className="mx-auto mt-1 max-w-md text-[15px] text-[color:var(--pd-deep)]/60">
          When you purchase a lab panel, its Quest scheduling and result updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[15px] font-bold uppercase text-[color:var(--pd-brand)]">
            Diagnostic history
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[color:var(--pd-deep)]">My lab testing</h2>
          <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/60">
            Quest scheduling, blood-draw updates, and reports in one place.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[color:var(--pd-brand)]/15 bg-white px-3 py-1.5 text-[15px] font-semibold text-[color:var(--pd-deep)]/70 shadow-sm">
          {rows.length} {rows.length === 1 ? "lab order" : "lab orders"}
        </span>
      </header>

      <ul className="space-y-4">
        {rows.map((f) => {
          const stage = stageOf(f);
          const busy = busyId === f.id;
          const completed = stage === "results";
          return (
            <li
              key={f.id}
              className="group rounded-xl border border-[color:var(--pd-brand)]/12 bg-white p-4 shadow-sm transition duration-200 hover:border-[color:var(--pd-brand)]/30 hover:shadow-md sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)] transition-colors group-hover:bg-[color:var(--pd-brand)] group-hover:text-primary-foreground">
                    {completed ? (
                      <FileCheck2 className="h-5 w-5" />
                    ) : (
                      <FlaskConical className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[color:var(--pd-deep)]">
                        {f.orders?.order_number ?? "Lab order"}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[15px] font-semibold ${
                          completed
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : stage === "setup"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-[color:var(--pd-brand)]/15 bg-[color:var(--pd-brand)]/8 text-[color:var(--pd-brand)]"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {STAGE_LABEL[stage]}
                      </span>
                    </div>
                    <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/55">
                      Quest Diagnostics · Ordered {formatDate(f.orders?.created_at ?? f.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-[color:var(--pd-brand)]/10 pt-3 min-[380px]:grid-cols-2 min-[380px]:gap-x-6 sm:min-w-64 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div>
                    <p className="text-[15px] font-bold uppercase text-[color:var(--pd-deep)]/45">
                      Blood draw
                    </p>
                    <p className="mt-0.5 text-[15px] font-medium text-[color:var(--pd-deep)]">
                      {formatDate(f.draw_completed_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold uppercase text-[color:var(--pd-deep)]/45">
                      Reference
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[15px] font-medium text-[color:var(--pd-deep)]">
                      {f.quest_reference ?? "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {!completed && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--pd-brand)]/10">
                    <div
                      className="h-full rounded-full bg-[color:var(--pd-brand)] transition-all"
                      style={{ width: `${STAGE_PROGRESS[stage]}%` }}
                    />
                  </div>
                </div>
              )}

              {stage === "setup" &&
                (f.orders?.status === "paid" ? (
                  <p className="mt-4 text-[15px] text-[color:var(--pd-deep)]/70">
                    Payment confirmed — we&apos;re entering your panel into Quest Diagnostics.
                    You&apos;ll get an email with your scheduling link, usually within 12 hours.
                  </p>
                ) : (
                  <p className="mt-4 text-[15px] text-[color:var(--pd-deep)]/70">
                    Payment is not confirmed yet. Quest setup starts after payment is confirmed — if
                    anything is still due, our care team will be in touch with instructions.
                  </p>
                ))}

              {(stage === "ready" || stage === "booked") && (
                <div className="mt-4 space-y-3 border-t border-[color:var(--pd-brand)]/10 pt-4 text-[15px] text-[color:var(--pd-deep)]/75">
                  {stage === "ready" ? (
                    <p>Book your blood draw at the Quest location that works best for you.</p>
                  ) : (
                    <p>
                      Thanks — we&apos;ve noted that you booked your appointment. Your appointment
                      itself is managed by Quest, so change or cancel it on the Quest website.
                    </p>
                  )}
                  {f.quest_reference && (
                    <p>
                      Confirmation code: <span className="font-semibold">{f.quest_reference}</span>
                    </p>
                  )}
                  {f.admin_note && (
                    <div className="rounded-lg bg-[color:var(--pd-brand)]/6 px-3 py-2.5">
                      <p className="text-[15px] font-semibold text-[color:var(--pd-deep)]">
                        Note from your care team
                      </p>
                      <p className="mt-0.5 text-[color:var(--pd-deep)]/65">{f.admin_note}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {f.quest_link && (
                      <Button
                        asChild
                        className="h-auto w-full whitespace-normal bg-[color:var(--pd-brand)] py-2.5 text-primary-foreground hover:opacity-90 sm:w-auto"
                      >
                        <a href={f.quest_link} target="_blank" rel="noreferrer">
                          <CalendarDays className="h-4 w-4" />
                          {stage === "ready" ? "Schedule at Quest" : "Manage at Quest"}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void confirm(f.id, stage === "ready" ? "booked" : "drawn")}
                       className="h-auto w-full whitespace-normal border-[color:var(--pd-brand)]/30 bg-white py-2.5 text-[color:var(--pd-brand)] hover:bg-[color:var(--pd-brand)]/8 hover:text-[color:var(--pd-brand)] sm:w-auto"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {stage === "ready"
                        ? "I've booked my Quest appointment"
                        : "I've completed my blood draw"}
                    </Button>
                  </div>
                  <p className="text-[15px] text-[color:var(--pd-deep)]/50">
                    This just tells us where you are so we can track your progress — we don&apos;t
                    check Quest&apos;s calendar for you.
                  </p>
                </div>
              )}

              {stage === "drawn" && (
                <p className="mt-4 text-[15px] text-[color:var(--pd-deep)]/70">
                  Nothing needed from you right now. Quest usually returns results in 2–5 business
                  days, and they&apos;ll show up here as soon as they arrive.
                </p>
              )}

              {stage === "results" && (
                <p className="mt-4 border-t border-[color:var(--pd-brand)]/10 pt-4 text-[15px] text-[color:var(--pd-deep)]/70">
                  Your results are in. The next step is a short review with a practitioner.
                </p>
              )}

              {error && busyId === null && (
                <p className="mt-3 text-[15px] font-semibold text-destructive">{error}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default QuestStatus;
