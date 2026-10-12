/** Server-only helpers for the lab-review scheduling flow. */

type StaffClient = {
  from: (table: string) => any;
};

export async function assertStaff(supabase: StaffClient, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["provider", "admin"]);
  if (!data || data.length === 0) throw new Error("Only clinical staff can manage the schedule.");
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildSlotRows(opts: {
  providerId: string;
  providerName: string;
  date: string;
  times: string[];
  durationMinutes: number;
  meetingMode: string;
}) {
  return opts.times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const end = new Date(Date.UTC(2000, 0, 1, h, m + opts.durationMinutes));
    return {
      provider_id: opts.providerId,
      provider_name: opts.providerName,
      slot_date: opts.date,
      start_time: `${pad(h)}:${pad(m)}`,
      end_time: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
      meeting_mode: opts.meetingMode,
    };
  });
}

/* ------------------------------------------------- linked external schedule */

/**
 * Nicole publishes her availability on the Wellness Flow site. We mirror her
 * open times here so patients see exactly the same slots on both sites.
 */
const LINKED_FEED_URL =
  "https://project--7192e46c-b361-421e-8f98-851a3a65c6dd.lovable.app/api/public/availability";
const LINKED_TZ = "America/Los_Angeles";
const LINKED_PROVIDER_NAME = "Nicole, NP";

type LinkedSlot = { start_at: string; end_at: string };

function localParts(isoTs: string) {
  const d = new Date(isoTs);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: LINKED_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

/**
 * Pull Nicole's open Wellness Flow times and mirror them into provider_slots.
 * Times she removes there are removed here too (unless already booked here).
 */
export async function syncLinkedAvailability(supabaseAdmin: {
  from: (table: string) => any;
}): Promise<{ synced: number }> {
  const { data: staff } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "provider")
    .limit(1);
  const providerId: string | undefined = staff?.[0]?.user_id;
  if (!providerId) return { synced: 0 };

  const nowIso = new Date().toISOString();

  let linked: LinkedSlot[] = [];
  try {
    const res = await fetch(LINKED_FEED_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { synced: 0 };
    const body = (await res.json()) as { slots?: LinkedSlot[] };
    linked = (body.slots ?? []).filter((s) => s.start_at > nowIso);
  } catch {
    return { synced: 0 };
  }

  const rows = linked.map((s) => {
    const start = localParts(s.start_at);
    const end = localParts(s.end_at);
    return {
      provider_id: providerId,
      provider_name: LINKED_PROVIDER_NAME,
      slot_date: start.date,
      start_time: start.time,
      end_time: end.time,
      meeting_mode: "zoom",
      external_id: `wf-${s.start_at}`,
    };
  });

  if (rows.length > 0) {
    await supabaseAdmin
      .from("provider_slots")
      .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true });
  }

  // Drop mirrored slots that are no longer open on her other schedule.
  const keep = rows.map((r) => r.external_id);
  let stale = supabaseAdmin
    .from("provider_slots")
    .delete()
    .eq("status", "open")
    .not("external_id", "is", null)
    .gte("slot_date", localParts(nowIso).date);
  if (keep.length > 0) stale = stale.not("external_id", "in", `(${keep.join(",")})`);
  await stale;

  return { synced: rows.length };
}
