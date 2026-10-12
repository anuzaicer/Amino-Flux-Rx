import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Package,
  ShoppingCart,
  Upload,
  Video,
} from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabReviewScheduler } from "@/components/scheduling/LabReviewScheduler";
import { LabPanelOrderDialog } from "@/components/labs/LabPanelOrderDialog";
import { useGender } from "@/components/gender/GenderContext";
import { CATALOG, getLabRoute, panelForProduct } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { uploadLabResults } from "@/lib/purchase.functions";
import { myJourney, respondToInfoRequest, startEligibility } from "@/lib/journey.functions";
import {
  LAB_STATUS_LABEL,
  TELEHEALTH_TAG,
  consultAppointment,
  consultStatus,
  eligibilityFor,
  labStatus,
  medicationOrderStatus,
  missingOnboarding,
  onboardingComplete,
  resolveNextAction,
  treatmentStarted,
  treatmentStatus,
  type JourneyState,
} from "@/lib/journey";

type StepState = "done" | "current" | "locked";

/**
 * The gated purchase wizard on a product page. Every lock, label and next
 * action comes from the shared journey model, so the screen can never disagree
 * with the server-side eligibility gates in `placeOrder`.
 *
 * Order: variation -> blood work -> medical profile -> consultation ->
 * practitioner decision -> medication purchase.
 */
