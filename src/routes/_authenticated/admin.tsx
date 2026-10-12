import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  FlaskConical,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Trash2,
  Menu,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";
import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { ShipQueue } from "@/components/review/ShipQueue";
import { PaymentsQueue } from "@/components/admin/PaymentsQueue";
import { LabPanelPurchases } from "@/components/admin/LabPanelPurchases";
import { ProductOrders } from "@/components/admin/ProductOrders";
import { TreatmentOpsQueues } from "@/components/admin/TreatmentOpsQueues";
import {
  createPractitioner,
  grantRole,
  listPractitioners,
  listQuestQueue,
  markQuestReady,
  markResultsReceived,
  myAdminRole,
  revokeRole,
  type QuestQueueRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Quest Fulfillment — Amino Flux Rx Admin" },
      {
        name: "description",
        content:
          "Admin portal for entering patient lab orders into Quest Diagnostics and releasing the scheduling link to patients.",
      },
      { property: "og:title", content: "Quest Fulfillment — Amino Flux Rx Admin" },
      { property: "og:description", content: "Internal Quest lab fulfillment queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminQuestPage,
});

const STATUS_LABEL: Record<string, string> = {
  awaiting_setup: "Waiting for Quest Setup",
  ready: "Quest Order Ready",
  results_received: "Results received",
};

