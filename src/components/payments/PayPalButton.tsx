import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { capturePaypalOrder, createPaypalOrder, paypalConfig } from "@/lib/paypal.functions";

type Cfg = { clientId: string; env: "sandbox" | "live" };

let sdkPromise: Promise<void> | null = null;

function loadSdk(clientId: string) {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal could not load."));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/**
 * Pay for an order with PayPal.
 *
 * `ensureOrderId` creates (or returns) the portal order the payment belongs to,
 * so the button works both before and after the order row exists.
 */
export function PayPalButton({
  ensureOrderId,
  onPaid,
  disabled,
  onConfigured,
}: {
  ensureOrderId: () => Promise<string>;
  onPaid: (orderId: string) => void;
  disabled?: boolean;
  /** Tells the parent whether online payment is available at all. */
  onConfigured?: (available: boolean) => void;
}) {
  const getConfig = useServerFn(paypalConfig);
  const runCreate = useServerFn(createPaypalOrder);
  const runCapture = useServerFn(capturePaypalOrder);

  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const localOrderId = useRef<string | null>(null);

  // Keep the latest callbacks without re-rendering the PayPal buttons.
  const cbRef = useRef({ ensureOrderId, onPaid, disabled, onConfigured });
  cbRef.current = { ensureOrderId, onPaid, disabled, onConfigured };

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const c = (await getConfig()) as Cfg | null;
        if (!alive) return;
        setCfg(c);
        cbRef.current.onConfigured?.(Boolean(c));
      } catch {
        if (!alive) return;
        setCfg(null);
        cbRef.current.onConfigured?.(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getConfig]);

  useEffect(() => {
    if (!cfg || !hostRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadSdk(cfg.clientId);
        const paypal = (window as any).paypal;
        if (cancelled || !paypal || !hostRef.current) return;
        hostRef.current.innerHTML = "";
        paypal
          .Buttons({
            style: { shape: "pill", height: 45, label: "pay" },
            onClick: (_d: unknown, actions: any) =>
              cbRef.current.disabled ? actions.reject() : actions.resolve(),
            createOrder: async () => {
              setError(null);
              const orderId = await cbRef.current.ensureOrderId();
              localOrderId.current = orderId;
              const res = await runCreate({ data: { orderId } });
              if (!res.paypalOrderId) throw new Error("This order is already paid.");
              return res.paypalOrderId;
            },
            onApprove: async (d: { orderID: string }) => {
              const orderId = localOrderId.current;
              if (!orderId) return;
              await runCapture({ data: { orderId, paypalOrderId: d.orderID } });
              cbRef.current.onPaid(orderId);
            },
            onError: (e: unknown) => {
              setError(e instanceof Error ? e.message : "PayPal could not complete the payment.");
            },
          })
          .render(hostRef.current);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "PayPal could not load.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg, runCreate, runCapture]);

  if (!cfg) return null;

  return (
    <div className="mt-5">
      <div ref={hostRef} />
      {!ready && !error && (
        <p className="flex items-center gap-2 text-[15px] text-[#0F1E33]/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading PayPal…
        </p>
      )}
      {error && <p className="mt-2 text-[15px] font-semibold text-red-600">{error}</p>}
      {cfg.env === "sandbox" && (
        <p className="mt-2 text-[13px] text-[#0F1E33]/60">
          Test mode — no real money is charged.
        </p>
      )}
    </div>
  );
}
