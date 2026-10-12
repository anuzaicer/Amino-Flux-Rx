import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  LogOut,
  Package,
  FlaskConical,
  CalendarCheck,
  UserRound,
  Lock,
  LayoutDashboard,
  Activity,
  ShieldCheck,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGender } from "@/components/gender/GenderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { STATUS_LABEL } from "@/lib/order-status";
import { InProgressTreatments } from "@/components/account/InProgressTreatments";
import { LabReviewScheduler } from "@/components/scheduling/LabReviewScheduler";
import { QuestStatus } from "@/components/labs/QuestStatus";
import { productImageFor } from "@/lib/product-images";
import { myUnreadMessageCount } from "@/lib/messages.functions";
import { MessagesPanel } from "@/components/account/MessagesPanel";
import { myJourney } from "@/lib/journey.functions";
import { inProgressTreatments, resolveNextAction, type JourneyState } from "@/lib/journey";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard — Amino Flux Rx" },
      {
        name: "description",
        content:
          "Your Amino Flux Rx patient dashboard: care plan progress, lab results, prescriptions, orders, and provider consultations in one place.",
      },
      { property: "og:title", content: "Patient Dashboard — Amino Flux Rx" },
      {
        property: "og:description",
        content:
          "Track your care plan, lab panels, prescriptions and provider visits inside your Amino Flux Rx patient dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

type Profile = {
  full_name: string | null;
  phone: string | null;
  gender_preference: string | null;
  created_at: string;
};

type OrderItemRow = {
  product_id: string;
  product_name: string;
  product_group: string;
  quantity: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: keyof typeof STATUS_LABEL;
  total_cents: number;
  created_at: string;
  order_items: OrderItemRow[];
};

type IntakeRow = {
  date_of_birth: string | null;
  biological_sex: string | null;
  height_in: number | null;
  weight_lb: number | null;
  allergies: string | null;
  medications: string | null;
  conditions: string | null;
  pregnancy_status: string | null;
  goals: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  submitted_at: string | null;
};

type TabId = "overview" | "progress" | "labs" | "orders" | "visits" | "messages" | "profile";

const TAB_IDS: TabId[] = [
  "overview",
  "progress",
  "labs",
  "orders",
  "visits",
  "messages",
  "profile",
];

const isTabId = (v: string): v is TabId => (TAB_IDS as string[]).includes(v);

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "My care", icon: LayoutDashboard },
  { id: "progress", label: "In progress", icon: Activity },
  { id: "labs", label: "My lab testing", icon: FlaskConical },
  { id: "orders", label: "My orders", icon: Package },
  { id: "visits", label: "My appointments", icon: CalendarCheck },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "My details", icon: UserRound },
];

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme } = useGender();
  const isWomen = theme === "women";
  const brand = isWomen ? "#5C9330" : "#2173D1";
  const deep = isWomen ? "#2F5115" : "#0B3D8C";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [intake, setIntake] = useState<IntakeRow | null | undefined>(undefined);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const runJourney = useServerFn(myJourney);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const runUnread = useServerFn(myUnreadMessageCount);

  const loadUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await runUnread();
      setUnreadMessages(res.count);
    } catch {
      setUnreadMessages(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadJourney = useCallback(async () => {
    if (!user) return;
    setJourneyLoading(true);
    setJourneyError(null);
    try {
      const res = await runJourney();
      setJourney(res.state as JourneyState);
    } catch (e) {
      setJourneyError(e instanceof Error ? e.message : "Could not load your care status.");
    } finally {
      setJourneyLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select(
        "id, order_number, status, total_cents, created_at, order_items(product_id, product_name, product_group, quantity)",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
    void loadJourney();
    void loadUnread();
  }, [user, loadJourney, loadUnread]);

  // Auth is enforced by the _authenticated layout beforeLoad gate; no client redirect needed here.

  // Keep #visits / #orders / #progress links working in both directions.
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if (isTabId(h)) setTab(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const selectTab = useCallback((id: TabId) => {
    setTab(id);
    const next = id === "overview" ? " " : `#${id}`;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${id === "overview" ? "" : next}`,
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, gender_preference, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
        }
      });
    supabase
      .from("patient_intakes")
      .select(
        "date_of_birth, biological_sex, height_in, weight_lb, allergies, medications, conditions, pregnancy_status, goals, shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_zip, submitted_at",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIntake((data ?? null) as IntakeRow | null));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = useMemo(() => {
    const src = fullName || user?.email || "";
    return src
      .replace(/@.*/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }, [fullName, user?.email]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ backgroundColor: brand }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  // Headline figures all derive from the live journey snapshot.
  // Cancelled / no-show visits never count as booked consultations.
  const upcomingVisits = (journey?.appointments ?? []).filter((a) => a.status === "scheduled");
  const completedVisits = (journey?.appointments ?? []).filter((a) => a.status === "completed");
  const allVisits = [...upcomingVisits, ...completedVisits];
  const liveVisits = upcomingVisits.length;

  // One shared resolution powers the card, the timeline and the active items.
  const nextAction = journey ? resolveNextAction(journey) : null;
  const inProgress = journey ? inProgressTreatments(journey) : [];

  const needsAttention: Partial<Record<TabId, boolean>> = {
    progress: inProgress.some((t) => t.needsAction),
    visits: nextAction?.tone === "action" && nextAction.stage === "review",
    orders:
      nextAction?.tone === "action" &&
      ["decision", "medication", "order"].includes(nextAction.stage),
  };
  const tabCounts: Partial<Record<TabId, number>> = {
    progress: inProgress.length,
    orders: orders?.length ?? 0,
    visits: liveVisits,
    messages: unreadMessages,
  };

  return (
     <div
       className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F4F6F9] text-[color:var(--pd-deep)]"
      style={{ "--pd-brand": brand, "--pd-deep": deep } as React.CSSProperties}
    >
      <SiteHeader />

      {/* Patient banner */}
      <div className="text-white" style={{ backgroundColor: brand }}>
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 sm:py-10">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-lg font-bold ring-1 ring-white/30 sm:h-16 sm:w-16 sm:rounded-2xl sm:text-xl">
              {initials || <UserRound className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase text-white/75 sm:text-[15px] sm:tracking-[0.28em]">
                Patient dashboard · {isWomen ? "Women’s care" : "Men’s health"}
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold sm:text-4xl">
                {fullName ? fullName : "Welcome back"}
              </h1>
              <p className="mt-1 break-all text-[13px] text-white/85 sm:text-[15px]">
                {user.email}
                {memberSince ? ` · Patient since ${memberSince}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="hidden items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[15px] font-semibold ring-1 ring-white/25 sm:inline-flex">
              <ShieldCheck className="h-4 w-4" /> HIPAA-secure record
            </span>
            <Button
              variant="outline"
              onClick={signOut}
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* What the patient is actively working on — one card per treatment. */}
       <section className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6 sm:pt-8">
        {journeyLoading ? (
          <div className="flex items-center gap-2 rounded-[1.5rem] bg-white p-6 text-[15px] text-[color:var(--pd-deep)]/60 shadow-sm ring-1 ring-black/5">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your care status…
          </div>
        ) : journeyError ? (
          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-bold">We couldn't load your status</h2>
            <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/70">{journeyError}</p>
            <Button
              className="mt-4 bg-[color:var(--pd-brand)] text-white hover:opacity-90"
              onClick={() => void loadJourney()}
            >
              Try again
            </Button>
          </div>
        ) : inProgress.length > 0 ? (
          <InProgressTreatments
            items={inProgress.slice(0, 3)}
            accent={brand}
            onViewAll={() => selectTab("progress")}
          />
        ) : null}
      </section>

       <main className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        {/* Side nav */}
         <nav className="w-full min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul className="flex w-full min-w-0 gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              const attention = needsAttention[id];
              const count = tabCounts[id];
              return (
                <li key={id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => selectTab(id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-left text-[15px] font-semibold transition ${
                      active
                        ? "bg-[color:var(--pd-brand)] text-white shadow"
                        : "text-[color:var(--pd-deep)]/70 hover:bg-[color:var(--pd-brand)]/8"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{label}</span>
                    {attention ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Action needed
                      </span>
                    ) : count ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)]"
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:block">
            <p className="text-[15px] font-bold">Need help?</p>
            <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/65">
              Care team replies within one business day.
            </p>
            <button
              type="button"
              onClick={() => selectTab("messages")}
              className="mt-3 inline-flex items-center gap-2 text-[15px] font-semibold text-[color:var(--pd-brand)]"
            >
              <Mail className="h-4 w-4" /> Message my care team
            </button>
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "progress" && (
            <InProgressTreatments
              items={inProgress}
              accent={brand}
              title="Treatments in progress"
              emptyHint="Nothing in progress right now. Once you start a treatment, every step you still need to finish shows up here."
            />
          )}

          {tab === "labs" && (
            <section className="rounded-[1.5rem] bg-[color:var(--pd-brand)]/[0.025] p-4 ring-1 ring-[color:var(--pd-brand)]/10 sm:p-6">
              <QuestStatus />
            </section>
          )}

          {tab === "overview" && (
            <>
              {/* Four headline counts: orders, in-progress treatments, lab panels, appointments. */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Package}
                  label="My orders"
                  value={String(journey?.orders.length ?? 0)}
                  sub="Orders placed"
                />
                <StatCard
                  icon={Activity}
                  label="In progress"
                  value={String(inProgress.length)}
                  sub={inProgress.length ? "Treatments underway" : "Nothing underway"}
                />
                <StatCard
                  icon={FlaskConical}
                  label="Lab panels"
                  value={String(journey?.fulfillments.length ?? 0)}
                  sub="Panels purchased"
                />
                <StatCard
                  icon={CalendarCheck}
                  label="Appointments"
                  value={String(allVisits.length)}
                  sub={liveVisits ? `${liveVisits} upcoming` : "Booked so far"}
                />
              </div>

              {/* Recent progress — same cards as the In progress tab, top 3. */}
              {inProgress.length > 0 ? (
                <InProgressTreatments
                  items={inProgress.slice(0, 3)}
                  accent={brand}
                  title="Recent progress"
                  onViewAll={() => selectTab("progress")}
                />
              ) : (
                <Panel title="Recent progress" subtitle="Treatments you're working through">
                  <EmptyState
                    icon={Activity}
                    title="Nothing in progress yet"
                    body="Start a treatment and every step you still need to finish will show up here."
                    action={
                      <Button
                        asChild
                        className="bg-[color:var(--pd-brand)] text-white hover:opacity-90"
                      >
                        <Link to="/">Explore treatments</Link>
                      </Button>
                    }
                  />
                </Panel>
              )}

              {/* Recent orders — the latest purchases with product photos and status. */}
              <Panel title="Recent orders" subtitle="Your latest purchases and their status">
                {orders === null ? (
                  <p className="text-[15px] text-[color:var(--pd-deep)]/60">Loading your orders…</p>
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No orders yet"
                    body="Once you order a lab panel or an approved treatment, it shows up here."
                    action={
                      <Button
                        asChild
                        className="bg-[color:var(--pd-brand)] text-white hover:opacity-90"
                      >
                        <Link to="/">Explore treatments</Link>
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <ul className="space-y-3">
                      {orders.slice(0, 3).map((o) => (
                        <OrderListItem key={o.id} o={o} />
                      ))}
                    </ul>
                    <HistoryLink />
                  </>
                )}
              </Panel>
            </>
          )}

          {tab === "orders" && (
            <>
              <Panel
                title="Prescriptions & orders"
                subtitle="Shipments, refills and billing history"
              >
                {orders === null ? (
                  <p className="text-[15px] text-[color:var(--pd-deep)]/60">Loading your orders…</p>
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Track your treatment orders"
                    body="Every order, provider review status and refill request lives in your order history."
                    action={
                      <div className="flex flex-wrap gap-3">
                        <Button
                          asChild
                          className="bg-[color:var(--pd-brand)] text-white hover:opacity-90"
                        >
                          <Link to="/account/orders">View order history</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link to="/">Explore treatments</Link>
                        </Button>
                      </div>
                    }
                  />
                ) : (
                  <>
                    <ul className="space-y-3">
                      {orders.map((o) => (
                        <OrderListItem key={o.id} o={o} />
                      ))}
                    </ul>
                    <HistoryLink />
                  </>
                )}
              </Panel>
            </>
          )}

          {tab === "visits" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={CalendarCheck}
                  label="Consultations"
                  value={String(allVisits.length)}
                  sub={allVisits.length ? "Booked so far" : "None booked yet"}
                />
                <StatCard
                  icon={Clock}
                  label="Pending"
                  value={String(upcomingVisits.length)}
                  sub={upcomingVisits.length ? "Still to happen" : "Nothing upcoming"}
                />
                <StatCard
                  icon={ShieldCheck}
                  label="Completed"
                  value={String(completedVisits.length)}
                  sub={completedVisits.length ? "Visits finished" : "None completed yet"}
                />
              </div>

              <Panel
                title="Your consultations"
                subtitle="Visits booked from a treatment, plus any general consultation you book below"
              >
                {allVisits.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No consultations booked yet"
                    body="Consultations are booked from a treatment's page at the practitioner consultation step. Once you book one there, it shows up here."
                  />
                ) : (
                  <ul className="space-y-3">
                    {allVisits.map((a) => (
                      <li
                        key={a.id}
                       className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-black/5 bg-[#FAFBFC] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold">
                            {a.slotDate
                              ? new Date(`${a.slotDate}T00:00:00`).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Date to be confirmed"}
                            {a.startTime ? ` · ${a.startTime.slice(0, 5)}` : ""}
                          </p>
                          <p className="text-[15px] text-[color:var(--pd-deep)]/60">
                            {a.providerName ? `With ${a.providerName}` : "Practitioner visit"}
                            {a.meetingMode ? ` · ${a.meetingMode}` : ""}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[13px] font-bold ${
                            a.status === "completed"
                              ? "bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)]"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {a.status === "completed" ? "Completed" : "Upcoming"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel
                title="Book a general consultation"
                subtitle="Pick a day the practitioner is available, then choose a time"
              >
                <LabReviewScheduler
                  labSource="uploaded"
                  appointmentType="initial_consult"
                  notePrefix="General consultation"
                  confirmTitle="Your consultation is booked"
                  defaultName={fullName || undefined}
                  defaultPhone={phone || undefined}
                  onBooked={() => void loadJourney()}
                />
              </Panel>
            </>
          )}

          {tab === "messages" && (
            <MessagesPanel accent={brand} onRead={() => setUnreadMessages(0)} />
          )}

          {tab === "profile" && (
            <>
              <Panel title="Personal information" subtitle="Used for prescriptions and shipping">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="acct-name">Full name</Label>
                    <Input
                      id="acct-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acct-phone">Phone</Label>
                    <Input
                      id="acct-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2 rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-[15px]">
                      <Mail className="h-4 w-4 opacity-50" /> {user.email}
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Care track</Label>
                     <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[color:var(--pd-brand)]/30 bg-[color:var(--pd-brand)]/6 px-3 py-2 text-[15px]">
                      <span>{isWomen ? "Women's care" : "Men's health"}</span>
                      <span className="inline-flex items-center gap-1 text-[color:var(--pd-deep)]/50">
                        <Lock className="h-3.5 w-3.5" /> Locked
                      </span>
                    </div>
                    <p className="text-[15px] text-[color:var(--pd-deep)]/60">
                      Set during signup. Contact support to change it.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="mt-6 bg-[color:var(--pd-brand)] text-white hover:opacity-90"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saved ? "Saved ✓" : "Save changes"}
                </Button>
              </Panel>

              <Panel
                title="Medical profile"
                subtitle="The health details you shared when starting a treatment"
              >
                {intake === undefined ? (
                  <p className="text-[15px] text-[color:var(--pd-deep)]/60">
                    Loading your medical profile…
                  </p>
                ) : !intake || !intake.submitted_at ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="Medical profile not completed yet"
                    body="You'll fill this in the first time you start a treatment — it helps your practitioner decide what's safe for you. Once submitted, it shows up here."
                  />
                ) : (
                  <>
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      <DetailRow
                        label="Date of birth"
                        value={
                          intake.date_of_birth
                            ? new Date(`${intake.date_of_birth}T00:00:00`).toLocaleDateString()
                            : null
                        }
                      />
                      <DetailRow label="Biological sex" value={intake.biological_sex} />
                      <DetailRow
                        label="Height"
                        value={
                          intake.height_in
                            ? `${Math.floor(intake.height_in / 12)}'${intake.height_in % 12}" (${intake.height_in} in)`
                            : null
                        }
                      />
                      <DetailRow
                        label="Weight"
                        value={intake.weight_lb ? `${intake.weight_lb} lb` : null}
                      />
                      <DetailRow label="Allergies" value={intake.allergies} />
                      <DetailRow label="Current medications" value={intake.medications} />
                      <DetailRow label="Medical conditions" value={intake.conditions} />
                      <DetailRow label="Pregnancy status" value={intake.pregnancy_status} />
                      <DetailRow label="Goals" value={intake.goals} className="sm:col-span-2" />
                    </dl>
                    <div className="mt-6 rounded-xl border border-black/5 bg-[#FAFBFC] p-4">
                      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[color:var(--pd-deep)]/50">
                        Shipping address on file
                      </p>
                      <p className="mt-2 text-[15px]">
                        {intake.shipping_name && <>{intake.shipping_name} · </>}
                        {[
                          intake.shipping_address1,
                          intake.shipping_address2,
                          [intake.shipping_city, intake.shipping_state, intake.shipping_zip]
                            .filter(Boolean)
                            .join(", "),
                        ]
                          .filter(Boolean)
                          .join(", ") || "Not provided"}
                      </p>
                    </div>
                    <p className="mt-4 text-[13px] text-[color:var(--pd-deep)]/55">
                      Submitted {new Date(intake.submitted_at).toLocaleDateString()} · To update
                      these details, message your care team from the Messages tab.
                    </p>
                  </>
                )}
              </Panel>

              <Panel title="Privacy & security" subtitle="How your health data is protected">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile
                    icon={ShieldCheck}
                    title="Encrypted records"
                    body="Your data is encrypted in transit and at rest."
                  />
                  <InfoTile
                    icon={Phone}
                    title="Support"
                    body="Call (555) 010-4477, Mon–Fri 9am–6pm ET."
                  />
                </div>
              </Panel>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/60">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)]">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-[15px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pd-deep)]/55">
          {label}
        </p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/60">{sub}</p>
    </div>
  );
}

/** Quiet, full-width link to the complete order history. */
function HistoryLink() {
  return (
    <Link
      to="/account/orders"
      className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--pd-brand)]/25 bg-[color:var(--pd-brand)]/6 px-4 py-3 text-[15px] font-semibold text-[color:var(--pd-brand)] transition hover:bg-[color:var(--pd-brand)]/12"
    >
      View full order history
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

function OrderListItem({ o }: { o: OrderRow }) {
  const items = o.order_items ?? [];
  return (
    <li>
      <Link
        to="/account/orders/$orderId"
        params={{ orderId: o.id }}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-black/5 bg-[#FAFBFC] px-3 py-3 transition hover:border-[color:var(--pd-brand)]/40 sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Product thumbnails — first two items */}
          <div className="flex shrink-0 -space-x-3">
            {(items.length ? items.slice(0, 2) : [null]).map((it, i) => (
              <img
                key={it ? it.product_id : "placeholder"}
                src={productImageFor(it?.product_group, it?.product_id)}
                alt={it ? it.product_name : "Order"}
                className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow-sm"
                style={{ zIndex: 2 - i }}
                loading="lazy"
              />
            ))}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">
              {items.length
                ? items
                    .map((it) =>
                      it.quantity > 1 ? `${it.product_name} ×${it.quantity}` : it.product_name,
                    )
                    .join(" · ")
                : o.order_number}
            </p>
            <p className="break-words text-[13px] text-[color:var(--pd-deep)]/60 sm:text-[15px]">
              {o.order_number} · {new Date(o.created_at).toLocaleDateString()} ·{" "}
              {STATUS_LABEL[o.status] ?? o.status}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold sm:gap-2 sm:text-[15px]">
          ${(o.total_cents / 100).toFixed(2)}
          <ChevronRight className="h-4 w-4 opacity-50" />
        </span>
      </Link>
    </li>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[13px] font-bold uppercase tracking-[0.12em] text-[color:var(--pd-deep)]/50">
        {label}
      </dt>
      <dd className="mt-1 text-[15px]">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#FAFBFC] p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-[15px] font-bold">{title}</p>
      <p className="mt-1 text-[15px] text-[color:var(--pd-deep)]/65">{body}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-black/10 bg-[#FAFBFC] px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--pd-brand)]/10 text-[color:var(--pd-brand)]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-[color:var(--pd-deep)]/65">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