function AdminQuestPage() {
  const { user, loading } = useAuth();

  const checkAdmin = useServerFn(myAdminRole);
  const loadQueue = useServerFn(listQuestQueue);
  const loadPeople = useServerFn(listPractitioners);
  const runReady = useServerFn(markQuestReady);
  const runResults = useServerFn(markResultsReceived);
  const runGrant = useServerFn(grantRole);
  const runRevoke = useServerFn(revokeRole);
  const runCreate = useServerFn(createPractitioner);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queue, setQueue] = useState<QuestQueueRow[]>([]);
  const [people, setPeople] = useState<
    { id: string; userId: string; role: string; email: string | null; name: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"provider" | "admin">("provider");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"provider" | "admin">("provider");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void checkAdmin().then((r) => setIsAdmin(r.isAdmin));
  }, [user, checkAdmin]);

  const refresh = useCallback(async () => {
    const [q, p] = await Promise.all([loadQueue(), loadPeople()]);
    setQueue(q.queue as QuestQueueRow[]);
    setPeople(p.people);
  }, [loadQueue, loadPeople]);

  useEffect(() => {
    if (isAdmin) void refresh().catch((e) => setError(e.message));
  }, [isAdmin, refresh]);

  if (loading || isAdmin === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050816]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-32 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-white/40" />
          <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-white/65">
            This portal is restricted to the Amino Flux Rx admin team.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const awaitingSetup = queue.filter((r) => r.status === "awaiting_setup");
  const needsPayment = awaitingSetup.filter((r) => r.order?.status === "pending_payment");
  const waiting = awaitingSetup.filter((r) => r.order?.status !== "pending_payment");
  const awaitingResults = queue.filter((r) => r.status === "ready");
  const resultsIn = queue.filter((r) => r.status === "results_received");

  const invite = async () => {
    setBusy(true);
    setError(null);
    try {
      await runGrant({ data: { email: inviteEmail, role: inviteRole } });
      setInviteEmail("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const makeAccount = async () => {
    setCreating(true);
    setError(null);
    try {
      const password = newPassword.trim() || generatePassword();
      await runCreate({
        data: { email: newEmail, fullName: newName, password, role: newRole },
      });
      setCreated({ email: newEmail.trim().toLowerCase(), password });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const stats = [
    {
      label: "Lab payments pending",
      value: needsPayment.length,
      icon: CreditCard,
    },
    { label: "Needs Quest setup", value: waiting.length, icon: FlaskConical },
    {
      label: "Waiting for draw / results",
      value: awaitingResults.length,
      icon: CheckCircle2,
    },
    { label: "Results received", value: resultsIn.length, icon: ShieldCheck },
    { label: "Practitioners & admins", value: people.length, icon: UserPlus },
  ];

  const questSection = (
    <div className="space-y-6">
      <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
        <header className="mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <FlaskConical className="h-5 w-5 text-admin-accent" />
          <div>
            <h2 className="font-admin-display text-[17px] font-bold tracking-tight">
              Ready for Quest setup
            </h2>
            <p className="text-[15px] text-admin-muted">{waiting.length} order(s) need action</p>
          </div>
        </header>

        {waiting.length === 0 ? (
          <p className="rounded-xl bg-admin-canvas px-4 py-6 text-center text-[15px] text-admin-muted">
            Nothing waiting — every paid lab order has been entered into Quest.
          </p>
        ) : (
          <div className="space-y-4">
            {waiting.map((row) => (
              <QuestCard
                key={row.id}
                row={row}
                onSubmit={async (payload) => {
                  await runReady({ data: { fulfillmentId: row.id, ...payload } });
                  await refresh();
                }}
              />
            ))}
          </div>
        )}
      </section>

      {(
        [
          {
            key: "awaiting",
            title: "Waiting for draw / results",
            subtitle:
              "Quest link sent. Milestones below are the patient's own confirmations in the portal.",
            rows: awaitingResults,
            empty: "Nothing waiting on a blood draw right now.",
          },
          {
            key: "results",
            title: "Results received",
            subtitle: "Ready for practitioner review.",
            rows: resultsIn,
            empty: "No results have come back yet.",
          },
        ] as const
      ).map((group) => (
        <section
          key={group.key}
          className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6"
        >
          <h2 className="font-admin-display text-[17px] font-bold tracking-tight">{group.title}</h2>
          <p className="mb-6 text-[15px] text-admin-muted">{group.subtitle}</p>
          {group.rows.length === 0 ? (
            <p className="text-[15px] text-admin-muted">{group.empty}</p>
          ) : (
            <ul className="space-y-3">
              {group.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-admin-border bg-admin-canvas px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-admin-accent" />
                  <span className="font-semibold">{row.order?.order_number}</span>
                  <span className="text-[15px] text-admin-muted">
                    {row.patient.name ?? row.patient.email}
                  </span>
                  <span className="rounded-full bg-admin-accent-soft px-3 py-1 text-[13px] font-semibold text-admin-accent">
                    {questStageLabel(row)}
                  </span>
                  {row.quest_reference && (
                    <span className="text-[13px] text-admin-muted">Ref {row.quest_reference}</span>
                  )}
                  {row.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                     className="w-full sm:ml-auto sm:w-auto"
                      onClick={async () => {
                        await runResults({ data: { fulfillmentId: row.id } });
                        await refresh();
                      }}
                    >
                      Mark results received
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );

  const shippingSection = (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
      <h2 className="font-admin-display text-[17px] font-bold tracking-tight">
        Orders out the door
      </h2>
      <p className="mb-6 mt-1 text-[15px] opacity-70">
        Step 6 — add tracking to a paid or practitioner-approved order and the patient is emailed
        automatically.
      </p>
      <ShipQueue />
    </section>
  );

  const paymentsSection = (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
      <PaymentsQueue onChanged={() => void refresh()} />
    </section>
  );

  const treatmentSection = (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
      <TreatmentOpsQueues />
    </section>
  );

  const practitionerSection = (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
      <h2 className="font-admin-display text-[17px] font-bold tracking-tight">
        Create a practitioner account
      </h2>
      <p className="mb-6 text-[15px] text-admin-muted">
        Sets up a real login on the spot — no signup needed. They sign in at /auth and post their
        own lab-review availability at /provider, which patients book instantly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-name">Full name</Label>
          <Input
            id="new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Dana Reyes, NP"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">Email</Label>
          <Input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="dana@aminoflux.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Temporary password (leave blank to generate)</Label>
          <Input
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-role">Role</Label>
          <select
            id="new-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "provider" | "admin")}
            className="h-10 w-full rounded-md border border-admin-border bg-admin-surface px-3 text-[15px]"
          >
            <option value="provider">Practitioner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <Button
        onClick={makeAccount}
        disabled={creating}
        className="mt-4 bg-admin-accent text-admin-accent-foreground hover:opacity-90"
      >
        {creating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Create account
      </Button>

      {created && (
        <div className="mt-4 rounded-lg border border-admin-accent/20 bg-admin-accent-soft/60 px-4 py-3 text-[14px] text-admin-ink">
          Account ready. Share these credentials once — they should change the password after
          signing in.
          <div className="mt-2 font-mono text-[14px]">
            <div>{created.email}</div>
            <div>{created.password}</div>
          </div>
        </div>
      )}
    </section>
  );

  const teamSection = (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
      <h2 className="font-admin-display text-[17px] font-bold tracking-tight">
        Practitioners & admins
      </h2>
      <p className="mb-6 text-[15px] text-admin-muted">
        Anyone with the practitioner role manages their own lab-review availability at /provider.
      </p>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
         <div className="min-w-0 space-y-2">
          <Label htmlFor="invite-email">Account email</Label>
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="practitioner@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "provider" | "admin")}
            className="h-10 rounded-md border border-admin-border bg-admin-surface px-3 text-[15px]"
          >
            <option value="provider">Practitioner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button
          onClick={invite}
          disabled={busy}
          className="bg-admin-accent text-admin-accent-foreground hover:opacity-90"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Grant access
        </Button>
      </div>

      <ul className="mt-6 space-y-2">
        {people.map((p) => (
          <li
            key={p.id}
             className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-admin-border bg-admin-canvas px-4 py-3 sm:flex sm:flex-wrap sm:gap-3"
          >
             <span className="min-w-0 break-words font-semibold">{p.name ?? p.email}</span>
             <span className="col-span-2 min-w-0 break-all text-[15px] text-admin-muted sm:col-auto">{p.email}</span>
            <span className="rounded-full bg-black/5 px-3 py-1 text-[13px] font-semibold capitalize">
              {p.role === "provider" ? "Practitioner" : p.role}
            </span>
            <Button
              size="sm"
              variant="ghost"
               className="col-start-2 row-start-1 ml-auto text-red-600 hover:text-red-700 sm:col-auto sm:row-auto"
              onClick={async () => {
                await runRevoke({ data: { roleId: p.id } });
                await refresh();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );

  const overviewSection = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-admin-soft"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-admin-muted">
                {s.label}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-admin-accent-soft text-admin-deep">
                <s.icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-3 font-admin-display text-[28px] font-bold leading-none tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>
      {questSection}
    </div>
  );

  const PAGE: Record<AdminTab, { title: string; subtitle: string; body: React.ReactNode }> = {
    overview: {
      title: "Dashboard",
      subtitle: "Welcome back — here's what needs your attention today.",
      body: overviewSection,
    },
    orders: {
      title: "Orders",
      subtitle: "Every product order — who bought what, payment, and shipping details.",
      body: (
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
          <ProductOrders />
        </section>
      ),
    },
    payments: {
      title: "Payments",
      subtitle: "Confirm payments collected outside the portal so orders can move forward.",
      body: paymentsSection,
    },
    treatment: {
      title: "Treatment operations",
      subtitle: "Where every treatment request stands. Practitioners make the decisions.",
      body: treatmentSection,
    },
    labpanels: {
      title: "Lab panel orders",
      subtitle: "Patients who purchased a lab panel — approve to move them to their next step.",
      body: (
        <section className="rounded-xl border border-admin-border bg-admin-surface p-5 shadow-admin-soft sm:p-6">
          <LabPanelPurchases onChanged={() => void refresh()} />
        </section>
      ),
    },
    shipping: {
      title: "Fulfillment",
      subtitle: "Ready to fulfill, in transit, and delivered orders.",
      body: shippingSection,
    },
    messages: {
      title: "Messages",
      subtitle: "Answer patient questions from their secure portal inbox.",
      body: <MessagesInbox accent="var(--admin-accent)" />,
    },
    practitioners: {
      title: "New Practitioner",
      subtitle: "Create a real login for a practitioner or admin.",
      body: practitionerSection,
    },
    team: { title: "Roles & Team", subtitle: "Grant or revoke portal access.", body: teamSection },
  };

  const page = PAGE[activeTab];

  return (
    <div className="admin-portal flex min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-admin-canvas font-admin-body text-admin-ink">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

       <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur-xl sm:min-h-20 sm:px-[26px]">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 text-admin-muted hover:bg-admin-canvas hover:text-admin-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-admin-display text-[17px] font-bold leading-tight sm:text-xl">
                {page.title}
              </h1>
              <p className="hidden truncate text-[12px] text-admin-muted sm:block sm:text-[13px]">
                {page.subtitle}
              </p>
            </div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-admin-accent-soft text-[13px] font-bold text-admin-deep">
            {user?.email?.charAt(0).toUpperCase() ?? "A"}
          </div>
        </header>

         <div className="mx-auto max-w-[1440px] space-y-5 px-3 py-4 sm:space-y-6 sm:px-[26px] sm:py-6">
          {error && (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
              {error}
            </p>
          )}
          {page.body}
        </div>
      </main>
    </div>
  );
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

function QuestCard({
  row,
  onSubmit,
}: {
  row: QuestQueueRow;
  onSubmit: (payload: {
    questLink?: string;
    questReference?: string;
    note?: string;
  }) => Promise<void>;
}) {
  const [link, setLink] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-w-0 rounded-xl border border-admin-border bg-admin-canvas p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-[13px] font-bold text-amber-800">
          Waiting for Quest Setup
        </span>
        <span className="font-semibold">{row.order?.order_number}</span>
        <span className="text-[15px] text-admin-muted">
          {new Date(row.created_at).toLocaleString()}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wider text-admin-muted">Patient</p>
          <p className="mt-1 text-[15px] font-semibold">{row.patient.name ?? "—"}</p>
          <p className="flex min-w-0 items-start gap-2 break-all text-[15px] text-admin-muted">
            <Mail className="h-3.5 w-3.5" /> {row.patient.email ?? "—"}
          </p>
          <p className="flex min-w-0 items-start gap-2 break-words text-[15px] text-admin-muted">
            <Phone className="h-3.5 w-3.5" /> {row.patient.phone ?? "—"}
          </p>
          {row.order?.shipping_city && (
            <p className="text-[15px] text-admin-muted">
              {row.order.shipping_city}, {row.order.shipping_state} {row.order.shipping_zip}
            </p>
          )}
        </div>
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wider text-admin-muted">
            Purchased panels
          </p>
          <ul className="mt-1 space-y-1 text-[15px]">
            {row.panels.map((p) => (
              <li key={p.name}>
                {p.quantity} × {p.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`link-${row.id}`}>Quest scheduling link</Label>
          <Input
            id={`link-${row.id}`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://appointment.questdiagnostics.com/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`ref-${row.id}`}>Confirmation / requisition code</Label>
          <Input
            id={`ref-${row.id}`}
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. QD-4839201"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`note-${row.id}`}>Note for the patient (optional)</Label>
          <Input
            id={`note-${row.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Fasting 8–12 hours required."
          />
        </div>
      </div>

      {err && <p className="mt-3 text-[15px] text-red-600">{err}</p>}

      <Button
        className="mt-4 w-full bg-admin-accent text-admin-accent-foreground hover:opacity-90 sm:w-auto"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await onSubmit({ questLink: link, questReference: ref, note });
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Quest Order Ready
      </Button>
    </div>
  );
}

/** Plain-English stage for staff, blending base status with patient-confirmed milestones. */
function questStageLabel(row: QuestQueueRow) {
  if (row.status === "results_received") return "Results received";
  if (row.status === "ready") {
    if (row.draw_completed_at) return "Blood draw complete — waiting for results";
    if (row.draw_booked_at) return "Blood draw booked";
    return "Quest ready — booking not confirmed";
  }
  return STATUS_LABEL[row.status];
}