export function PurchasePath({
  productId,
  accent,
  requiresLabs,
  requiresTelehealth,
  hasVariations,
  variationChosen,
  variations = [],
}: {
  productId: string;
  accent: string;
  requiresLabs: boolean;
  requiresTelehealth: boolean;
  hasVariations: boolean;
  variationChosen: boolean;
  variations?: { id: string; label: string; price: string }[];
}) {
  const { user } = useAuth();
  const { gender } = useGender();
  const product = CATALOG.find((p) => p.id === productId);
  const route = product ? getLabRoute(product) : null;
  const panel = product ? panelForProduct(product, gender) : null;

  const loadJourney = useServerFn(myJourney);
  const runUpload = useServerFn(uploadLabResults);
  const runStart = useServerFn(startEligibility);
  const runRespond = useServerFn(respondToInfoRequest);

  const fileRef = useRef<HTMLInputElement>(null);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanels, setShowPanels] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await loadJourney();
      setJourney(res.state as JourneyState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your care status.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Progress is per treatment: switching products restarts the wizard at step 1
  // and re-reads that product's own labs, visit and decision.
  const resumedForRef = useRef<string | null>(null);
  useEffect(() => {
    resumedForRef.current = null;
    setStepIdx(0);
    setError(null);
    setShowPanels(false);
  }, [productId]);

  // The practitioner review episode is opened only when the patient confirms
  // step 1 themselves — nothing is started for them just by looking at a page.
  const [confirming, setConfirming] = useState(false);
  const confirmTreatment = async () => {
    setConfirming(true);
    setError(null);
    try {
      await runStart({ data: { productId } });
      await refresh();
      setStepIdx((i) => Math.max(i, 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start this treatment.");
    } finally {
      setConfirming(false);
    }
  };

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      buf.forEach((b) => (binary += String.fromCharCode(b)));
      await runUpload({
        data: {
          fileName: file.name,
          contentType: file.type || "application/pdf",
          dataBase64: btoa(binary),
          forProductId: productId,
        },
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const sendReply = async (approvalId: string) => {
    setSendingReply(true);
    setError(null);
    try {
      await runRespond({ data: { approvalId, message: reply } });
      setReply("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const ctx = useMemo(
    () => ({
      productId,
      productName: product?.name,
      requiresLabs,
      requiresConsult: true,
    }),
    [productId, product?.name, requiresLabs],
  );

  const labs = journey ? labStatus(journey, requiresLabs, productId) : "needed";
  const labsCleared = !requiresLabs || labs === "verified" || labs === "results_received";
  const labSource: "uploaded" | "purchased" = journey?.labDocs.some(
    (d) => d.forProductId === productId && d.labSource === "purchased",
  )
    ? "purchased"
    : "uploaded";

  // The patient has ordered their panel and is waiting on the care team.
  const labPending =
    requiresLabs &&
    (labs === "ordered" ||
      labs === "awaiting_quest_setup" ||
      labs === "under_review");

  // While the care team is working on the lab order, re-check quietly so the
  // patient moves forward the moment it is confirmed — no refresh needed.
  useEffect(() => {
    if (!labPending) return;
    const id = setInterval(() => void refresh(), 20000);
    return () => clearInterval(id);
  }, [labPending, refresh]);

  // When the blood-work step clears while the patient is sitting on it, take
  // them straight to the next step.
  const labsClearedRef = useRef(labsCleared);
  useEffect(() => {
    const labStepIdx = 1;
    if (labsCleared && !labsClearedRef.current) {
      setStepIdx((i) => (i === labStepIdx ? i + 1 : i));
    }
    labsClearedRef.current = labsCleared;
  }, [labsCleared]);


  const productDocs = journey ? journey.labDocs.filter((d) => d.forProductId === productId) : [];
  const profileDone = journey ? onboardingComplete(journey) : false;
  const missing = journey ? missingOnboarding(journey) : [];
  const consult = journey ? consultStatus(journey, true, productId) : "available";
  const consultBooked = consult === "booked" || consult === "completed";
  const appt = journey ? consultAppointment(journey, productId) : null;
  const decision = journey ? treatmentStatus(journey, productId) : "not_requested";
  const eligibility = journey ? eligibilityFor(journey, productId) : null;
  const med = journey ? medicationOrderStatus(journey, productId) : "locked";
  const canPurchase = med === "available_to_purchase" && (!hasVariations || variationChosen);

  type Step = {
    key: string;
    title: string;
    body: string;
    done: boolean;
    content: React.ReactNode;
  };
  const steps: Step[] = [];

  const started = journey ? treatmentStarted(journey, productId) : false;
  {
    // Always the first step, on every product, so "Step 1 of 6" means the same
    // thing everywhere. It is only ticked off once the patient confirms it.
    steps.push({
      key: "variation",
      title: hasVariations ? "Select your strength & supply" : "Confirm your treatment",
      body: hasVariations
        ? "Pick the dose and supply you want, then confirm to start this treatment."
        : "This treatment comes in one option. Confirm it to start.",
      done: started,
      content: (
        <div className="flex flex-wrap gap-2">
          {variations.map((v) => {
            const active = v.id === productId;
            return (
              <Link
                key={v.id}
                to="/product/$productId"
                params={{ productId: v.id }}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                  active
                    ? "border-transparent text-white"
                    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                style={active ? { backgroundColor: accent } : undefined}
              >
                {v.label} · {v.price}
              </Link>
            );
          })}
          <div className="w-full">
            {started ? (
              <p className="text-[13px] font-semibold text-slate-600">
                You started this treatment. Continue with the steps below.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void confirmTreatment()}
                disabled={confirming || !user}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {confirming ? "Starting…" : hasVariations ? "Confirm this option" : "Start this treatment"}
              </button>
            )}
          </div>
        </div>
      ),
    });
  }

  if (requiresLabs) {
    steps.push({
      key: "labs",
      title: "Upload or purchase your blood work",
      body:
        labs === "rejected"
          ? (journey?.labDocs.find((d) => d.status === "rejected")?.reviewNote ??
            "Your practitioner could not use the file you sent. Please send a clearer, more recent result.")
          : "This treatment needs its own blood work. Upload a recent result for this treatment, or purchase the exact panel it requires and have it drawn at Quest.",
      done: labsCleared,
      content: (
        <>
          <p className="border border-neutral-200 bg-white mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold text-slate-700">
            <ClipboardList className="h-3.5 w-3.5" /> {LAB_STATUS_LABEL[labs]}
          </p>
          {labPending && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <Loader2 className="h-4 w-4 animate-spin" /> Pending — waiting on our care team
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                {labs === "under_review"
                  ? "Your practitioner is reviewing the results you sent. This step moves on by itself as soon as they are accepted."
                  : "Your lab order is in. We'll confirm your payment and set it up at Quest Diagnostics — this step moves on by itself as soon as that's done. You don't need to do anything now."}
              </p>
            </div>
          )}
          {!labsCleared && !labPending && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload lab results
              </button>
              <button
                type="button"
                onClick={() => setShowPanels(true)}
                className="border border-neutral-200 bg-white inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ShoppingCart className="h-4 w-4" /> Purchase lab panel
              </button>
            </div>
          )}
          {productDocs.length > 0 && (
            <p className="mt-3 text-[15px] text-slate-600">
              Newest file for this treatment: {productDocs[0]?.fileName} (
              {productDocs[0]?.status.replace("_", " ")}).
            </p>
          )}
        </>
      ),
    });
  }

  steps.push({
    key: "profile",
    title: "Complete your medical profile",
    body: profileDone
      ? "Your intake, consents and photo ID are on file."
      : `Your practitioner needs your medical intake, signed consents and a government photo ID before the visit.${
          missing.length ? ` Still needed: ${missing.join(", ")}.` : ""
        }`,
    done: profileDone,
    content: profileDone ? null : (
      <Link
        to="/checkout"
        search={{ onboarding: true, product: productId }}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110"
        style={{ backgroundColor: accent }}
      >
        <ClipboardList className="h-4 w-4" /> Complete my profile
      </Link>
    ),
  });

  steps.push({
    key: "consult",
    title: "Book your practitioner consultation",
    body: consultBooked
      ? "Your visit is booked. Your practitioner will review your labs and decide on this treatment."
      : "This treatment needs its own visit. Pick a date, then an open time to meet a licensed practitioner on Zoom or by phone.",
    done: consultBooked,
    content: consultBooked ? (
      <p className="flex flex-wrap items-center gap-2 text-[15px] text-slate-600">
        <Video className="h-4 w-4" />
        {appt?.slotDate ? `${appt.slotDate} · ${appt.startTime?.slice(0, 5)} · ` : ""}
        {appt?.providerName ?? "Your practitioner"} — manage it in{" "}
        <Link to="/account" className="font-semibold underline">
          your portal
        </Link>
        .
      </p>
    ) : (
      <div className="rounded-2xl bg-white p-4 text-[#0F1E33]">
        <LabReviewScheduler
          labSource={labSource}
          appointmentType={requiresTelehealth ? "treatment_approval" : "initial_consult"}
          notePrefix={`${TELEHEALTH_TAG} ${product?.name ?? ""}`.trim()}
          forProductId={productId}
          confirmTitle="Consultation scheduled"
          onBooked={refresh}
        />
      </div>
    ),
  });

  steps.push({
    key: "decision",
    title: "Practitioner decision",
    body:
      decision === "approved"
        ? "Approved. You can complete your purchase in the final step."
        : decision === "denied"
          ? (eligibility?.providerNote ??
            "Your practitioner decided this treatment isn't right for you. You have not been charged.")
          : decision === "more_information_required"
            ? (eligibility?.patientMessage ??
              "Your practitioner needs a little more information before deciding.")
            : "After your visit, your practitioner records their decision here. You'll be emailed as soon as it's made.",
    done: decision === "approved",
    content:
      decision === "more_information_required" && eligibility ? (
        <div className="space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Write your reply to your practitioner…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-[15px] text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="button"
            disabled={sendingReply || !reply.trim()}
            onClick={() => void sendReply(eligibility.id)}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reply
          </button>
        </div>
      ) : null,
  });

  steps.push({
    key: "purchase",
    title: "Order your medication",
    body: canPurchase
      ? "You're cleared — add this medication to your cart and check out. It ships from a licensed pharmacy straight to your door."
      : decision === "denied"
        ? "This treatment was not approved, so it can't be purchased."
        : "Unlocks the moment your practitioner approves this treatment.",
    done:
      med === "submitted" ||
      med === "paid" ||
      med === "fulfilling" ||
      med === "shipped" ||
      med === "delivered",
    content: canPurchase ? (
      <AddToCartButton
        productId={productId}
        accent={accent}
        className="w-full px-6 py-3 text-base"
      />
    ) : (
      <span className="border border-neutral-200 bg-slate-100 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-slate-500">
        <Package className="h-4 w-4" /> Locked — finish the steps above
      </span>
    ),
  });

  // Later steps unlock as earlier ones are completed.
  const firstIncomplete = steps.findIndex((s) => !s.done);
  const maxStep = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  // Resume where the patient left off: once this product's saved progress has
  // loaded, land them on the first step they still need to finish.
  useEffect(() => {
    if (!user || loading || !journey) return;
    if (resumedForRef.current === productId) return;
    resumedForRef.current = productId;
    setStepIdx(maxStep);
  }, [user, loading, journey, productId, maxStep]);


  if (!user) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-base font-semibold text-slate-900">Sign in to start your treatment path</p>
        <p className="mt-1 text-[15px] text-slate-600">
          This therapy needs {requiresLabs ? "blood work and " : ""}a licensed practitioner's
          approval before it can be purchased.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-5 text-[15px] text-slate-700">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your care status…
      </div>
    );
  }

  const current = Math.min(Math.max(stepIdx, 0), steps.length - 1);
  const step = steps[current];
  if (!step) return null;
  const atLast = current === steps.length - 1;
  const canGoNext = step.done && !atLast;
  const nextAction = journey ? resolveNextAction(journey, ctx) : null;
  const stateOf = (i: number): StepState =>
    steps[i]?.done ? "done" : i === maxStep ? "current" : "locked";

  return (
    <div className="rounded-[1.25rem] border border-neutral-200 bg-white p-5 md:p-6">
      <h2 className="font-display text-lg font-semibold text-slate-900 md:text-xl">
        Your path to this prescription
      </h2>
      {nextAction && (
        <p className="mt-1 text-[15px] text-slate-600">
          <span className="font-semibold text-slate-900">Next:</span> {nextAction.title}
        </p>
      )}

      {/* Progress dots */}
      <div className="mt-4 flex items-center gap-2">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => i <= maxStep && setStepIdx(i)}
            disabled={i > maxStep}
            aria-label={`Step ${i + 1}: ${s.title}`}
            aria-current={i === current ? "step" : undefined}
            className={`h-2 flex-1 rounded-full transition ${
              i <= maxStep ? "cursor-pointer" : "cursor-not-allowed opacity-40"
            }`}
            style={{ backgroundColor: i <= current ? accent : "rgb(203 213 225)" }}
          />
        ))}
      </div>
      <p className="mt-2 text-[15px] font-medium text-slate-600">
        Step {current + 1} of {steps.length}
      </p>

      {/* Current step screen */}
      <div className="mt-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
            style={{
              backgroundColor: stateOf(current) === "locked" ? "rgb(148 163 184)" : accent,
            }}
          >
            {step.done && !atLast ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : stateOf(current) === "locked" ? (
              <Lock className="h-4 w-4" />
            ) : (
              current + 1
            )}
          </span>
          {step.title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.body}</p>
        {step.content ? <div className="mt-4">{step.content}</div> : null}
      </div>

      {/* Wizard navigation */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={current === 0}
          className="border border-neutral-200 bg-white inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
        >
          Back
        </button>
        {!atLast && (
          <button
            type="button"
            onClick={() => canGoNext && setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            disabled={!canGoNext}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Next
          </button>
        )}
      </div>

      {panel ? (
        <LabPanelOrderDialog
          open={showPanels}
          onOpenChange={setShowPanels}
          panelId={panel.id}
          panelName={panel.name}
          panelDescription={panel.description}
          panelPrice={panel.price}
          forProductId={productId}
          accent={accent}
          onOrdered={refresh}
        />
      ) : (
        <Dialog open={showPanels} onOpenChange={setShowPanels}>
          <DialogContent className="max-w-lg border-white/15 bg-[#0F1E33] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                Required lab panel{route?.label ? ` — ${route.label}` : ""}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Choose your care path (men or women) so we can select the right panel.
              </DialogDescription>
            </DialogHeader>
            <p className="text-[15px] text-white/75">
              <Link to="/lab-testing" className="font-semibold underline">
                Browse all panels
              </Link>
            </p>
          </DialogContent>
        </Dialog>
      )}

      {error && <p className="mt-4 text-[15px] font-semibold text-red-300">{error}</p>}
    </div>
  );
}

export default PurchasePath;
