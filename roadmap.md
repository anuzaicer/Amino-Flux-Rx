# Amino Flux Rx — UX roadmap

## Homepage presentation — DONE

- [x] Use a strong blue background for the 6 Step Process section with readable light content.
- [x] Remove forced section-by-section paging and restore normal continuous homepage scrolling.

## Authentication presentation — DONE

- [x] Rebuild the sign-in and registration page as a standalone experience without the site header/footer, with clear success confirmation before the next step.

## Phase 2 — Patient command center (/account) — DONE

- [x] Journey resolver: "What happens next" line, action/waiting/done/blocked/start tones, stage key, no-active-journey state, lab-review-booked state, Quest status precedence over payment status
- [x] Timeline builder + active-care items in `src/lib/journey.ts`
- [x] Rebuilt `NextActionCard` (single CTA, "Nothing needed from you right now", practitioner note, appointment details, mobile-first)
- [x] `PatientProgress.tsx`: adaptive progress timeline + "What you're working on"
- [x] `/account`: card + timeline + active care above the tabs, plain-English tabs, attention/count indicators, hash ⇄ tab sync
- [x] `PurchasePath`: submitted/pending-payment medication orders count as placed
- [x] Verified: typecheck clean, signed-out redirect to /auth, desktop + 390px layouts

## Phase 3 candidates

- [x] Blood-draw booked/completed tracking — `lab_fulfillments.draw_booked_at` / `draw_completed_at`, patient-confirmed in the portal (self-reported progress only; replace with a real Quest integration if one becomes available). Base `quest_status` enum unchanged.
- Lab-panel payment has no online flow; orders stay `pending_payment` while Quest proceeds
- Delivery confirmation (`delivered`) has no data source; shipped is the last real state
- Care-team messaging — DONE: secure async portal inbox; realtime/attachments are not required
- [x] `/account` auth gate: moved under `_authenticated/` layout (beforeLoad redirect to /auth with return-to); client-side useEffect redirect removed
- [x] `/admin` and `/provider` moved under the same `_authenticated/` boundary (signed-out visitors redirect to /auth before portal UI renders); role checks (admin / clinical staff) remain as a separate authorization layer after authentication
- No seeded/staging patient session available, so signed-in states were verified through a render harness rather than the live dashboard

## Phase 3 — payments (interim)

- [x] Honest manual payment-confirmation bridge: admin `markLabOrderPaid` attestation, server-side Quest release gate (`paid` required), admin Payment needed queue, honest patient/checkout/email copy.
- [ ] Online self-service card payment — still requires a real payment provider (Stripe or equivalent) with credentials and a webhook. NOT complete.

## Phase 3 — delivery confirmation

- [x] Delivery confirmation: patient self-confirmed delivery (`orders.delivered_at`); carrier webhook remains a future enhancement.

## Phase 3 — admin command center

- [x] Action-oriented admin queues: Payments, Lab panel orders (Quest setup, blood-draw confirmation, required report upload), Treatment, and Fulfillment, each with counts and empty states. The duplicate Lab operations navigation tab was removed.
- [x] Generalized manual payment bridge to medication orders (`markOrderPaid`); paid medication orders now reach the fulfillment queue instead of stalling in `pending_payment`.
- [ ] Full three-role end-to-end QA: blocked — no isolated staging environment or test staff/patient session available without touching production records.

## Three-dashboard responsive pass

- [x] Make admin, patient, and practitioner dashboards fully usable on mobile and tablet without changing workflow logic.
- [x] Verify phone and tablet layouts for horizontal overflow, navigation, dense cards, forms, and action controls.

## Phase 3 — lifecycle notifications

Event-triggered (live as soon as the code deploys — each fires inside the server function that changes the state):

- [x] Appointment booked → confirmation (pre-existing, preserved)
- [x] Quest order ready / scheduling link (pre-existing, preserved)
- [x] Uploaded labs verified / rejected, with the practitioner's rejection reason (pre-existing, preserved)
- [x] More information requested (pre-existing, preserved)
- [x] Treatment approved / denied (pre-existing, preserved; approval copy does not imply payment was taken)
- [x] Order shipped with carrier + tracking (pre-existing, preserved)
- [x] NEW — Lab results received → "results are in your portal" (no values in the email or subject), sent from `markResultsReceived`
- [x] NEW — Manual payment confirmed → receipt worded as "payment recorded/confirmed", explicitly not a card charge, sent from `markOrderPaid`
- [x] NEW — Missed visit follow-up, sent when staff mark a booked visit `no_show` in the provider portal (`setAppointmentOutcome`). No automated no-show detection exists and none was invented.
- Patient reply to a "more information" request: no staff email. Staff see it in the provider/admin queues and in the portal inbox; there is no verified staff notification address to send to.

Scheduled reminders (implemented and idempotent, but NOT yet firing — they require an external scheduler to call the runner):

- [ ] 24-hour and 1-hour appointment reminders
- [ ] Approved-but-not-ordered reminders at ~24h and ~48h
- Runner: `POST /api/public/hooks/notifications` with header `x-cron-secret: $NOTIFICATION_CRON_SECRET`. NOT SCHEDULED. Blocker verified 2026-09-08: the database has no scheduler installed — extensions present are `plpgsql`, `pg_stat_statements`, `uuid-ossp`, `pgcrypto`, `supabase_vault` only; there is no `pg_cron`/`pg_net` and no other configured job runner. Scheduling would require enabling both extensions AND storing the runner secret where the cron job can read it (Vault + a wrapper, since a plain `cron.schedule` body would keep the secret in cleartext in `cron.job`, readable by anyone with DB access). That is a deliberate infrastructure decision, so it was left undone rather than done insecurely. Until it is scheduled, no appointment reminder and no approved-not-ordered reminder is ever sent; every event-triggered email above is unaffected.
- `no_show`: verified against the live schema — `lab_appointments.status` is enum `appointment_status` and already contains `scheduled | completed | cancelled | no_show`, with no CHECK constraint. No migration was needed and none was made; `setAppointmentOutcome` writes a valid value.

Idempotency: every lifecycle send goes through `sendOnce` in `src/lib/notifications.server.ts`, which claims a deterministic key in `public.notification_log` (service-role only, RLS on, no policies) before sending and passes the same key to the email API. Keys: `appointment-reminder-24h:<appointmentId>`, `appointment-reminder-1h:<appointmentId>`, `approved-not-ordered-24h|48h:<approvalId>`, `lab-results-ready:<fulfillmentId>`, `payment-received:<orderId>`, `appointment-missed:<appointmentId>`. Re-running the runner is safe. Suppression: reminders only consider `scheduled` appointments in the future and `approved` approvals with no medication order placed since the decision.
