import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Search,
  Send,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveLabPanelOrder,
  labPanelReportUrl,
  listLabPanelPurchases,
  markOrderPaid,
  markQuestReady,
  type LabPanelPurchaseRow,
} from "@/lib/admin.functions";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

type Stage = "setup" | "waiting" | "report" | "done";

function stageOf(row: LabPanelPurchaseRow): Stage {
  if (row.labStatus === "results_received") return "done";
  if (row.labStatus === "awaiting_setup") return "setup";
  return row.drawCompletedAt ? "report" : "waiting";
}

const STAGE_META: Record<Stage, { label: string; className: string }> = {
  setup: { label: "Needs Quest details", className: "bg-amber-100 text-amber-800" },
  waiting: { label: "Waiting on patient draw", className: "bg-sky-100 text-sky-800" },
  report: { label: "Needs report", className: "bg-amber-100 text-amber-800" },
  done: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
};

type Filter = "all" | "pending" | "completed";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Lab panel orders, listed like a shop order table. The flow is staged:
 * 1) staff send the Quest scheduling details, 2) the patient confirms their
 * blood draw in their portal, 3) staff upload the report and approve.
 */
export function LabPanelPurchases({ onChanged }: { onChanged?: () => void }) {
  const load = useServerFn(listLabPanelPurchases);
  const approve = useServerFn(approveLabPanelOrder);
  const signReport = useServerFn(labPanelReportUrl);
  const release = useServerFn(markQuestReady);
  const payOrder = useServerFn(markOrderPaid);

  const [rows, setRows] = useState<LabPanelPurchaseRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [questNotes, setQuestNotes] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setRows(res.purchases as LabPanelPurchaseRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load lab panel orders.");
      setRows([]);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-[15px] text-admin-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading lab panel orders…
      </p>
    );
  }

  const pendingCount = rows.filter((r) => !r.approved).length;
  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "pending" && r.approved) return false;
    if (filter === "completed" && !r.approved) return false;
    if (!q) return true;
    return [r.orderNumber, r.patient.name, r.patient.email, ...r.panels.map((p) => p.name)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const openReport = async (documentId: string) => {
    try {
      const { url } = await signReport({ data: { documentId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that report.");
    }
  };

  const sendQuestDetails = async (row: LabPanelPurchaseRow) => {
    const questLink = (links[row.fulfillmentId] ?? "").trim();
    const questReference = (codes[row.fulfillmentId] ?? "").trim();
    if (!questLink && !questReference) {
      setError("Add a Quest scheduling link or a confirmation code first.");
      return;
    }
    setBusy(row.fulfillmentId);
    setError(null);
    try {
      if (row.orderStatus === "pending_payment") {
        await payOrder({ data: { orderId: row.orderId } });
      }
      await release({
        data: {
          fulfillmentId: row.fulfillmentId,
          questLink,
          questReference,
          note: questNotes[row.fulfillmentId] ?? "",
        },
      });
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the Quest details.");
    } finally {
      setBusy(null);
    }
  };

  const submitApproval = async (row: LabPanelPurchaseRow) => {
    const file = files[row.fulfillmentId];
    if (!file) {
      setError("Attach the lab report PDF before approving this order.");
      return;
    }
    setBusy(row.fulfillmentId);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(file);
      await approve({
        data: {
          fulfillmentId: row.fulfillmentId,
          fileName: file.name,
          contentType: file.type || "application/pdf",
          dataBase64,
          note: notes[row.fulfillmentId] ?? "",
        },
      });
      setFiles((f) => ({ ...f, [row.fulfillmentId]: null }));
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve that order.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
       <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] sm:items-center">
         <div className="grid grid-cols-3 rounded-lg border border-admin-border bg-admin-canvas p-1 sm:flex">
          {(
            [
              ["all", `All (${rows.length})`],
              ["pending", `Open (${pendingCount})`],
              ["completed", `Completed (${rows.length - pendingCount})`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
             className={`min-w-0 rounded-md px-2 py-1.5 text-[12px] font-semibold transition sm:px-3 sm:text-[13px] ${
                filter === key
                  ? "bg-admin-surface text-admin-ink shadow-admin-soft"
                  : "text-admin-muted hover:text-admin-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
         <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, patient or panel"
            className="h-9 pl-9 text-[14px]"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-[14px] font-semibold text-red-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-admin-border">
        <div className="hidden grid-cols-[1.1fr_1.6fr_1.6fr_0.8fr_1fr_auto] gap-3 bg-admin-canvas px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-admin-muted lg:grid">
          <span>Order</span>
          <span>Patient</span>
          <span>Panel</span>
          <span>Total</span>
          <span>Status</span>
          <span className="w-24 text-right">Action</span>
        </div>

        {visible.length === 0 ? (
          <p className="bg-admin-surface px-4 py-8 text-center text-[15px] text-admin-muted">
            No lab panel orders here yet.
          </p>
        ) : (
          <ul className="divide-y divide-admin-border bg-admin-surface">
            {visible.map((row) => {
              const open = openId === row.fulfillmentId;
              const stage = stageOf(row);
              const meta = STAGE_META[stage];
              return (
                <li key={row.fulfillmentId}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.fulfillmentId)}
                    aria-expanded={open}
                     className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 text-left transition hover:bg-admin-canvas/60 lg:grid-cols-[1.1fr_1.6fr_1.6fr_0.8fr_1fr_auto] lg:items-center lg:gap-3"
                  >
                    <span className="text-[14px] font-bold">
                      #{row.orderNumber}
                      <span className="ml-2 block text-[12px] font-medium text-admin-muted lg:mt-0.5">
                        {when(row.createdAt)}
                      </span>
                    </span>
                     <span className="col-span-2 min-w-0 text-[14px] lg:col-auto">
                      <span className="block truncate font-semibold">
                        {row.patient.name ?? "Patient"}
                      </span>
                      <span className="block truncate text-[12px] text-admin-muted">
                        {row.patient.email}
                      </span>
                    </span>
                     <span className="col-span-2 min-w-0 truncate text-[14px] text-admin-muted lg:col-auto">
                      {row.panels
                        .map((p) => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name))
                        .join(", ") || "Lab panel"}
                    </span>
                    <span className="text-[14px] font-semibold">{money(row.totalCents)}</span>
                     <span className="col-start-1 lg:col-auto">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </span>
                     <span className="col-start-2 row-start-1 flex w-24 items-center justify-end gap-2 text-[13px] font-semibold text-admin-muted lg:col-auto lg:row-auto">
                      {row.report && <Paperclip className="h-3.5 w-3.5" />}
                      {open ? "Close" : "Details"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-admin-border bg-admin-canvas/50 px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
                          <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                            Order details
                          </p>
                          <dl className="mt-2 space-y-1.5 text-[14px]">
                            <div className="flex justify-between gap-3">
                              <dt className="text-admin-muted">Order</dt>
                              <dd className="font-semibold">#{row.orderNumber}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-admin-muted">Placed</dt>
                              <dd>{when(row.createdAt)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-admin-muted">Payment</dt>
                              <dd className="capitalize">{row.orderStatus.replace(/_/g, " ")}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-admin-muted">Total</dt>
                              <dd className="font-semibold">{money(row.totalCents)}</dd>
                            </div>
                            {row.questReference && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-admin-muted">Quest code</dt>
                                <dd className="font-semibold">{row.questReference}</dd>
                              </div>
                            )}
                            {row.drawBookedAt && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-admin-muted">Draw booked</dt>
                                <dd>{when(row.drawBookedAt)}</dd>
                              </div>
                            )}
                            {row.drawCompletedAt && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-admin-muted">Draw done</dt>
                                <dd>{when(row.drawCompletedAt)}</dd>
                              </div>
                            )}
                            {row.forProductId && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-admin-muted">For treatment</dt>
                                <dd className="text-right">{row.forProductId}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="rounded-lg border border-admin-border bg-admin-surface p-4">
                          {stage === "setup" && (
                            <>
                              <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                                Step 1 — Send Quest details
                              </p>
                              <p className="mt-2 text-[14px] text-admin-muted">
                                Enter the panel with Quest, then send the patient their scheduling
                                link and confirmation code. They'll see it in their portal and by
                                email.
                              </p>
                              <Input
                                value={links[row.fulfillmentId] ?? ""}
                                onChange={(e) =>
                                  setLinks((l) => ({ ...l, [row.fulfillmentId]: e.target.value }))
                                }
                                placeholder="Quest scheduling link (optional)"
                                className="mt-3 h-9 text-[14px]"
                              />
                              <Input
                                value={codes[row.fulfillmentId] ?? ""}
                                onChange={(e) =>
                                  setCodes((c) => ({ ...c, [row.fulfillmentId]: e.target.value }))
                                }
                                placeholder="Confirmation / requisition code"
                                className="mt-2 h-9 text-[14px]"
                              />
                              <Input
                                value={questNotes[row.fulfillmentId] ?? ""}
                                onChange={(e) =>
                                  setQuestNotes((n) => ({
                                    ...n,
                                    [row.fulfillmentId]: e.target.value,
                                  }))
                                }
                                placeholder="Note for the patient (optional)"
                                className="mt-2 h-9 text-[14px]"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy === row.fulfillmentId}
                                className="mt-3 bg-admin-accent text-admin-accent-foreground hover:opacity-90"
                                onClick={() => void sendQuestDetails(row)}
                              >
                                {busy === row.fulfillmentId ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-4 w-4" />
                                )}
                                Send to patient
                              </Button>
                            </>
                          )}

                          {stage === "waiting" && (
                            <>
                              <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                                Step 2 — Waiting on the patient
                              </p>
                              <p className="mt-2 text-[14px] text-admin-muted">
                                Quest details were sent
                                {row.questReference ? ` (code ${row.questReference})` : ""}.
                                {row.drawBookedAt
                                  ? " The patient says their appointment is booked."
                                  : " They haven't confirmed their appointment yet."}{" "}
                                As soon as they confirm their blood draw in their portal, the report
                                upload opens here.
                              </p>
                              {row.questLink && (
                                <a
                                  href={row.questLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-block text-[13px] font-semibold text-admin-accent underline"
                                >
                                  Open the scheduling link
                                </a>
                              )}
                            </>
                          )}

                          {stage === "report" && (
                            <>
                              <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                                Step 3 — Upload the report
                              </p>
                              <p className="mt-2 text-[14px] text-admin-muted">
                                The patient confirmed their blood draw on{" "}
                                {when(row.drawCompletedAt!)}. Attach their results (PDF, JPG or
                                PNG) — the patient can read it in their portal and practitioners can
                                open it during review.
                              </p>
                              <input
                                ref={(el) => {
                                  inputs.current[row.fulfillmentId] = el;
                                }}
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                  setFiles((f) => ({
                                    ...f,
                                    [row.fulfillmentId]: e.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-admin-border bg-admin-surface text-admin-ink"
                                  onClick={() => inputs.current[row.fulfillmentId]?.click()}
                                >
                                  <Upload className="mr-2 h-4 w-4" /> Choose report
                                </Button>
                                <span className="text-[13px] text-admin-muted">
                                  {files[row.fulfillmentId]?.name ?? "No file chosen"}
                                </span>
                              </div>
                              <Input
                                value={notes[row.fulfillmentId] ?? ""}
                                onChange={(e) =>
                                  setNotes((n) => ({ ...n, [row.fulfillmentId]: e.target.value }))
                                }
                                placeholder="Optional note for the patient"
                                className="mt-3 h-9 text-[14px]"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy === row.fulfillmentId}
                                className="mt-3 bg-admin-accent text-admin-accent-foreground hover:opacity-90"
                                onClick={() => void submitApproval(row)}
                              >
                                {busy === row.fulfillmentId ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Upload report & approve
                              </Button>
                            </>
                          )}

                          {stage === "done" && (
                            <>
                              <p className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">
                                Lab report
                              </p>
                              {row.report ? (
                                <div className="mt-2">
                                  <p className="text-[14px]">
                                    Uploaded {when(row.report.createdAt)} — the patient can read it
                                    in their portal and practitioners can open it during review.
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="mt-3 border-admin-border bg-admin-surface text-admin-ink"
                                    onClick={() => void openReport(row.report!.id)}
                                  >
                                    <FileText className="mr-2 h-4 w-4" /> {row.report.fileName}
                                  </Button>
                                </div>
                              ) : (
                                <p className="mt-2 text-[14px] text-admin-muted">
                                  This panel was completed before reports were required, so no file
                                  is on record.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LabPanelPurchases;
