/**
 * Minimal PayPal Orders v2 client.
 *
 * Plain `fetch` only — no SDK, so it runs in the Worker runtime. Credentials
 * are read inside the calls (never at module scope) and never leave the server.
 */

type PayPalEnv = "sandbox" | "live";

function config() {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  const env = (process.env["PAYPAL_ENV"] ?? "sandbox") as PayPalEnv;
  if (!clientId || !secret) return null;
  return {
    clientId,
    secret,
    env,
    base: env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

export function paypalPublicConfig(): { clientId: string; env: PayPalEnv } | null {
  const c = config();
  return c ? { clientId: c.clientId, env: c.env } : null;
}

async function accessToken() {
  const c = config();
  if (!c) throw new Error("PayPal is not configured.");
  const res = await fetch(`${c.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${c.clientId}:${c.secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? "Could not reach PayPal.");
  }
  return { token: json.access_token, base: c.base };
}

/** Creates a PayPal order for an exact amount and returns its PayPal id. */
export async function createPaypalOrderRemote(input: {
  amountCents: number;
  reference: string;
  description: string;
}) {
  const { token, base } = await accessToken();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          description: input.description.slice(0, 127),
          amount: { currency_code: "USD", value: (input.amountCents / 100).toFixed(2) },
        },
      ],
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message ?? "PayPal could not start this payment.");
  return json.id;
}

/** Captures an approved PayPal order. Returns the completed amount in cents. */
export async function capturePaypalOrderRemote(paypalOrderId: string) {
  const { token, base } = await accessToken();
  const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const json = (await res.json()) as any;
  if (!res.ok) {
    // Already captured is a success for us — the money is in.
    const issue = json?.details?.[0]?.issue;
    if (issue === "ORDER_ALREADY_CAPTURED") {
      return { status: "COMPLETED", amountCents: null as number | null, captureId: null };
    }
    throw new Error(json?.message ?? "PayPal could not complete this payment.");
  }
  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0];
  const value = capture?.amount?.value;
  return {
    status: String(json?.status ?? capture?.status ?? ""),
    amountCents: value ? Math.round(Number(value) * 100) : null,
    captureId: capture?.id ? String(capture.id) : null,
  };
}
