import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

const MAX_BODY = 5000;

export type CareMessage = {
  id: string;
  body: string;
  senderRole: "patient" | "staff";
  createdAt: string;
};

export type StaffThreadSummary = {
  patientId: string;
  name: string | null;
  email: string | null;
  lastBody: string;
  lastAt: string;
  lastSender: "patient" | "staff";
  unread: number;
};

async function assertStaffRole({ supabase, userId }: Ctx) {
  const [{ data: provider }, { data: admin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "provider" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (!provider && !admin) throw new Error("Practitioners and admins only.");
}

function cleanBody(raw: unknown): string {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) throw new Error("Please write a message before sending.");
  if (body.length > MAX_BODY) throw new Error("Messages are limited to 5000 characters.");
  return body;
}

const toMessage = (r: any): CareMessage => ({
  id: r.id,
  body: r.body,
  senderRole: r.sender_role,
  createdAt: r.created_at,
});

/** The signed-in patient's own thread, oldest first. Marks staff replies read. */
export const myMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data, error } = await supabase
      .from("care_messages")
      .select("id, body, sender_role, created_at, read_by_patient")
      .eq("patient_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const unread = rows.filter((r: any) => r.sender_role === "staff" && !r.read_by_patient);
    if (unread.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("care_messages")
        .update({ read_by_patient: true })
        .eq("patient_id", userId)
        .eq("sender_role", "staff")
        .eq("read_by_patient", false);
    }
    return { messages: rows.map(toMessage) };
  });

/** Number of unread care-team replies, for the Messages tab indicator. */
export const myUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { count, error } = await supabase
      .from("care_messages")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", userId)
      .eq("sender_role", "staff")
      .eq("read_by_patient", false);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

/** Patient sends a message to the care team. */
export const sendMyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const body = cleanBody(data?.body);
    const { error } = await supabase.from("care_messages").insert({
      patient_id: userId,
      sender_id: userId,
      sender_role: "patient",
      body,
      read_by_patient: true,
      read_by_staff: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** One summary row per patient with messages, most recently active first. */
export const staffThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("care_messages")
      .select("patient_id, body, sender_role, created_at, read_by_staff")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const byPatient = new Map<string, StaffThreadSummary>();
    for (const r of rows as any[]) {
      const existing = byPatient.get(r.patient_id);
      if (!existing) {
        byPatient.set(r.patient_id, {
          patientId: r.patient_id,
          name: null,
          email: null,
          lastBody: r.body,
          lastAt: r.created_at,
          lastSender: r.sender_role,
          unread: 0,
        });
      }
      if (r.sender_role === "patient" && !r.read_by_staff) {
        byPatient.get(r.patient_id)!.unread += 1;
      }
    }

    const ids = [...byPatient.keys()];
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      await Promise.all(
        ids.map(async (id) => {
          const summary = byPatient.get(id)!;
          summary.name = (profiles ?? []).find((p: any) => p.id === id)?.full_name ?? null;
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          summary.email = u?.user?.email ?? null;
        }),
      );
    }

    return {
      threads: [...byPatient.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    };
  });

/** Full thread for one patient. Marks the patient's messages read by staff. */
export const staffThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("care_messages")
      .select("id, body, sender_role, created_at")
      .eq("patient_id", data.patientId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("care_messages")
      .update({ read_by_staff: true })
      .eq("patient_id", data.patientId)
      .eq("sender_role", "patient")
      .eq("read_by_staff", false);

    const [{ data: profile }, { data: u }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", data.patientId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(data.patientId),
    ]);

    return {
      patient: {
        id: data.patientId,
        name: profile?.full_name ?? null,
        email: u?.user?.email ?? null,
      },
      messages: (rows ?? []).map(toMessage),
    };
  });

/** Staff reply into a patient's thread. */
export const staffReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { patientId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertStaffRole(ctx);
    const body = cleanBody(data?.body);
    const { error } = await ctx.supabase.from("care_messages").insert({
      patient_id: data.patientId,
      sender_id: ctx.userId,
      sender_role: "staff",
      body,
      read_by_patient: false,
      read_by_staff: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
