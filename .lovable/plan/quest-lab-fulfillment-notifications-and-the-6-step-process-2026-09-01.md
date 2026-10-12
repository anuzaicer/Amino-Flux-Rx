# Quest lab fulfillment, notifications, and the 6-Step Process

## What you get

**1. Lab orders flow into an admin portal**

When a customer buys any lab panel, that order is tracked with a Quest fulfillment status:

```text
Waiting for Quest Setup  ->  Quest Order Ready  ->  Results Received (optional)
```

- A new `/admin/quest` page (admin role only) lists every lab order with customer name, email, phone, the exact panel(s) purchased, order number, and date.
- You paste the Quest scheduling link or requisition/confirmation code for that customer, then click **Quest Order Ready**.
- Status, who marked it, and when are recorded for audit.

**2. Automatic customer emails**

- On purchase: "Payment received — we're setting up your Quest lab order. You'll get another email once it's ready."
- On **Quest Order Ready**: "Your Quest order is ready" with the link/code you entered, plus what to bring and what happens next.
- Both emails are sent from your own domain (afrx.anuzaicer.work). Setting up the sender domain is a prerequisite step — I'll open the setup dialog first; nothing else in the plan can send mail until it's verified.

**3. After labs: customer's choice**

The patient portal shows a clear fork once labs are done:
- Take results to their own doctor — nothing further needed here.
- Use the **Schedule** tab to book a lab review with a practitioner.

**4. Multi-practitioner scheduling (not Nicole-only)**

The schedule already stores slots per practitioner. The plan finishes generalizing it:
- Patients see all open slots across practitioners with the practitioner's name on each.
- Each practitioner manages only their own availability at `/provider/schedule`.
- Admins add new practitioners by granting the practitioner role from the admin portal — no code change to onboard a new one.
- Appointments carry a type: **Lab review** or **Treatment approval visit** (for testosterone and other controlled/review-required items), so the right visit gets booked before an order can proceed.

**5. The 6 STEP PROCESS, front and center**

A branded, reusable section:

> **The way of the future.** Order your medication online — no drive to the office, no waiting room. Six easy steps, delivered straight to your door.

1. Order your lab
2. Wait for the email that your order has been entered into Quest
3. Schedule your Quest appointment
4. Wait to receive your test results
5. Schedule your lab review with the nurse practitioner on the RX site
6. Order your approved controlled substance

Placed on: the homepage, a dedicated `/how-it-works` page, the product page (replacing the current "How to purchase" modal content so both match), and as a live progress tracker in the patient portal that highlights which of the six steps the customer is on right now.

## Technical notes

- **Schema**: add `quest_status` (`awaiting_setup` / `ready` / `results_received`), `quest_reference`, `quest_link`, `quest_ready_at`, `quest_ready_by` to a new `lab_fulfillments` table keyed to `orders`, created by a trigger when an order contains a `labs`-group item. Grants + RLS: patient reads own row; admin full access via `has_role`.
- Extend `appointment_status` usage with a new `appointment_type` enum (`lab_review`, `treatment_approval`) on `lab_appointments`, replacing the current note-prefix convention.
- Add admin-side RLS/policies so admins can read orders, order items, and profiles for fulfillment; a `listQuestQueue` / `markQuestReady` pair of server functions in `src/lib/admin.functions.ts` verifies the admin role through the user-scoped client before privileged writes.
- New routes: `src/routes/_authenticated/admin.quest.tsx`, `src/routes/how-it-works.tsx`; new component `src/components/process/SixStepProcess.tsx` reused across homepage, product page, and portal.
- Email: run email infrastructure setup + transactional scaffold, then two templates (`lab-order-received`, `quest-order-ready`) sent from the server function that creates the order and from `markQuestReady`, each with an idempotency key derived from the order ID.
- Portal step tracker derives its current step from order status, lab fulfillment status, uploaded lab documents, and appointment records — no new state to keep in sync.

## Order of work

1. Sender domain setup (blocking for emails).
2. Database migration: lab fulfillment table, appointment type, admin policies.
3. Admin Quest portal + practitioner management.
4. Email infrastructure, templates, and triggers.
5. Multi-practitioner scheduling polish and post-lab fork in the portal.
6. Six-step process content across site and portal.
