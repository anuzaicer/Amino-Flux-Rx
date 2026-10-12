import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { myMessages, sendMyMessage, type CareMessage } from "@/lib/messages.functions";

const MAX = 5000;

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  accent?: string;
  onRead?: () => void;
}

/** Simple async inbox between the patient and the care team. */
export function MessagesPanel({ accent = "#2173D1", onRead }: Props) {
  const load = useServerFn(myMessages);
  const send = useServerFn(sendMyMessage);

  const [messages, setMessages] = useState<CareMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load();
      setMessages(res.messages);
      setError(null);
      onRead?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your messages.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      await send({ data: { body: text } });
      setBody("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your message didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
      <h2 className="text-[19px] font-bold">Messages with your care team</h2>
      <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/65">
        Replies are not instant — we usually answer within one business day. This inbox is not for
        emergencies. If you have a medical emergency, call 911 or your local emergency number.
      </p>

      <div className="mt-5 max-h-[min(420px,55dvh)] space-y-3 overflow-y-auto rounded-xl bg-[#F4F6F9] p-3 sm:p-4">
        {messages === null ? (
          <p className="flex items-center gap-2 py-6 text-[15px] text-[color:var(--pd-deep)]/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your messages…
          </p>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare
              className="mx-auto h-6 w-6"
              style={{ color: accent }}
              aria-hidden="true"
            />
            <p className="mt-2 text-[15px] font-semibold">No messages yet</p>
            <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/60">
              Ask us anything about your labs, your visit or your order. We'll reply here.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === "patient";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                   className={`max-w-[92%] break-words rounded-2xl px-3 py-3 text-[15px] sm:max-w-[85%] sm:px-4 ${
                    mine ? "text-white" : "bg-white ring-1 ring-black/5"
                  }`}
                  style={mine ? { backgroundColor: accent } : undefined}
                >
                  <p className={`text-[12px] font-bold ${mine ? "text-white/80" : "opacity-60"}`}>
                    {mine ? "You" : "Care team"} · {when(m.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-4">
        <label htmlFor="care-message" className="text-[15px] font-semibold">
          Write a message
        </label>
        <textarea
          id="care-message"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          rows={4}
          placeholder="Type your question here…"
          className="mt-2 w-full rounded-xl border border-black/10 p-3 text-[15px] outline-none focus:border-[color:var(--pd-brand)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-[color:var(--pd-deep)]/50">
            {body.length > MAX - 500 ? `${MAX - body.length} characters left` : "No attachments"}
          </span>
          <Button
            type="submit"
            disabled={!body.trim() || sending}
             className="w-full text-white hover:opacity-90 sm:w-auto"
            style={{ backgroundColor: accent }}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send message
              </>
            )}
          </Button>
        </div>
      </form>

      {error ? <p className="mt-3 text-[15px] font-semibold text-red-600">{error}</p> : null}
    </section>
  );
}
