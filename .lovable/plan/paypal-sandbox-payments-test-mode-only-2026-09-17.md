# PayPal Sandbox Payments (test mode only)

Goal: patients can actually pay in the portal with a PayPal sandbox (test) account, instead of the current "our care team will send you payment instructions" manual flow. No real money, nothing else in the clinical flow changes.

## What you need to do first

1. Create a free PayPal Developer account at developer.paypal.com.
2. In the dashboard, open Apps & Credentials, stay on the **Sandbox** tab, and create an app.
3. Copy the **Client ID** and **Secret** from that app.
4. In Sandbox > Accounts you get a fake buyer account (email + password) to test payments with.

When the plan is approved I'll ask you to paste the Client ID and Secret into a secure form. They are stored in the backend, never in the code.

## What the patient will see

- On the checkout "Payment & review" step and in the lab panel popup, a PayPal button appears next to the order summary.
- Pressing it opens the PayPal window, they log in with the sandbox buyer account and approve.
- The popup closes, the order is instantly marked **Paid**, and the treatment moves to its next step automatically — no waiting for the care team.
- A clear "Test mode — no real money is charged" note sits under the button while we're on sandbox.
- If PayPal isn't configured or fails, the existing manual "Place order" path stays available exactly as today, so nothing breaks.

## What stays the same

Blood work rules, practitioner review, approvals, controlled-substance gating, consents, photo ID, shipping rules, admin queues — all untouched. Admin can still mark an order paid by hand; PayPal simply becomes a second way the same "paid" state is reached.

## Technical details

- Secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (`sandbox`). All read inside handlers.
- New `src/lib/paypal.server.ts`: OAuth token fetch + Orders v2 `create` / `capture` calls against `https://api-m.sandbox.paypal.com`. Pure `fetch`, Worker-safe, no SDK.
- New `src/lib/paypal.functions.ts` (auth via `requireSupabaseAuth`):
  - `paypalConfig` — returns the public client ID + env so the button can render.
  - `createPaypalOrder({ orderId })` — loads the patient's own order, recomputes the total server-side from `order_items` (never trusts the client), creates the PayPal order, stores its id.
  - `capturePaypalOrder({ orderId })` — captures, verifies PayPal reports `COMPLETED` and the captured amount matches, then flips the order to `paid`, sets `paid_at`, and reuses the exact same post-payment side effects as the admin `markOrderPaid` in `src/lib/admin.functions.ts` (payment-received email, lab fulfilment unblocking). Idempotent: an already-paid order returns success without double work.
- Migration: nullable `orders.payment_provider text` and `orders.payment_ref text` so we can trace a payment back to its PayPal transaction. No status enum changes.
- New `src/components/payments/PayPalButton.tsx` — loads the PayPal JS SDK script once with the client ID, renders Buttons, calls the two server functions, reports success upward. Hidden when config is missing.
- Wired into `src/routes/checkout.tsx` (payment step, after `placeOrder` returns the order id) and `src/components/labs/LabPanelOrderDialog.tsx` (step 2), keeping the existing buttons as fallback.
- Honest wording updated only where it currently promises manual payment instructions, and only when PayPal is active.
- No webhook needed for sandbox: capture happens server-side in our own call, so we already know the outcome. A webhook can be added later if you go live.

## Going live later

Switching to real payments is only: create a Live app in PayPal, swap the two secrets, set `PAYPAL_ENV=live`. Recommend adding the PayPal webhook at that point for refunds/disputes.
