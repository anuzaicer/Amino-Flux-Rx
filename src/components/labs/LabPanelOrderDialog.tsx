import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cartItemForId, formatPrice, priceToCents } from "@/lib/cart-context";
import { requiredConsentsForCart, type ConsentTemplate } from "@/data/consents";
import { placeOrder } from "@/lib/purchase.functions";
import { PayPalButton } from "@/components/payments/PayPalButton";

/**
 * Buying the required blood-work panel straight from the treatment page.
 *
 * Two plain steps in one popup — sign the lab consent, then review and place
 * the order — so the patient never has to detour through the cart. The order
 * itself still goes through `placeOrder`, so every server-side gate applies.
 */
export function LabPanelOrderDialog({
  open,
  onOpenChange,
  panelId,
  panelName,
  panelDescription,
  panelPrice,
  forProductId,
  accent,
  onOrdered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  panelId: string;
  panelName: string;
  panelDescription: string;
  panelPrice: string;
  forProductId: string;
  accent: string;
  onOrdered?: () => void;
}) {
  const { user } = useAuth();
  const runPlaceOrder = useServerFn(placeOrder);

  const [step, setStep] = useState<0 | 1>(0);
  const [signedSlugs, setSignedSlugs] = useState<string[]>([]);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState<null | "sign" | "order">(null);
  const [paypalOn, setPaypalOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** The lab order row, once created — reused so paying never duplicates it. */
  const placedOrderIdRef = useRef<string | null>(null);

  const consents = useMemo<ConsentTemplate[]>(() => {
    const item = cartItemForId(panelId, forProductId);
    return item ? requiredConsentsForCart([{ ...item, quantity: 1 }]) : [];
  }, [panelId, forProductId]);

  const pending = consents.filter((c) => !signedSlugs.includes(c.slug));
  const consentsDone = pending.length === 0;
  const totalCents = priceToCents(panelPrice);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("consent_signatures")
      .select("consent_slug")
      .eq("user_id", user.id);
    setSignedSlugs((data ?? []).map((r) => r.consent_slug));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setOrderId(null);
    placedOrderIdRef.current = null;
    setAgreed({});
    setSignature("");
    void load();
  }, [open, load]);

  const sign = async () => {
    if (!user) return;
    if (!signature.trim()) {
      setError("Type your full legal name to sign.");
      return;
    }
    if (pending.some((c) => !agreed[c.slug])) {
      setError("Please tick every agreement before signing.");
      return;
    }
    setBusy("sign");
    setError(null);
    const { error: err } = await supabase.from("consent_signatures").insert(
      pending.map((c) => ({
        user_id: user.id,
        consent_slug: c.slug,
        consent_title: c.title,
        version: c.version,
        signed_name: signature.trim(),
      })),
    );
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSignedSlugs((prev) => [...prev, ...pending.map((c) => c.slug)]);
    setStep(1);
  };

  /** Creates the lab order once; shared by the manual button and PayPal. */
  const ensureOrderId = useCallback(async () => {
    if (placedOrderIdRef.current) return placedOrderIdRef.current;
    const res = await runPlaceOrder({
      data: {
        items: [{ productId: panelId, quantity: 1, forProductId }],
        shipping: { name: "", address1: "", address2: "", city: "", state: "", zip: "" },
      },
    });
    placedOrderIdRef.current = res.orderId;
    return res.orderId;
  }, [runPlaceOrder, panelId, forProductId]);

  const finish = (id: string) => {
    setOrderId(id);
    onOrdered?.();
    // Close straight away — the treatment step now shows the pending status
    // and moves on by itself once the care team confirms the order.
    onOpenChange(false);
  };

  const submit = async () => {
    setBusy("order");
    setError(null);
    try {
      finish(await ensureOrderId());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place your lab order.");
    } finally {
      setBusy(null);
    }
  };

  const stepTitles = ["Sign your lab consent", "Payment & review"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-slate-200 bg-[#F7F8FA] text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {orderId ? "Lab order placed" : `Order your blood work — ${panelName}`}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {orderId
              ? "Your requisition is being prepared. You can track it in your portal."
              : "Two quick steps. Nothing is added to your cart — you order this panel right here."}
          </DialogDescription>
        </DialogHeader>

        {orderId ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-[15px] text-slate-600">
              We'll email you as soon as your requisition is ready at Quest Diagnostics. Then book
              your draw and your results come back to your care team automatically.
            </p>
            <Link
              to="/account/orders/$orderId"
              params={{ orderId }}
              className="flex items-center justify-center rounded-full px-6 py-3 text-[15px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              View my lab order
            </Link>
          </div>
        ) : (
          <>
            {/* Step header */}
            <div className="flex items-center gap-2">
              {stepTitles.map((t, i) => (
                <div key={t} className="flex flex-1 flex-col gap-1.5">
                  <span
                    className="h-1.5 rounded-full"
                    style={{
                      backgroundColor: i <= step ? accent : "rgb(203 213 225)",
                    }}
                  />
                  <span
                    className={`text-[13px] font-semibold ${
                      i === step ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    Step {i + 1} · {t}
                  </span>
                </div>
              ))}
            </div>

            {loading ? (
              <p className="flex items-center gap-2 text-[15px] text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your record…
              </p>
            ) : step === 0 ? (
              <div className="space-y-3">
                {consentsDone ? (
                  <p
                    className="inline-flex items-center gap-2 text-[15px] font-semibold"
                    style={{ color: accent }}
                  >
                    <Check className="h-4 w-4" /> Your lab consent is already signed.
                  </p>
                ) : (
                  <>
                    {pending.map((c) => (
                      <div key={c.slug} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[15px] font-semibold text-slate-900">{c.title}</p>
                        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{c.body}</p>
                        <label className="mt-3 flex items-start gap-2 text-[15px] font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(agreed[c.slug])}
                            onChange={(e) => setAgreed({ ...agreed, [c.slug]: e.target.checked })}
                            className="mt-1"
                          />
                          I have read and agree to the {c.title}.
                        </label>
                      </div>
                    ))}
                    <label className="block text-[15px] font-semibold text-slate-900">
                      Type your full legal name to sign
                      <input
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                        placeholder="Your full name"
                      />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => (consentsDone ? setStep(1) : void sign())}
                  disabled={busy === "sign"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {busy === "sign" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {consentsDone ? "Continue to payment & review" : "Sign & continue"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[15px] font-semibold text-slate-900">{panelName}</p>
                  <p className="mt-1 text-[15px] text-slate-600">{panelDescription}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-[15px] text-slate-600">Total today</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPrice(totalCents) || panelPrice}
                    </span>
                  </div>
                </div>
                <p className="inline-flex items-start gap-2 text-[15px] text-slate-600">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
                  Pay with PayPal to confirm this panel. Your panel goes to Quest as soon as the
                  payment goes through.
                </p>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <PayPalButton
                    ensureOrderId={ensureOrderId}
                    onPaid={finish}
                    disabled={busy === "order"}
                    onConfigured={setPaypalOn}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Back
                  </button>
                  {!paypalOn && (
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={busy === "order"}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: accent }}
                    >
                      {busy === "order" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Place lab order
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="text-[13px] text-slate-500">
              Purchasing laboratory testing does not guarantee approval for medication or treatment.
              Lab fees are separate from medication fees.
            </p>
          </>
        )}

        {error && <p className="text-[15px] font-semibold text-red-600">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

export default LabPanelOrderDialog;
