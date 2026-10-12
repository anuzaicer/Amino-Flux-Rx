import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock, Loader2, Upload, CreditCard } from "lucide-react";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useGender } from "@/components/gender/GenderContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatPrice, cartItemForId, type CartItem } from "@/lib/cart-context";
import {
  cartRequiresIntake,
  cartRequiresPhotoId,
  requiredConsentsForCart,
  CONSENT_TEMPLATES,
  type ConsentTemplate,
} from "@/data/consents";
import { placeOrder, uploadPhotoId } from "@/lib/purchase.functions";
import { CATALOG } from "@/data/catalog";
import { PayPalButton } from "@/components/payments/PayPalButton";

export const Route = createFileRoute("/checkout")({
  /**
   * `onboarding=true` runs the pre-consultation profile steps (intake, consents,
   * photo ID) on their own, with no cart and no order placed. Used by the gated
   * treatment journey after labs are verified.
   */
  validateSearch: (search: Record<string, unknown>): { onboarding?: boolean; product?: string } => {
    const out: { onboarding?: boolean; product?: string } = {};
    if (search["onboarding"] === true || search["onboarding"] === "true") out.onboarding = true;
    if (typeof search["product"] === "string" && search["product"]) out.product = search["product"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Checkout | Amino Flux Rx" },
      {
        name: "description",
        content:
          "Complete your medical intake, sign your consents, and submit your Amino Flux Rx order for provider review.",
      },
      { property: "og:title", content: "Checkout | Amino Flux Rx" },
      { property: "og:description", content: "Complete intake, consents, and submit your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Intake = {
  date_of_birth: string;
  biological_sex: string;
  height_in: string;
  weight_lb: string;
  allergies: string;
  medications: string;
  conditions: string;
  pregnancy_status: string;
  goals: string;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
};

const EMPTY_INTAKE: Intake = {
  date_of_birth: "",
  biological_sex: "",
  height_in: "",
  weight_lb: "",
  allergies: "",
  medications: "",
  conditions: "",
  pregnancy_status: "",
  goals: "",
  shipping_name: "",
  shipping_address1: "",
  shipping_address2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_zip: "",
};

function CheckoutPage() {
  const { theme } = useGender();
  const accent = theme === "men" ? "#2173D1" : "#5C9330";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, hydrated, subtotalCents, clear } = useCart();

  /** The order row, once created — reused so paying never duplicates it. */
  const placedOrderIdRef = useRef<string | null>(null);

  const [intake, setIntake] = useState<Intake>(EMPTY_INTAKE);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [signedSlugs, setSignedSlugs] = useState<string[]>([]);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(true);

  const { onboarding: onboardingParam, product: onboardingProductId } = Route.useSearch();
  const onboardingMode = onboardingParam === true;
  const onboardingProduct = onboardingProductId
    ? CATALOG.find((p) => p.id === onboardingProductId)
    : undefined;

  /** In onboarding mode the requirements come from the treatment, not the cart. */
  const onboardingItems = useMemo<CartItem[]>(() => {
    if (!onboardingMode) return [];
    const base = onboardingProductId ? cartItemForId(onboardingProductId) : null;
    return base ? [{ ...base, quantity: 1 }] : [];
  }, [onboardingMode, onboardingProductId]);

  const needsIntake = onboardingMode ? true : cartRequiresIntake(items);
  const needsId = onboardingMode ? true : cartRequiresPhotoId(items);
  const needsShipping = useMemo(
    () =>
      onboardingMode
        ? false
        : items.some((i) => {
            const p = CATALOG.find((c) => c.id === i.productId);
            return p ? p.group !== "labs" : true;
          }),
    [items, onboardingMode],
  );
  const labOnly = !onboardingMode && items.length > 0 && !needsShipping;
  const consents = useMemo<ConsentTemplate[]>(() => {
    if (!onboardingMode) return requiredConsentsForCart(items);
    const fromProduct = requiredConsentsForCart(onboardingItems);
    return fromProduct.length > 0
      ? fromProduct
      : CONSENT_TEMPLATES.filter((t) => t.scope === "always");
  }, [items, onboardingMode, onboardingItems]);
  const pendingConsents = consents.filter((c) => !signedSlugs.includes(c.slug));

  const runPlaceOrder = useServerFn(placeOrder);
  const runUploadPhotoId = useServerFn(uploadPhotoId);
  // Online payment available? Decides whether the manual fallback button shows.
  const [paypalOn, setPaypalOn] = useState(false);

  const loadState = useCallback(async (userId: string) => {
    const [{ data: intakeRow }, { data: consentRows }, { data: docs }] = await Promise.all([
      supabase.from("patient_intakes").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("consent_signatures").select("consent_slug").eq("user_id", userId),
      supabase
        .from("patient_documents")
        .select("file_name")
        .eq("user_id", userId)
        .eq("kind", "photo_id")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (intakeRow) {
      setIntake({
        date_of_birth: intakeRow.date_of_birth ?? "",
        biological_sex: intakeRow.biological_sex ?? "",
        height_in: intakeRow.height_in?.toString() ?? "",
        weight_lb: intakeRow.weight_lb?.toString() ?? "",
        allergies: intakeRow.allergies ?? "",
        medications: intakeRow.medications ?? "",
        conditions: intakeRow.conditions ?? "",
        pregnancy_status: intakeRow.pregnancy_status ?? "",
        goals: intakeRow.goals ?? "",
        shipping_name: intakeRow.shipping_name ?? "",
        shipping_address1: intakeRow.shipping_address1 ?? "",
        shipping_address2: intakeRow.shipping_address2 ?? "",
        shipping_city: intakeRow.shipping_city ?? "",
        shipping_state: intakeRow.shipping_state ?? "",
        shipping_zip: intakeRow.shipping_zip ?? "",
      });
      setIntakeSubmitted(Boolean(intakeRow.submitted_at));
    }
    setSignedSlugs((consentRows ?? []).map((r) => r.consent_slug));
    setIdFileName(docs?.[0]?.file_name ?? null);
    setLoadingState(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingState(false);
      return;
    }
    void loadState(user.id);
  }, [authLoading, user, loadState]);

  const saveIntake = async () => {
    if (!user) return;
    setBusy("intake");
    setError(null);
    const { error: err } = await supabase.from("patient_intakes").upsert({
      user_id: user.id,
      date_of_birth: intake.date_of_birth || null,
      biological_sex: intake.biological_sex || null,
      height_in: intake.height_in ? Number(intake.height_in) : null,
      weight_lb: intake.weight_lb ? Number(intake.weight_lb) : null,
      allergies: intake.allergies || null,
      medications: intake.medications || null,
      conditions: intake.conditions || null,
      pregnancy_status: intake.pregnancy_status || null,
      goals: intake.goals || null,
      shipping_name: intake.shipping_name || null,
      shipping_address1: intake.shipping_address1 || null,
      shipping_address2: intake.shipping_address2 || null,
      shipping_city: intake.shipping_city || null,
      shipping_state: intake.shipping_state || null,
      shipping_zip: intake.shipping_zip || null,
      submitted_at: new Date().toISOString(),
    });
    setBusy(null);
    if (err) setError(err.message);
    else setIntakeSubmitted(true);
  };

  const signConsents = async () => {
    if (!user) return;
    if (!signature.trim()) return setError("Type your full legal name to sign.");
    if (pendingConsents.some((c) => !agreed[c.slug])) {
      return setError("Please review and check every consent before signing.");
    }
    setBusy("consents");
    setError(null);
    const { error: err } = await supabase.from("consent_signatures").insert(
      pendingConsents.map((c) => ({
        user_id: user.id,
        consent_slug: c.slug,
        consent_title: c.title,
        version: c.version,
        signed_name: signature.trim(),
      })),
    );
    setBusy(null);
    if (err) setError(err.message);
    else setSignedSlugs((prev) => [...prev, ...pendingConsents.map((c) => c.slug)]);
  };

  const onIdFile = async (file: File) => {
    setBusy("id");
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
      const res = await runUploadPhotoId({
        data: {
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          dataBase64: btoa(binary),
        },
      });
      setIdFileName(res.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
    setBusy(null);
  };

  /** Creates the order once; reused by both the manual button and PayPal. */
  const ensureOrderId = useCallback(async () => {
    if (placedOrderIdRef.current) return placedOrderIdRef.current;
    const res = await runPlaceOrder({
      data: {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          forProductId: i.forProductId ?? null,
        })),
        shipping: {
          name: intake.shipping_name,
          address1: intake.shipping_address1,
          address2: intake.shipping_address2,
          city: intake.shipping_city,
          state: intake.shipping_state,
          zip: intake.shipping_zip,
        },
      },
    });
    placedOrderIdRef.current = res.orderId;
    return res.orderId;
  }, [items, intake, runPlaceOrder]);

  const finishOrder = (orderId: string) => {
    clear();
    void navigate({ to: "/account/orders/$orderId", params: { orderId } });
  };

  const submitOrder = async () => {
    setBusy("order");
    setError(null);
    try {
      const orderId = await ensureOrderId();
      finishOrder(orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your order.");
      setBusy(null);
    }
  };

  const intakeDone = !needsIntake || intakeSubmitted;
  const consentsDone = pendingConsents.length === 0;
  const idDone = !needsId || Boolean(idFileName);
  const shippingDone =
    !needsShipping ||
    Boolean(
      intake.shipping_name &&
      intake.shipping_address1 &&
      intake.shipping_city &&
      intake.shipping_state &&
      intake.shipping_zip,
    );
  const readyToSubmit = intakeDone && consentsDone && idDone && shippingDone && items.length > 0;

  const steps = useMemo(() => {
    const s: { key: string; title: string; done: boolean }[] = [];
    if (needsIntake) s.push({ key: "intake", title: "Medical intake", done: intakeDone });
    if (consents.length > 0)
      s.push({ key: "consents", title: "Consents & agreements", done: consentsDone });
    if (needsId) s.push({ key: "id", title: "Government photo ID", done: idDone });
    if (needsShipping) s.push({ key: "shipping", title: "Shipping address", done: shippingDone });
    // Onboarding mode never places an order, so it ends with a hand-off step.
    if (onboardingMode) {
      s.push({
        key: "onboarding-done",
        title: "Next: your consultation",
        done: intakeDone && consentsDone && idDone,
      });
    } else {
      s.push({ key: "payment", title: "Payment & review", done: false });
    }
    return s;
  }, [
    needsIntake,
    intakeDone,
    consents.length,
    consentsDone,
    needsId,
    idDone,
    needsShipping,
    shippingDone,
    onboardingMode,
  ]);

  const [stepIndex, setStepIndex] = useState(0);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const current = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;
  const canAdvance = current ? current.done || current.key === "payment" : false;

  // Land the patient on the first step that's still outstanding — completed
  // intake, consents, and photo ID are skipped automatically.
  const [jumped, setJumped] = useState(false);
  useEffect(() => {
    if (jumped || loadingState || !user) return;
    const next = steps.findIndex((s) => !s.done);
    if (next > 0) setStepIndex(next);
    setJumped(true);
  }, [jumped, loadingState, user, steps]);

  return (
    <div className="relative min-h-screen text-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {onboardingMode ? "Complete your medical profile" : "Checkout"}
        </h1>
        <p className="mt-2 max-w-2xl text-white/85">
          {onboardingMode
            ? `Your practitioner needs these details before your consultation${
                onboardingProduct ? ` for ${onboardingProduct.name}` : ""
              }. Nothing is purchased on this page.`
            : "Everything below is required before a licensed provider can review your order."}
        </p>

        {!hydrated || authLoading ? (
          <p className="mt-10 text-white/80">Loading…</p>
        ) : !user ? (
          <Card>
            <h2 className="font-display text-xl font-bold">Sign in to continue</h2>
            <p className="mt-2 text-[15px] text-[#0F1E33]/75">
              Your intake, consents, and orders are stored securely in your patient account.
            </p>
            <Link
              to="/auth"
              className="mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Sign in or create an account
            </Link>
          </Card>
        ) : !onboardingMode && items.length === 0 ? (
          <Card>
            <h2 className="font-display text-xl font-bold">Your cart is empty</h2>
            <Link
              to="/category/$category"
              params={{ category: theme }}
              className="mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Browse care
            </Link>
          </Card>
        ) : loadingState ? (
          <p className="mt-10 text-white/80">Loading your patient record…</p>
        ) : (
          <div className="mt-8 grid min-w-0 gap-6 sm:mt-10 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
            <div className="space-y-6">
              <ol className="grid grid-cols-3 gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur sm:flex sm:flex-wrap sm:rounded-3xl sm:p-3">
                {steps.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStepIndex(i)}
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-semibold transition sm:w-auto sm:rounded-full sm:px-3 sm:text-[15px]"
                      style={{
                        backgroundColor: i === safeIndex ? accent : "rgba(255,255,255,0.12)",
                        color: "#fff",
                      }}
                    >
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[13px]">
                        {s.done ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className="hidden sm:inline">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>

              {current?.key === "intake" && (
                <StepCard
                  n={safeIndex + 1}
                  title="Medical intake"
                  done={intakeDone}
                  accent={accent}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Date of birth"
                      type="date"
                      value={intake.date_of_birth}
                      onChange={(v) => setIntake({ ...intake, date_of_birth: v })}
                    />
                    <Field
                      label="Sex assigned at birth"
                      value={intake.biological_sex}
                      onChange={(v) => setIntake({ ...intake, biological_sex: v })}
                    />
                    <Field
                      label="Height (inches)"
                      type="number"
                      value={intake.height_in}
                      onChange={(v) => setIntake({ ...intake, height_in: v })}
                    />
                    <Field
                      label="Weight (lb)"
                      type="number"
                      value={intake.weight_lb}
                      onChange={(v) => setIntake({ ...intake, weight_lb: v })}
                    />
                  </div>
                  <div className="mt-4 grid gap-4">
                    <Field
                      label="Allergies"
                      value={intake.allergies}
                      onChange={(v) => setIntake({ ...intake, allergies: v })}
                      textarea
                    />
                    <Field
                      label="Current medications & supplements"
                      value={intake.medications}
                      onChange={(v) => setIntake({ ...intake, medications: v })}
                      textarea
                    />
                    <Field
                      label="Medical conditions & surgeries"
                      value={intake.conditions}
                      onChange={(v) => setIntake({ ...intake, conditions: v })}
                      textarea
                    />
                    <Field
                      label="Pregnant, breastfeeding, or planning pregnancy?"
                      value={intake.pregnancy_status}
                      onChange={(v) => setIntake({ ...intake, pregnancy_status: v })}
                    />
                    <Field
                      label="What are your goals with treatment?"
                      value={intake.goals}
                      onChange={(v) => setIntake({ ...intake, goals: v })}
                      textarea
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveIntake}
                    disabled={busy === "intake"}
                    className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: accent }}
                  >
                    {busy === "intake" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {intakeSubmitted ? "Update intake" : "Submit intake"}
                  </button>
                </StepCard>
              )}

              {current?.key === "consents" && (
                <StepCard
                  n={safeIndex + 1}
                  title="Consents & agreements"
                  done={consentsDone}
                  accent={accent}
                >
                  <ul className="space-y-4">
                    {consents.map((c) => {
                      const already = signedSlugs.includes(c.slug);
                      return (
                        <li key={c.slug} className="rounded-2xl border border-[#0F1E33]/10 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-semibold">{c.title}</h4>
                            {already && (
                              <span
                                className="inline-flex items-center gap-1 text-[15px] font-semibold"
                                style={{ color: accent }}
                              >
                                <Check className="h-3.5 w-3.5" /> Signed
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-[15px] leading-relaxed text-[#0F1E33]/75">
                            {c.body}
                          </p>
                          {!already && (
                            <label className="mt-3 flex items-start gap-2 text-[15px] font-medium">
                              <input
                                type="checkbox"
                                checked={Boolean(agreed[c.slug])}
                                onChange={(e) =>
                                  setAgreed({ ...agreed, [c.slug]: e.target.checked })
                                }
                                className="mt-1"
                              />
                              I have read and agree to the {c.title}.
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!consentsDone && (
                    <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
                      <Field
                        label="Type your full legal name to sign"
                        value={signature}
                        onChange={setSignature}
                      />
                      <button
                        type="button"
                        onClick={signConsents}
                        disabled={busy === "consents"}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
                        style={{ backgroundColor: accent }}
                      >
                        {busy === "consents" && <Loader2 className="h-4 w-4 animate-spin" />} Sign
                        consents
                      </button>
                    </div>
                  )}
                </StepCard>
              )}

              {current?.key === "id" && (
                <StepCard
                  n={safeIndex + 1}
                  title="Government photo ID"
                  done={idDone}
                  accent={accent}
                >
                  <p className="text-[15px] text-[#0F1E33]/75">
                    Controlled and hormone therapies require an identity check. Upload a clear photo
                    of your driver's license or passport. Files are stored privately and only
                    visible to your care team.
                  </p>
                  {idFileName ? (
                    <p
                      className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold"
                      style={{ color: accent }}
                    >
                      <Check className="h-4 w-4" /> {idFileName} uploaded
                    </p>
                  ) : null}
                  <label
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {busy === "id" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {idFileName ? "Replace ID" : "Upload ID"}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onIdFile(f);
                      }}
                    />
                  </label>
                </StepCard>
              )}

              {current?.key === "shipping" && (
                <StepCard
                  n={safeIndex + 1}
                  title="Shipping address"
                  done={shippingDone}
                  accent={accent}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      value={intake.shipping_name}
                      onChange={(v) => setIntake({ ...intake, shipping_name: v })}
                    />
                    <Field
                      label="Street address"
                      value={intake.shipping_address1}
                      onChange={(v) => setIntake({ ...intake, shipping_address1: v })}
                    />
                    <Field
                      label="Apt / suite (optional)"
                      value={intake.shipping_address2}
                      onChange={(v) => setIntake({ ...intake, shipping_address2: v })}
                    />
                    <Field
                      label="City"
                      value={intake.shipping_city}
                      onChange={(v) => setIntake({ ...intake, shipping_city: v })}
                    />
                    <Field
                      label="State"
                      value={intake.shipping_state}
                      onChange={(v) => setIntake({ ...intake, shipping_state: v })}
                    />
                    <Field
                      label="ZIP"
                      value={intake.shipping_zip}
                      onChange={(v) => setIntake({ ...intake, shipping_zip: v })}
                    />
                  </div>
                </StepCard>
              )}

              {current?.key === "onboarding-done" && (
                <StepCard
                  n={safeIndex + 1}
                  title="Next: your consultation"
                  done={current.done}
                  accent={accent}
                >
                  <p className="text-[15px] text-[#0F1E33]/75">
                    {current.done
                      ? "Your medical profile is complete. The next step is to pick a time for a short video or phone visit with a licensed practitioner."
                      : "Finish the steps above, then you'll be able to pick a time for your practitioner visit."}
                  </p>
                </StepCard>
              )}

              {current?.key === "payment" && (
                <StepCard n={safeIndex + 1} title="Payment & review" done={false} accent={accent}>
                  <p className="inline-flex items-start gap-2 text-[15px] text-[#0F1E33]/75">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
                    {labOnly
                      ? "Pay for this lab panel with PayPal. Your panel is sent to Quest as soon as the payment goes through."
                      : "Pay with PayPal to complete your order. Your order moves forward as soon as the payment goes through."}
                  </p>
                </StepCard>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex(Math.max(0, safeIndex - 1))}
                  disabled={safeIndex === 0}
                  className="w-full rounded-full border border-white/40 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:px-6"
                >
                  Back
                </button>
                {!isLast && (
                  <button
                    type="button"
                    onClick={() => setStepIndex(safeIndex + 1)}
                    disabled={!canAdvance}
                    className="w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:px-6"
                    style={{ backgroundColor: accent }}
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-2xl bg-white p-5 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-6 lg:sticky lg:top-24">
              {onboardingMode ? (
                <>
                  <h2 className="font-display text-xl font-bold">What happens next</h2>
                  <p className="mt-3 text-[15px] text-[#0F1E33]/75">
                    Nothing is purchased here. Once your intake, consents and photo ID are on file,
                    you'll book a short visit with a licensed practitioner. Medication can only be
                    ordered after they approve it.
                  </p>
                  {error && <p className="mt-4 text-[15px] font-semibold text-red-600">{error}</p>}
                  {onboardingProduct ? (
                    <Link
                      to="/product/$productId"
                      params={{ productId: onboardingProduct.id }}
                      className="mt-5 flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Back to my treatment
                    </Link>
                  ) : (
                    <Link
                      to="/account"
                      className="mt-5 flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Back to my dashboard
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold">Order summary</h2>
                  <ul className="mt-4 space-y-3 text-[15px]">
                    {items.map((i) => (
                      <li key={i.productId} className="flex justify-between gap-3">
                        <span className="text-[#0F1E33]/75">
                          {i.name} × {i.quantity}
                        </span>
                        <span className="shrink-0 font-semibold">
                          {formatPrice(i.priceCents * i.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between border-t border-[#0F1E33]/10 pt-4 text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{formatPrice(subtotalCents)}</span>
                  </div>

                  {error && <p className="mt-4 text-[15px] font-semibold text-red-600">{error}</p>}

                  {readyToSubmit && !paypalOn && (
                    <button
                      type="button"
                      onClick={submitOrder}
                      disabled={!readyToSubmit || busy === "order"}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: accent }}
                    >
                      {busy === "order" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      {labOnly ? "Place lab order" : "Place order"}
                    </button>
                  )}
                  {!readyToSubmit && (
                    <p className="mt-3 text-[15px] text-[#0F1E33]/60">
                      Complete every step above to pay.
                    </p>
                  )}
                  {readyToSubmit && (
                    <PayPalButton
                      ensureOrderId={ensureOrderId}
                      onPaid={finishOrder}
                      disabled={!readyToSubmit || busy === "order"}
                      onConfigured={setPaypalOn}
                    />
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 max-w-xl rounded-2xl bg-white p-5 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:mt-10 sm:rounded-3xl sm:p-8">
      {children}
    </div>
  );
}

function StepCard({
  n,
  title,
  done,
  accent,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl bg-white p-4 text-[#0F1E33] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
          style={{ backgroundColor: done ? accent : "#0F1E3355" }}
        >
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <h3 className="font-display text-xl font-bold">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  const cls =
    "mt-1.5 w-full rounded-xl border border-[#0F1E33]/15 bg-white px-3 py-2 text-[15px] text-[#0F1E33] outline-none focus:border-[#0F1E33]/40";
  return (
    <label className="block text-[15px] font-semibold text-[#0F1E33]">
      {label}
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}
