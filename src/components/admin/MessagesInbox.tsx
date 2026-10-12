import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  staffThreads,
  staffThread,
  staffReply,
  type CareMessage,
  type StaffThreadSummary,
} from "@/lib/messages.functions";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  accent?: string;
}

/** Async patient inbox shared by the admin and practitioner portals. */
export function MessagesInbox({ accent }: Props) {
  const loadThreads = useServerFn(staffThreads);
  const loadThread = useServerFn(staffThread);
  const reply = useServerFn(staffReply);

  const [threads, setThreads] = useState<StaffThreadSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [patient, setPatient] = useState<{ name: string | null; email: string | null } | null>(
    null,
  );
  const [messages, setMessages] = useState<CareMessage[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshThreads = useCallback(async () => {
    try {
      const res = await loadThreads();
      setThreads(res.threads);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load patient messages.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  const openThread = useCallback(
    async (patientId: string) => {
      setSelected(patientId);
      setMessages(null);
      try {
        const res = await loadThread({ data: { patientId } });
        setPatient(res.patient);
        setMessages(res.messages);
        void refreshThreads();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open this conversation.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshThreads],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setError(null);
    try {
      await reply({ data: { patientId: selected, body: text } });
      setBody("");
      await openThread(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your reply didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="min-w-0 rounded-lg border border-provider-border bg-provider-surface p-3 shadow-provider-soft sm:p-6">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Patient messages</h2>
          <p className="text-xs text-[#0B2545]/60">
            Async inbox. Replies appear in the patient portal right away.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshThreads()}
          className="border-provider-border bg-provider-surface text-provider-deep hover:bg-provider-accent-soft hover:text-provider-deep"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="grid min-w-0 gap-4 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className={`${selected ? "hidden md:block" : "block"} max-h-[min(520px,65dvh)] space-y-2 overflow-y-auto rounded-lg bg-provider-canvas p-2`}>
          {threads === null ? (
            <p className="flex items-center gap-2 p-3 text-sm text-[#0B2545]/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : threads.length === 0 ? (
            <p className="p-3 text-sm text-[#0B2545]/60">No patient messages yet.</p>
          ) : (
            threads.map((t) => {
              const active = t.patientId === selected;
              return (
                <button
                  key={t.patientId}
                  type="button"
                  onClick={() => void openThread(t.patientId)}
                    className={`w-full rounded-lg p-3 text-left transition ${
                    active
                       ? accent ? "text-primary-foreground shadow-provider-soft" : "bg-provider-accent text-provider-accent-foreground shadow-provider-soft"
                       : "bg-provider-surface text-provider-ink ring-1 ring-provider-border hover:bg-provider-accent-soft"
                  }`}
                    style={active && accent ? { backgroundColor: accent } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {t.name || t.email || "Patient"}
                    </span>
                    {t.unread ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          active ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {t.unread} new
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`truncate text-xs ${active ? "text-white/80" : "text-[#0B2545]/60"}`}
                  >
                    {t.lastSender === "staff" ? "You: " : ""}
                    {t.lastBody}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${active ? "text-white/70" : "text-[#0B2545]/45"}`}
                  >
                    {when(t.lastAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className={`${selected ? "block" : "hidden md:block"} min-w-0 rounded-lg bg-provider-canvas p-3`}>
          {!selected ? (
            <p className="p-6 text-center text-sm text-[#0B2545]/60">
              Select a patient to read and reply to their messages.
            </p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-black/5 pb-2 md:block">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  className="text-provider-muted md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                <p className="text-sm font-semibold">{patient?.name || "Patient"}</p>
                <p className="truncate text-xs text-[#0B2545]/55">{patient?.email}</p>
                </div>
              </div>
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {messages === null ? (
                  <p className="flex items-center gap-2 text-sm text-[#0B2545]/60">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
                  </p>
                ) : (
                  messages.map((m) => {
                    const staff = m.senderRole === "staff";
                    return (
                      <div key={m.id} className={`flex ${staff ? "justify-end" : "justify-start"}`}>
                        <div
                           className={`max-w-[90%] break-words rounded-lg px-3 py-2 text-sm sm:max-w-[85%] ${
                            staff ? accent ? "text-primary-foreground" : "bg-provider-accent text-provider-accent-foreground" : "bg-provider-surface ring-1 ring-provider-border"
                          }`}
                          style={staff && accent ? { backgroundColor: accent } : undefined}
                        >
                          <p
                            className={`text-[11px] font-bold ${staff ? "text-white/80" : "opacity-60"}`}
                          >
                            {staff ? "Care team" : "Patient"} · {when(m.createdAt)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={submit} className="mt-3">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 5000))}
                  rows={3}
                  placeholder="Write a reply…"
                  className="w-full rounded-lg border-provider-border bg-provider-surface p-3 text-sm outline-none focus-visible:ring-provider-accent"
                />
                <Button
                  type="submit"
                  disabled={!body.trim() || sending}
                  className={accent ? "mt-2 text-primary-foreground hover:opacity-90" : "mt-2 bg-provider-accent text-provider-accent-foreground hover:bg-provider-deep"}
                  style={accent ? { backgroundColor: accent } : undefined}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send reply
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
