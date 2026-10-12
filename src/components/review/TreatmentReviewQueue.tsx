import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HelpCircle,
  Loader2,
  Microscope,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  decideApproval,
  reviewQueue,
  type ReviewQueueRow,
  type UpcomingReviewRow,
} from "@/lib/review.functions";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Step 6 of the six-step process, practitioner side: approve or deny the
 * controlled-substance order after the lab review call.
 */
export function TreatmentReviewQueue() {
  const load = useServerFn(reviewQueue);
  const decide = useServerFn(decideApproval);

  const [rows, setRows] = useState<ReviewQueueRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingReviewRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.queue as ReviewQueueRow[]);
      setUpcoming((res as { upcoming?: UpcomingReviewRow[] }).upcoming ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recency = (r: ReviewQueueRow) =>
    new Date(r.decided_at ?? r.updated_at ?? r.created_at).getTime();
  const byNewest = (a: ReviewQueueRow, b: ReviewQueueRow) => recency(b) - recency(a);
  const pending = rows.filter((r) => r.status === "pending").sort(byNewest);
  const decided = rows.filter((r) => r.status !== "pending").sort(byNewest);

  useEffect(() => {
    if (pending.length === 0) {
      setOpenReviewId(null);
      return;
    }

    if (!openReviewId || !pending.some((row) => row.id === openReviewId)) {
      setOpenReviewId(pending[0].id);
    }
  }, [openReviewId, pending]);

  const submit = async (row: ReviewQueueRow, decision: "approved" | "denied" | "more_info") => {
    setBusy(row.id);
    setError(null);
    try {
      await decide({ data: { approvalId: row.id, decision, note: notes[row.id] } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that decision.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <p className="mt-3 flex items-center gap-2 text-[15px] opacity-65">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading treatment reviews…
      </p>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-7">
      {/* Queue header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-provider-border pb-4">
        <div>
          <p className="font-provider-display text-lg font-semibold text-provider-ink">Clinical review queue</p>
          <p className="mt-1 text-sm text-provider-muted">
            {pending.length > 0
              ? `${pending.length} treatment ${pending.length === 1 ? "request needs" : "requests need"} a decision`
              : "All treatment requests have been reviewed"}
          </p>
        </div>
        <span className="rounded-full border border-provider-accent/20 bg-provider-accent-soft px-3 py-1 text-xs font-semibold text-provider-deep">
          {pending.length} pending · newest first
        </span>
      </div>

      {error && <p className="mt-3 text-[15px] font-semibold text-red-600">{error}</p>}

      {pending.length === 0 ? (
        <div className="rounded-lg border border-provider-border bg-provider-surface px-5 py-8 text-center shadow-provider-soft">
          <CheckCircle2 className="mx-auto h-6 w-6 text-provider-accent" />
          <p className="mt-2 font-semibold text-provider-ink">No reviews waiting</p>
          <p className="mt-1 text-sm text-provider-muted">New treatment requests will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((row) => {
            const treatmentLabel = row.items.length
              ? row.items
                  .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
                  .join(", ")
              : (row.productName ?? "Treatment request");
            const isOpen = openReviewId === row.id;
            return (
              <li
                key={row.id}
                className={`overflow-hidden rounded-lg border bg-provider-surface shadow-provider-soft transition-colors ${
                  isOpen ? "border-provider-accent/45" : "border-provider-border"
                }`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  aria-expanded={isOpen}
                  onClick={() => setOpenReviewId(isOpen ? null : row.id)}
                  className="h-auto w-full justify-start rounded-none px-4 py-4 text-left hover:bg-provider-canvas sm:px-5"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-provider-accent-soft font-provider-display text-sm font-semibold text-provider-deep">
                      {(row.patient.name ?? row.patient.email ?? "P").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-provider-display text-base font-semibold text-provider-ink">
                        {row.patient.name ?? "Patient"}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-normal text-provider-muted">
                        {treatmentLabel}
                      </span>
                    </span>
                  </span>
                  <span className="ml-3 hidden shrink-0 text-right sm:block">
                    <span className="block text-xs font-semibold uppercase text-provider-muted">
                      {row.orderId ? "Order" : "Stage"}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-provider-ink">
                      {row.orderId ? `${row.orderNumber} · ${money(row.totalCents)}` : "Pre-purchase"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`ml-3 h-5 w-5 shrink-0 text-provider-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {isOpen && (
                  <div className="border-t border-provider-border px-4 pb-5 pt-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-provider-muted">{row.patient.email}</p>
                        <div className="mt-2 inline-flex rounded-md bg-provider-accent-soft px-2.5 py-1 text-xs font-semibold text-provider-deep">
                          {treatmentLabel}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold uppercase text-provider-muted">
                          {row.orderId ? "Order" : "Stage"}
                        </span>
                        <p className="text-sm font-medium text-provider-ink">
                          {row.orderId
                            ? `${row.orderNumber} · ${money(row.totalCents)}`
                            : "Pre-purchase eligibility"}
                        </p>
                      </div>
                    </div>

                    {/* Prerequisite chips */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        ["Intake", row.prerequisites.intake],
                        ["Photo ID", row.prerequisites.photoId],
                        ["Consents", row.prerequisites.consents],
                        ["Labs verified", row.prerequisites.labsVerified],
                      ].map(([label, complete]) => (
                        <span
                          key={String(label)}
                          className="flex items-center rounded-full border border-provider-border bg-provider-canvas px-3 py-1.5"
                        >
                          <span
                            className={`mr-2 h-1.5 w-1.5 rounded-full ${
                              complete ? "bg-provider-accent" : "bg-muted-foreground/40"
                            }`}
                          />
                          <span className={`text-xs font-medium ${complete ? "text-provider-ink" : "text-provider-muted"}`}>
                            {String(label)}
                          </span>
                        </span>
                      ))}
                    </div>

                    {row.patient_message && (
                      <div className="mt-4 rounded-md border border-provider-accent/15 bg-provider-accent-soft/50 px-3 py-2.5 text-sm text-provider-ink">
                        <span className="font-semibold">Patient reply:</span> “{row.patient_message}”
                      </div>
                    )}

                    {/* Lab review strip */}
                    <div className="mt-4 flex items-start gap-2 rounded-md border border-provider-border bg-provider-canvas px-3 py-3 text-sm text-provider-ink/80">
                      <Microscope className="mt-0.5 h-4 w-4 shrink-0 text-provider-accent" />
                      <span>
                        {row.reviewAppointment
                          ? `Lab review ${new Date(`${row.reviewAppointment.date}T00:00:00`).toLocaleDateString()} · ${row.reviewAppointment.mode} with ${row.reviewAppointment.providerName}`
                          : "No lab review booked yet"}
                        {row.labsReceived ? <strong> · Quest results received</strong> : ""}
                      </span>
                    </div>

                    {/* Note to patient */}
                    <div className="mt-4">
                      <label htmlFor={`note-${row.id}`} className="mb-2 block text-xs font-semibold uppercase text-provider-muted">
                        Note to patient
                      </label>
                      <textarea
                        id={`note-${row.id}`}
                        rows={2}
                        value={notes[row.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                        placeholder="Add guidance or next steps — required to deny or request more information…"
                        className="w-full resize-none rounded-md border border-provider-border bg-provider-canvas p-3 text-sm text-provider-ink transition-colors placeholder:text-provider-muted focus:border-provider-accent focus:outline-none focus:ring-2 focus:ring-provider-accent/20"
                      />
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-provider-border pt-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button
                          onClick={() => submit(row, "denied")}
                          disabled={busy === row.id}
                          variant="outline"
                          className="border-destructive/25 bg-provider-surface text-destructive hover:bg-destructive/5 hover:text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Deny
                        </Button>
                        <Button
                          onClick={() => submit(row, "more_info")}
                          disabled={busy === row.id}
                          variant="outline"
                          className="border-provider-border bg-provider-surface text-provider-ink hover:bg-provider-canvas hover:text-provider-ink"
                        >
                          <HelpCircle className="mr-2 h-4 w-4" /> Request more info
                        </Button>
                      </div>
                      <Button
                        onClick={() => submit(row, "approved")}
                        disabled={busy === row.id}
                        className="w-full bg-provider-accent px-6 text-provider-accent-foreground hover:bg-provider-deep md:w-auto"
                      >
                        {busy === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Approve treatment
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {upcoming.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-provider-border bg-provider-surface shadow-provider-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-provider-border px-4 py-3.5 sm:px-5">
            <p className="flex items-center gap-2 font-provider-display text-base font-semibold text-provider-ink">
              <CalendarClock className="h-4 w-4 text-provider-accent" /> Reviews booked
            </p>
            <span className="max-w-28 text-right text-xs text-provider-muted sm:max-w-none sm:text-sm">Order not placed yet</span>
          </div>
          <ul className="divide-y divide-provider-border">
            {upcoming.map((row) => {
              const appointment = row.appointment;
              if (!appointment) return null;
              return (
                <li key={row.userId} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-provider-ink">{row.patient.name ?? "Patient"}</p>
                    <p className="truncate text-sm text-provider-muted">{row.patient.email}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-provider-ink sm:justify-end">
                      <Clock3 className="h-3.5 w-3.5 text-provider-accent" />
                      {new Date(`${appointment.date}T00:00:00`).toLocaleDateString()} · {appointment.start.slice(0, 5)}
                    </p>
                    <p className="mt-0.5 text-sm text-provider-muted">
                      {row.appointmentType === "treatment_approval" ? "Treatment review" : "Lab review"} · {appointment.mode} with {appointment.providerName}
                      {row.labsReceived ? " · Results received" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {decided.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-provider-border bg-provider-surface shadow-provider-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-provider-border px-4 py-3.5 sm:px-5">
            <p className="flex items-center gap-2 font-provider-display text-base font-semibold text-provider-ink">
              <Stethoscope className="h-4 w-4 text-provider-accent" /> Recent decisions
            </p>
            <span className="text-sm text-provider-muted">Latest 10</span>
          </div>
          <ul className="divide-y divide-provider-border">
            {decided.slice(0, 10).map((row) => (
              <li key={row.id} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-provider-ink">
                    {row.productName ?? row.items[0]?.name ?? "Treatment eligibility"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-provider-muted">
                    {row.patient.name ?? row.patient.email}
                    {row.orderId ? ` · ${row.orderNumber}` : ""}
                    {row.provider_note ? ` · “${row.provider_note}”` : ""}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                    row.status === "approved"
                      ? "border-provider-accent/20 bg-provider-accent-soft text-provider-deep"
                      : row.status === "more_info"
                        ? "border-provider-border bg-provider-canvas text-provider-muted"
                        : "border-destructive/20 bg-destructive/5 text-destructive"
                  }`}
                >
                  {row.status === "more_info" ? "More info" : row.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default TreatmentReviewQueue;
