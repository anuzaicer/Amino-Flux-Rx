/**
 * Pure, shared model of where a patient is in the Amino Flux journey.
 *
 * The server builds a `JourneyState` snapshot (see `journey.functions.ts`) and
 * both the patient dashboard and the gated product wizard derive every label,
 * lock and "what do I do next" card from these helpers — so the UI can never
 * disagree with the server-side eligibility gates.
 */
import { STATUS_LABEL } from "@/lib/order-status";
import { CATALOG } from "@/data/catalog";

export type LabStatus =
  | "not_required"
  | "needed"
  | "ordered"
  | "awaiting_quest_setup"
  | "quest_ready"
  | "awaiting_draw"
  | "awaiting_results"
  | "results_received"
  | "under_review"
  | "verified"
  | "rejected";

export type ConsultStatus =
  | "not_required"
  | "available"
  | "booked"
  | "completed"
  | "cancelled"
  | "no_show";

export type TreatmentStatus =
  | "not_requested"
  | "pending_review"
  | "more_information_required"
  | "approved"
  | "denied";

export type MedicationOrderStatus =
  | "locked"
  | "available_to_purchase"
  | "submitted"
  | "paid"
  | "fulfilling"
  | "shipped"
  | "delivered";

export type JourneyLabDoc = {
  id: string;
  /** Treatment this blood work was uploaded for. Null for legacy/general files. */
  forProductId: string | null;
  fileName: string;
  status: string;
  reviewNote: string | null;
  labSource: string | null;
  createdAt: string;
};

export type JourneyFulfillment = {
  id: string;
  /** Treatment this lab panel was purchased for. Null for standalone panels. */
  forProductId: string | null;
  status: string;
  questLink: string | null;
  questReference: string | null;
  orderId: string;
  orderNumber: string | null;
  orderStatus: string | null;
  drawBookedAt: string | null;
  drawCompletedAt: string | null;
};

export type JourneyAppointment = {
  id: string;
  /** Treatment this visit was booked for. Null for general visits. */
  forProductId: string | null;
  appointmentType: string;
  status: string;
  slotDate: string | null;
  startTime: string | null;
  meetingMode: string | null;
  providerName: string | null;
  notes: string | null;
};

export type JourneyEligibility = {
  id: string;
  productId: string | null;
  productName: string | null;
  /** Set only after the patient explicitly confirms Step 1 for this treatment. */
  patientConfirmedAt: string | null;
  status: string;
  patientMessage: string | null;
  providerNote: string | null;
  decidedAt: string | null;
  orderId: string | null;
  /** Last time anything moved on this treatment. */
  updatedAt: string | null;
};

export type JourneyOrder = {
  id: string;
  orderNumber: string;
  status: string;
  labOnly: boolean;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: { productId: string; productName: string; group: string }[];
};

export type JourneyState = {
  intakeSubmitted: boolean;
  photoIdOnFile: boolean;
  consentSlugs: string[];
  labDocs: JourneyLabDoc[];
  fulfillments: JourneyFulfillment[];
  appointments: JourneyAppointment[];
  eligibility: JourneyEligibility[];
  orders: JourneyOrder[];
};

export const EMPTY_JOURNEY: JourneyState = {
  intakeSubmitted: false,
  photoIdOnFile: false,
  consentSlugs: [],
  labDocs: [],
  fulfillments: [],
  appointments: [],
  eligibility: [],
  orders: [],
};

export const TELEHEALTH_TAG = "[Telehealth approval visit]";
export const LAB_REVIEW_TAG = "[Lab review]";

const LIVE_APPOINTMENT = ["scheduled", "completed"];
const QUEST_SCHEDULING_URL = "https://appointment.questdiagnostics.com/as-home";
const CARE_TEAM_CTA = { label: "Message my care team", to: "/account", hash: "messages" } as const;

/* ── Per-treatment scoping ──────────────────────────────
 * Every treatment needs its own fresh blood work and its own practitioner
 * visit, so records carry the treatment they were created for. When a
 * `productId` is supplied, only records tagged with that treatment count.
 */

export function scopedDocs(state: JourneyState, productId?: string): JourneyLabDoc[] {
  if (!productId) return state.labDocs;
  return state.labDocs.filter((d) => d.forProductId === productId);
}

export function scopedFulfillments(
  state: JourneyState,
  productId?: string,
): JourneyFulfillment[] {
  if (!productId) return [...state.fulfillments];
  return state.fulfillments.filter((f) => f.forProductId === productId);
}

export function scopedAppointments(
  state: JourneyState,
  productId?: string,
): JourneyAppointment[] {
  const live = liveAppointments(state);
  if (!productId) return live;
  return live.filter((a) => a.forProductId === productId);
}

/** The lab panel order the patient is currently working through, if any. */
export function activeFulfillment(
  state: JourneyState,
  productId?: string,
): JourneyFulfillment | null {
  const ordered = scopedFulfillments(state, productId);
  return ordered.find((f) => f.status !== "results_received") ?? ordered[0] ?? null;
}

/**
 * Where the patient's blood work stands, across upload and Quest paths.
 *
 * Quest progress (admin marked the order ready / results received) always
 * outranks the lab order's payment status: staff enter the panel at Quest as
 * soon as the order arrives, so a "pending payment" order must never hide a
 * live Quest scheduling link.
 */
export function labStatus(
  state: JourneyState,
  required = true,
  productId?: string,
): LabStatus {
  if (!required) return "not_required";

  const docs = scopedDocs(state, productId);
  if (docs.some((d) => d.status === "verified")) return "verified";
  if (docs.length && docs.every((d) => d.status === "rejected")) return "rejected";
  if (docs.some((d) => d.status === "pending_review")) return "under_review";

  const f = activeFulfillment(state, productId);
  if (f) {
    if (f.status === "results_received") return "results_received";
    if (f.status === "ready") {
      if (f.drawCompletedAt) return "awaiting_results";
      if (f.drawBookedAt) return "awaiting_draw";
      return "quest_ready";
    }
    if (f.orderStatus === "pending_payment") return "ordered";
    return "awaiting_quest_setup";
  }
  return "needed";
}

/** Whether the clinical onboarding needed before a consultation is complete. */
export function onboardingComplete(state: JourneyState): boolean {
  return state.intakeSubmitted && state.photoIdOnFile && state.consentSlugs.length > 0;
}

export function missingOnboarding(state: JourneyState): string[] {
  const missing: string[] = [];
  if (!state.intakeSubmitted) missing.push("Medical intake");
  if (state.consentSlugs.length === 0) missing.push("Consents & agreements");
  if (!state.photoIdOnFile) missing.push("Government photo ID");
  return missing;
}

function liveAppointments(state: JourneyState) {
  return state.appointments.filter((a) => LIVE_APPOINTMENT.includes(a.status));
}

/** True when the patient has a treatment consultation booked or completed. */
export function consultAppointment(
  state: JourneyState,
  productId?: string,
): JourneyAppointment | null {
  return (
    scopedAppointments(state, productId).find(
      (a) =>
        a.appointmentType === "treatment_approval" ||
        a.appointmentType === "initial_consult" ||
        a.notes?.includes(TELEHEALTH_TAG),
    ) ?? null
  );
}

export function labReviewAppointment(state: JourneyState): JourneyAppointment | null {
  return (
    liveAppointments(state).find(
      (a) => a.appointmentType === "lab_review" && !a.notes?.includes(TELEHEALTH_TAG),
    ) ?? null
  );
}

/** The soonest visit that is still on the calendar, of any type. */
export function upcomingAppointment(state: JourneyState): JourneyAppointment | null {
  const scheduled = state.appointments.filter((a) => a.status === "scheduled" && a.slotDate);
  scheduled.sort((a, b) =>
    `${a.slotDate}T${a.startTime ?? ""}`.localeCompare(`${b.slotDate}T${b.startTime ?? ""}`),
  );
  return scheduled[0] ?? null;
}

export function consultStatus(
  state: JourneyState,
  required = true,
  productId?: string,
): ConsultStatus {
  if (!required) return "not_required";
  const appt = consultAppointment(state, productId);
  if (!appt) return "available";
  if (appt.status === "completed") return "completed";
  return "booked";
}

/** The practitioner's eligibility decision for a specific product. */
export function eligibilityFor(state: JourneyState, productId?: string): JourneyEligibility | null {
  const rows = state.eligibility;
  // A decision belongs to one treatment only — never fall back to another
  // product's review, or an unstarted treatment would look already started.
  if (productId) return rows.find((r) => r.productId === productId) ?? null;
  return rows[0] ?? null;
}

export function treatmentStatus(state: JourneyState, productId?: string): TreatmentStatus {
  const row = eligibilityFor(state, productId);
  if (!row) return "not_requested";
  if (row.status === "approved") return "approved";
  if (row.status === "denied") return "denied";
  if (row.status === "more_info") return "more_information_required";
  return "pending_review";
}

/** The medication (non-lab) order the patient is working through, if any. */
export function medicationOrder(state: JourneyState, productId?: string): JourneyOrder | null {
  return (
    state.orders.find(
      (o) =>
        !o.labOnly &&
        o.status !== "cancelled" &&
        (!productId || o.items.some((i) => i.productId === productId)),
    ) ?? null
  );
}

export function medicationOrderStatus(
  state: JourneyState,
  productId?: string,
): MedicationOrderStatus {
  const order = medicationOrder(state, productId);
  if (order) {
    if (order.status === "fulfilled") {
      if (order.deliveredAt) return "delivered";
      return order.trackingNumber ? "shipped" : "fulfilling";
    }
    if (order.status === "paid" || order.status === "approved") return "paid";
    if (order.status === "pending_payment" || order.status === "in_review") return "submitted";
  }
  return treatmentStatus(state, productId) === "approved" ? "available_to_purchase" : "locked";
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

export type AppointmentDisplay = {
  date: string;
  time: string;
  mode: string;
  provider: string;
};

/** "Tue, Mar 3 · 9:15 AM · Zoom with Nicole" from the raw slot fields. */
export function describeAppointment(a: JourneyAppointment | null): AppointmentDisplay | null {
  if (!a || !a.slotDate) return null;
  const [y, m, d] = a.slotDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  let time = "";
  if (a.startTime) {
    const [h, min] = a.startTime.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    time = `${hour}:${String(min ?? 0).padStart(2, "0")} ${suffix}`;
  }
  const mode =
    a.meetingMode === "phone" ? "Phone call" : a.meetingMode === "zoom" ? "Zoom video" : "Video";
  return { date, time, mode, provider: a.providerName ?? "your practitioner" };
}

// ---------------------------------------------------------------------------
// Next action resolver
// ---------------------------------------------------------------------------

export type NextActionCta = {
  label: string;
  to?: string;
  hash?: string;
  href?: string;
  params?: Record<string, string>;
  search?: Record<string, string | boolean>;
};

/** Which part of the journey an action belongs to — drives the timeline. */
export type JourneyStage =
  | "labs"
  | "quest"
  | "results"
  | "review"
  | "decision"
  | "medication"
  | "order"
  | "preparing"
  | "shipped";

export type NextActionTone = "action" | "waiting" | "done" | "blocked" | "start";

export type NextAction = {
  key: string;
  /**
   * `action` — the patient must do something now.
   * `waiting` — nothing needed from the patient; staff or Quest are working.
   * `done` — this leg is complete.
   * `blocked` — a practitioner decision stopped this path.
   * `start` — no active journey yet.
   */
  tone: NextActionTone;
  stage: JourneyStage;
  title: string;
  body: string;
  /** One plain-English line: what happens after the current state. */
  whatNext: string;
  /** Verbatim practitioner note or reason — never hidden behind generic copy. */
  detail?: { label: string; text: string };
  /** Appointment details when a visit is on the calendar. */
  when?: AppointmentDisplay;
  /** Primary call to action. `href` is used for external links (Quest). */
  cta?: NextActionCta;
  secondary?: NextActionCta;
  /** Entry points for the "no active journey" state only. */
  choices?: NextActionCta[];
};

export type JourneyContext = {
  /** Product the patient is working towards, if this is a treatment journey. */
  productId?: string;
  productName?: string;
  requiresLabs?: boolean;
  requiresConsult?: boolean;
};

/** Anything at all on record beyond the bare account. */
export function hasActiveJourney(state: JourneyState): boolean {
  return (
    state.fulfillments.length > 0 ||
    state.labDocs.length > 0 ||
    state.eligibility.length > 0 ||
    state.orders.some((o) => o.status !== "cancelled") ||
    liveAppointments(state).length > 0
  );
}

export type JourneyKind = "quest" | "upload" | "direct";

/**
 * Which shape the active journey has: Quest-drawn labs (the 6-step process),
 * patient-uploaded labs, or a direct order that needs no labs or review.
 */
export function journeyKind(state: JourneyState, ctx: JourneyContext = {}): JourneyKind {
  if (ctx.requiresLabs === false && ctx.requiresConsult === false) return "direct";
  const clinical =
    state.fulfillments.length > 0 ||
    state.labDocs.length > 0 ||
    state.eligibility.length > 0 ||
    liveAppointments(state).length > 0;
  if (!ctx.productId && !clinical && medicationOrder(state)) return "direct";
  if (state.labDocs.length > 0 && state.fulfillments.length === 0) return "upload";
  return "quest";
}

const orderLink = (orderId: string, label = "View this order"): NextActionCta => ({
  label,
  to: "/account/orders/$orderId",
  params: { orderId },
});

const productLink = (productId: string, label: string): NextActionCta => ({
  label,
  to: "/product/$productId",
  params: { productId },
});

/** Direct (no labs, no review) medication order states. */
function resolveDirectOrder(order: JourneyOrder): NextAction {
  const what = order.items.map((i) => i.productName).join(", ") || "your order";
  if (order.status === "fulfilled" && order.deliveredAt) {
    return {
      key: "order_delivered",
      tone: "done",
      stage: "shipped",
      title: "Your order was delivered",
      body: `You confirmed receipt of ${order.orderNumber} in your portal on ${new Date(order.deliveredAt).toLocaleDateString()}.`,
      whatNext: "Need more later? Request a refill from your order page.",
      cta: orderLink(order.id, "View this order"),
    };
  }
  if (order.status === "fulfilled") {
    return {
      key: "order_shipped",
      tone: "done",
      stage: "shipped",
      title: order.trackingNumber ? "Your order has shipped" : "Your order is on its way",
      body: order.trackingNumber
        ? `${order.carrier ?? "Carrier"} tracking number ${order.trackingNumber}. Nothing needed from you right now.`
        : `${order.orderNumber} has left the pharmacy. Nothing needed from you right now.`,
      whatNext:
        "Track your package with the carrier, then confirm receipt on your order page once it arrives.",
      cta: orderLink(order.id, "Track my order"),
    };
  }
  if (order.status === "denied") {
    return {
      key: "order_denied",
      tone: "blocked",
      stage: "preparing",
      title: "This order wasn't approved",
      body: `A practitioner reviewed ${order.orderNumber} and could not approve it. You have not been charged for medication.`,
      whatNext: "Open the order to read the note, or message the care team with any questions.",
      cta: orderLink(order.id, "See the decision"),
      secondary: { ...CARE_TEAM_CTA },
    };
  }
  if (order.status === "pending_payment") {
    return {
      key: "order_received",
      tone: "waiting",
      stage: "preparing",
      title: "We received your order",
      body: `${order.orderNumber} for ${what} is in. Nothing needed from you right now — if anything is required to complete payment, we'll email you a secure link.`,
      whatNext:
        "Once payment is confirmed the pharmacy prepares your order and we email tracking when it ships.",
      secondary: orderLink(order.id),
    };
  }
  if (order.status === "in_review") {
    return {
      key: "order_in_review",
      tone: "waiting",
      stage: "preparing",
      title: "A practitioner is checking your order",
      body: `${order.orderNumber} is getting a final clinical check. Nothing needed from you right now.`,
      whatNext:
        "After the check, the pharmacy prepares your order and we email tracking when it ships.",
      secondary: orderLink(order.id),
    };
  }
  return {
    key: "order_preparing",
    tone: "waiting",
    stage: "preparing",
    title: "Your order is being prepared",
    body: `${order.orderNumber} is with the pharmacy. Nothing needed from you right now.`,
    whatNext: "We email you a tracking number the moment it ships.",
    secondary: orderLink(order.id),
  };
}

/**
 * Single source of truth for "what do I need to do next?" — used by the
 * account dashboard and the gated product wizard.
 */
export function resolveNextAction(state: JourneyState, ctx: JourneyContext = {}): NextAction {
  const treatmentJourney = Boolean(ctx.productId) || state.eligibility.length > 0;
  const requiresLabs = ctx.requiresLabs ?? true;
  const requiresConsult = ctx.requiresConsult ?? treatmentJourney;

  // --- Nothing started yet / direct orders ------------------------------------
  if (!ctx.productId) {
    if (!hasActiveJourney(state)) {
      return {
        key: "start",
        tone: "start",
        stage: "labs",
        title: "What would you like to work on?",
        body: "Most treatments start with a lab panel drawn at Quest, followed by a short call with a licensed practitioner. Pick a place to begin.",
        whatNext:
          "As soon as you order a lab or choose a treatment, this page turns into your step-by-step guide.",
        choices: [
          { label: "Browse treatments", to: "/" },
          { label: "Order lab testing", to: "/lab-testing" },
          { label: "How it works", to: "/how-it-works" },
        ],
      };
    }
    if (journeyKind(state, ctx) === "direct") {
      const order = medicationOrder(state);
      if (order) return resolveDirectOrder(order);
    }
  }

  const labs = labStatus(state, requiresLabs, ctx.productId);

  // --- Blood work -----------------------------------------------------------
  if (labs === "needed") {
    return {
      key: "labs_needed",
      tone: "action",
      stage: "labs",
      title: "Start with your lab work",
      body: treatmentJourney
        ? `${ctx.productName ?? "This treatment"} needs recent blood work before a practitioner can approve it. Order the panel it requires, or upload results from the last 6 months.`
        : "Treatments that need a prescription start with recent blood work. Order a panel and have it drawn at a Quest location near you, or upload results from the last 6 months.",
      whatNext: "After you order, we prepare your Quest request and email you a booking link.",
      cta: ctx.productId
        ? productLink(ctx.productId, "Order required lab")
        : { label: "Order required lab", to: "/lab-testing" },
      secondary: { label: "Upload results I already have", to: "/account", hash: "progress" },
    };
  }
  if (labs === "ordered" || labs === "awaiting_quest_setup") {
    const f = activeFulfillment(state, ctx.productId);
    return {
      key: labs === "ordered" ? "labs_payment" : "labs_quest_setup",
      tone: "waiting",
      stage: "quest",
      title: labs === "ordered" ? "Your lab order is received" : "We're preparing your Quest order",
      body:
        labs === "ordered"
          ? `${f?.orderNumber ?? "Your lab order"} is in. Payment hasn't been confirmed in the portal yet — if anything is still due, our care team will contact you with payment instructions.`
          : "Nothing needed from you right now. Payment is confirmed and our team is entering your panel at Quest Diagnostics — usually within 12 hours.",
      whatNext:
        labs === "ordered"
          ? "Quest setup begins once payment is confirmed, and your booking link appears right here."
          : "We'll email you when your Quest booking link is ready. It also appears right here.",
      secondary: f ? orderLink(f.orderId) : undefined,
    };
  }
  if (labs === "quest_ready") {
    const f = activeFulfillment(state, ctx.productId);
    return {
      key: "labs_schedule_draw",
      tone: "action",
      stage: "results",
      title: "Your Quest order is ready",
      body: f?.questReference
        ? `Book your blood draw at any Quest location. Bring your confirmation code ${f.questReference} and a photo ID. Most panels need 8–12 hours of fasting — water is fine.`
        : "Book your blood draw at any Quest location and bring a photo ID. Most panels need 8–12 hours of fasting — water is fine.",
      whatNext:
        "Choose a Quest location and time, then complete your blood draw. Results usually arrive in 2–5 business days.",
      cta: { label: "Book my Quest appointment", href: f?.questLink ?? QUEST_SCHEDULING_URL },
      secondary: f ? orderLink(f.orderId) : undefined,
    };
  }
  if (labs === "awaiting_draw") {
    const f = activeFulfillment(state, ctx.productId);
    return {
      key: "labs_awaiting_draw",
      tone: "waiting",
      stage: "results",
      title: "Your blood draw is booked",
      body: "Go to your Quest appointment — bring a photo ID and, if we gave you one, your confirmation code. Most panels need 8–12 hours of fasting; water is fine.",
      whatNext:
        "Once your blood is drawn, tell us in your blood work section so we can watch for the results.",
      cta: { label: "I've completed my blood draw", to: "/account", hash: "progress" },
      secondary: f ? orderLink(f.orderId) : undefined,
    };
  }
  if (labs === "awaiting_results") {
    return {
      key: "labs_awaiting_results",
      tone: "waiting",
      stage: "results",
      title: "Waiting for your lab results",
      body: "Nothing needed from you right now. Quest usually returns results in 2–5 business days.",
      whatNext: "When Quest sends your results, they'll appear here and we'll email you.",
    };
  }
  if (labs === "rejected") {
    const rejected = state.labDocs.find((d) => d.status === "rejected");
    return {
      key: "labs_rejected",
      tone: "action",
      stage: "results",
      title: "We need new blood work",
      body: "Your practitioner couldn't use the lab file you sent. Upload a clearer or more recent result, or order a fresh panel drawn at Quest.",
      detail: rejected?.reviewNote
        ? { label: "Note from your practitioner", text: rejected.reviewNote }
        : undefined,
      whatNext:
        "Once new results are on file, a practitioner verifies them — usually within one business day.",
      cta: { label: "Upload new results", to: "/account", hash: "progress" },
      secondary: { label: "Order a lab panel", to: "/lab-testing" },
    };
  }
  if (labs === "under_review") {
    return {
      key: "labs_under_review",
      tone: "waiting",
      stage: "results",
      title: "Your results are being reviewed",
      body: "Nothing needed from you right now. A licensed practitioner is checking the lab file you sent — usually within one business day.",
      whatNext:
        "Once verified, you'll book a short call to go over your results and treatment options.",
      secondary: { label: "See my lab files", to: "/account", hash: "progress" },
    };
  }

  // --- Lab review (no specific treatment yet) ---------------------------------
  if (!treatmentJourney) {
    const review = labReviewAppointment(state);
    if (review?.status === "scheduled") {
      return {
        key: "lab_review_booked",
        tone: "waiting",
        stage: "review",
        title: "Your lab review is booked",
        body: "Nothing else to do before your appointment. Have your questions ready — your practitioner will walk through every result with you.",
        when: describeAppointment(review) ?? undefined,
        whatNext:
          "After the review, your practitioner records the treatment decision and you'll get an email.",
        secondary: { label: "Manage my appointment", to: "/account", hash: "visits" },
      };
    }
    if (review?.status === "completed") {
      return {
        key: "lab_review_done",
        tone: "done",
        stage: "review",
        title: "Your lab review is complete",
        body: "Your results are on file and you've spoken with a practitioner. Nothing needed from you right now.",
        whatNext:
          "If a treatment was discussed, open its product page — your labs and review carry over automatically.",
        choices: [
          { label: "Browse treatments", to: "/" },
          { label: "Book a follow-up", to: "/account", hash: "visits" },
        ],
      };
    }
    if (labs === "results_received") {
      return {
        key: "labs_results_ready",
        tone: "action",
        stage: "review",
        title: "Your results are ready to review",
        body: "Quest sent your results to us. Book a short Zoom or phone call so a practitioner can explain them and discuss treatment eligibility.",
        whatNext: "A practitioner will review your results and discuss treatment eligibility.",
        cta: { label: "Book lab review", to: "/account", hash: "visits" },
        secondary: { label: "See my results", to: "/account", hash: "progress" },
      };
    }
    // verified
    return {
      key: "labs_done",
      tone: "action",
      stage: "review",
      title: "Your blood work is verified",
      body: "A practitioner has verified your results. Book a short call to go over them and discuss treatment eligibility.",
      whatNext: "A practitioner will review your results and discuss treatment eligibility.",
      cta: { label: "Book lab review", to: "/account", hash: "visits" },
      secondary: { label: "Browse treatments", to: "/" },
    };
  }

  // --- Practitioner requests always surface first -----------------------------
  const treatment = treatmentStatus(state, ctx.productId);
  const row = eligibilityFor(state, ctx.productId);
  const productName = ctx.productName ?? row?.productName ?? "your treatment";
  const productId = ctx.productId ?? row?.productId ?? undefined;

  if (treatment === "more_information_required") {
    return {
      key: "more_info",
      tone: "action",
      stage: "decision",
      title: "Your practitioner needs more information",
      body: `Before deciding on ${productName}, your practitioner asked for a few more details. Reply from the product page and the review continues right away.`,
      detail: row?.patientMessage
        ? { label: "What your practitioner asked", text: row.patientMessage }
        : undefined,
      whatNext: "Once you reply, your practitioner finishes the decision and you'll get an email.",
      cta: productId ? productLink(productId, "Reply to my practitioner") : { ...CARE_TEAM_CTA },
    };
  }
  if (treatment === "denied") {
    return {
      key: "denied",
      tone: "blocked",
      stage: "decision",
      title: "This treatment wasn't approved",
      body: `Your practitioner decided ${productName} isn't the right fit right now. You haven't been charged for medication.`,
      detail: row?.providerNote
        ? { label: "Note from your practitioner", text: row.providerNote }
        : undefined,
      whatNext: "You can message the care team with questions or explore other treatments.",
      cta: { ...CARE_TEAM_CTA },
      secondary: { label: "Browse other treatments", to: "/" },
    };
  }

  // --- Clinical onboarding --------------------------------------------------
  const missing = missingOnboarding(state);
  if (missing.length && treatment !== "approved") {
    return {
      key: "onboarding",
      tone: "action",
      stage: "review",
      title: "Complete your medical profile",
      body: `Before your consultation we still need: ${missing.join(", ")}. It takes about five minutes and only has to be done once.`,
      whatNext:
        "Then you'll pick a time for a short Zoom or phone call with a licensed practitioner.",
      cta: {
        label: "Complete my profile",
        to: "/checkout",
        // Onboarding mode: intake, consents and photo ID only — never the cart.
        search: productId ? { onboarding: true, product: productId } : { onboarding: true },
      },
    };
  }

  // --- Consultation ---------------------------------------------------------
  const consult = consultStatus(state, requiresConsult, ctx.productId);
  if (consult === "available" && treatment !== "approved") {
    return {
      key: "book_consult",
      tone: "action",
      stage: "review",
      title: "Book your practitioner consultation",
      body: "Pick a date and time for a short Zoom or phone call. Your practitioner reviews your results with you and decides on treatment.",
      whatNext: "A practitioner will review your results and discuss treatment eligibility.",
      cta: productId
        ? productLink(productId, "Choose a time")
        : { label: "Choose a time", to: "/account", hash: "visits" },
    };
  }
  if (consult === "booked") {
    const appt = consultAppointment(state, ctx.productId);
    return {
      key: "consult_booked",
      tone: "waiting",
      stage: "review",
      title: "Your consultation is booked",
      body: "Nothing else to do before your appointment. Have your questions ready — your practitioner will go over your results and your treatment.",
      when: describeAppointment(appt) ?? undefined,
      whatNext:
        "After the visit, your practitioner records the treatment decision and you'll get an email.",
      secondary: { label: "Manage my appointment", to: "/account", hash: "visits" },
    };
  }
  if (treatment === "pending_review" || treatment === "not_requested") {
    return {
      key: "awaiting_decision",
      tone: "waiting",
      stage: "decision",
      title: "Waiting for your practitioner's decision",
      body: "Nothing needed from you right now. Your practitioner is finalising your plan after your visit.",
      whatNext:
        "You'll get an email as soon as it's decided. If approved, your medication unlocks here.",
      secondary: productId ? productLink(productId, "View this treatment") : undefined,
    };
  }

  // --- Purchase & fulfilment ------------------------------------------------
  const med = medicationOrderStatus(state, ctx.productId);
  if (med === "available_to_purchase") {
    return {
      key: "order_medication",
      tone: "action",
      stage: "medication",
      title: "Your treatment is approved",
      body: `Your practitioner approved ${productName}. Place your order and it ships from a licensed pharmacy to your door.`,
      whatNext:
        "After checkout, your order moves to the pharmacy for fulfillment and we email tracking when it ships.",
      cta: productId
        ? productLink(productId, "Order medication")
        : { label: "Order medication", to: "/account", hash: "orders" },
    };
  }
  const order = medicationOrder(state, ctx.productId);
  if (med === "submitted" && order) {
    return {
      key: "order_submitted",
      tone: "waiting",
      stage: "medication",
      title:
        order.status === "in_review"
          ? "A practitioner is checking your order"
          : "We received your order",
      body:
        order.status === "in_review"
          ? `${order.orderNumber} is getting a final clinical check. Nothing needed from you right now.`
          : `${order.orderNumber} is in. Nothing needed from you right now — if anything is required to complete payment, we'll email you a secure link.`,
      whatNext:
        "Next the pharmacy prepares your medication and we email you a tracking number when it ships.",
      secondary: orderLink(order.id),
    };
  }
  if ((med === "paid" || med === "fulfilling") && order) {
    return {
      key: "fulfilling",
      tone: "waiting",
      stage: "medication",
      title: "Your medication is being prepared",
      body: `${order.orderNumber} is with the pharmacy. Nothing needed from you right now.`,
      whatNext: "We email you a tracking number the moment it ships.",
      secondary: orderLink(order.id, "View this order"),
    };
  }
  if (med === "delivered" && order) {
    return {
      key: "delivered",
      tone: "done",
      stage: "medication",
      title: "Your medication was delivered",
      body: `You confirmed receipt of ${order.orderNumber} in your portal${order.deliveredAt ? ` on ${new Date(order.deliveredAt).toLocaleDateString()}` : ""}. This is your own confirmation — we don't track the carrier.`,
      whatNext: "When you're running low, request a refill from your order page.",
      cta: orderLink(order.id, "View this order"),
    };
  }
  if (med === "shipped" && order) {
    return {
      key: "shipped",
      tone: "done",
      stage: "medication",
      title: "Your medication has shipped",
      body: order.trackingNumber
        ? `${order.carrier ?? "Carrier"} tracking number ${order.trackingNumber}. Nothing needed from you right now.`
        : `${order.orderNumber} has left the pharmacy. Nothing needed from you right now.`,
      whatNext:
        "Track your package with the carrier, then confirm receipt on your order page once it arrives.",
      cta: orderLink(order.id, "Track my order"),
    };
  }

  return {
    key: "locked",
    tone: "blocked",
    stage: "medication",
    title: "Finish the steps above",
    body: "Complete the remaining steps and your treatment will unlock automatically.",
    whatNext: "Each step tells you exactly what happens after it.",
  };
}

// ---------------------------------------------------------------------------
// Progress timeline
// ---------------------------------------------------------------------------

export type TimelineStepState = "done" | "current" | "upcoming" | "blocked";

export type TimelineStep = {
  key: JourneyStage;
  label: string;
  state: TimelineStepState;
};

const QUEST_STEPS: { key: JourneyStage; label: string }[] = [
  { key: "labs", label: "Lab ordered" },
  { key: "quest", label: "Quest ready" },
  { key: "results", label: "Blood draw & results" },
  { key: "review", label: "Practitioner review" },
  { key: "decision", label: "Treatment decision" },
  { key: "medication", label: "Medication order" },
];

const UPLOAD_STEPS: { key: JourneyStage; label: string }[] = [
  { key: "labs", label: "Blood work uploaded" },
  { key: "results", label: "Results verified" },
  { key: "review", label: "Practitioner review" },
  { key: "decision", label: "Treatment decision" },
  { key: "medication", label: "Medication order" },
];

const DIRECT_STEPS: { key: JourneyStage; label: string }[] = [
  { key: "order", label: "Order placed" },
  { key: "preparing", label: "Being prepared" },
  { key: "shipped", label: "Shipped" },
];

/**
 * The patient-friendly progress trail, adapted to the active journey and kept
 * in lock-step with `resolveNextAction` so the card and the timeline agree.
 */
export function buildTimeline(
  state: JourneyState,
  ctx: JourneyContext = {},
  action: NextAction = resolveNextAction(state, ctx),
): TimelineStep[] {
  const kind = journeyKind(state, ctx);
  const steps = kind === "direct" ? DIRECT_STEPS : kind === "upload" ? UPLOAD_STEPS : QUEST_STEPS;

  // A quest journey can have an uploaded file in review; keep its stage valid.
  let idx = steps.findIndex((s) => s.key === action.stage);
  if (idx === -1) idx = action.stage === "quest" ? 0 : steps.length - 1;

  return steps.map((s, i) => {
    let stepState: TimelineStepState;
    if (action.tone === "start") stepState = i === 0 ? "current" : "upcoming";
    else if (action.tone === "done") stepState = i <= idx ? "done" : "upcoming";
    else if (action.tone === "blocked")
      stepState = i < idx ? "done" : i === idx ? "blocked" : "upcoming";
    else stepState = i < idx ? "done" : i === idx ? "current" : "upcoming";
    return { key: s.key, label: s.label, state: stepState };
  });
}

// ---------------------------------------------------------------------------
// Active care — the 1–3 things the patient is working on right now
// ---------------------------------------------------------------------------

export type ActiveCareItem = {
  key: string;
  kind: "lab" | "upload" | "appointment" | "treatment" | "order";
  title: string;
  /** Plain-English status — never a raw database value. */
  status: string;
  meta?: string;
  needsAction: boolean;
  link?: NextActionCta;
};

const LAB_DOC_LABEL: Record<string, string> = {
  pending_review: "Waiting for practitioner review",
  verified: "Verified by practitioner",
  rejected: "New file needed",
};

function friendlyOrderStatus(status: string): string {
  return (STATUS_LABEL as Record<string, string>)[status] ?? "In progress";
}

export function activeCareItems(state: JourneyState, ctx: JourneyContext = {}): ActiveCareItem[] {
  const items: ActiveCareItem[] = [];
  const labs = labStatus(state, ctx.requiresLabs ?? true, ctx.productId);

  // Lab panel bought through us.
  const f = activeFulfillment(state, ctx.productId);
  if (f && labs !== "verified") {
    const order = state.orders.find((o) => o.id === f.orderId);
    const panel = order?.items.find((i) => i.group === "labs")?.productName ?? "Lab panel";
    items.push({
      key: `lab-${f.id}`,
      kind: "lab",
      title: panel,
      status: LAB_STATUS_LABEL[labs],
      meta: f.orderNumber ? `Order ${f.orderNumber}` : undefined,
      needsAction: labs === "quest_ready",
      link: orderLink(f.orderId, "View lab order"),
    });
  }

  // Uploaded lab file.
  const doc =
    state.labDocs.find((d) => d.status === "pending_review") ??
    state.labDocs.find((d) => d.status === "rejected") ??
    (state.fulfillments.length === 0 ? state.labDocs[0] : undefined);
  if (doc) {
    items.push({
      key: `upload-${doc.id}`,
      kind: "upload",
      title: doc.fileName,
      status: LAB_DOC_LABEL[doc.status] ?? "On file",
      meta: `Uploaded ${new Date(doc.createdAt).toLocaleDateString()}`,
      needsAction: doc.status === "rejected",
      link: { label: "See my lab files", to: "/account", hash: "progress" },
    });
  }

  // Upcoming visit.
  const appt = upcomingAppointment(state);
  if (appt) {
    const d = describeAppointment(appt);
    const isConsult = appt.appointmentType !== "lab_review" || appt.notes?.includes(TELEHEALTH_TAG);
    items.push({
      key: `appt-${appt.id}`,
      kind: "appointment",
      title: `${isConsult ? "Consultation" : "Lab review"} with ${d?.provider ?? "your practitioner"}`,
      status: "Booked",
      meta: d ? `${d.date} · ${d.time} · ${d.mode}` : undefined,
      needsAction: false,
      link: { label: "Manage appointment", to: "/account", hash: "visits" },
    });
  }

  // Treatment under review / decided.
  const row = eligibilityFor(state, ctx.productId);
  if (row) {
    const status = treatmentStatus(state, row.productId ?? undefined);
    const med = medicationOrderStatus(state, row.productId ?? undefined);
    items.push({
      key: `treatment-${row.id}`,
      kind: "treatment",
      title: row.productName ?? "Your treatment",
      status:
        status === "approved" && med === "available_to_purchase"
          ? "Approved — ready to order"
          : TREATMENT_STATUS_LABEL[status],
      meta: row.decidedAt ? `Decided ${new Date(row.decidedAt).toLocaleDateString()}` : undefined,
      needsAction: status === "more_information_required" || med === "available_to_purchase",
      link: row.productId ? productLink(row.productId, "View treatment") : undefined,
    });
  }

  // Medication order in flight.
  const order = medicationOrder(state, ctx.productId);
  if (order) {
    items.push({
      key: `order-${order.id}`,
      kind: "order",
      title: order.items.map((i) => i.productName).join(", ") || order.orderNumber,
      status: order.deliveredAt ? "Delivered" : friendlyOrderStatus(order.status),
      meta: `Order ${order.orderNumber}`,
      needsAction: false,
      link: orderLink(order.id, order.trackingNumber ? "Track order" : "View order"),
    });
  }

  // Attention first, then the natural flow order; never more than three.
  return [...items.filter((i) => i.needsAction), ...items.filter((i) => !i.needsAction)].slice(
    0,
    3,
  );
}

// ---------------------------------------------------------------------------
// Plain-English labels — raw statuses never reach the patient
// ---------------------------------------------------------------------------

export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  not_required: "Not required",
  needed: "Blood work needed",
  ordered: "Order received",
  awaiting_quest_setup: "Preparing your Quest order",
  quest_ready: "Quest order ready — book your draw",
  awaiting_draw: "Blood draw booked",
  awaiting_results: "Waiting for results",
  results_received: "Lab results received",
  under_review: "Waiting for practitioner review",
  verified: "Verified by practitioner",
  rejected: "New blood work needed",
};

export const CONSULT_STATUS_LABEL: Record<ConsultStatus, string> = {
  not_required: "Not required",
  available: "Ready to book",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

export const TREATMENT_STATUS_LABEL: Record<TreatmentStatus, string> = {
  not_requested: "Not started",
  pending_review: "Waiting for practitioner decision",
  more_information_required: "More information requested",
  approved: "Approved",
  denied: "Not approved",
};

export const MEDICATION_STATUS_LABEL: Record<MedicationOrderStatus, string> = {
  locked: "Unlocks after approval",
  available_to_purchase: "Ready to order",
  submitted: "Order received",
  paid: "Being prepared",
  fulfilling: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
};

// ---------------------------------------------------------------------------
// In-progress treatments — one entry per product the patient started but
// has not finished ordering yet.
// ---------------------------------------------------------------------------

export type InProgressTreatment = {
  productId: string;
  productName: string;
  group: string;
  /** 1-based position in this treatment's own step trail. */
  stepIndex: number;
  stepTotal: number;
  stepLabel: string;
  /** Plain-English "what is happening right now". */
  status: string;
  tone: NextActionTone;
  needsAction: boolean;
  waiting: boolean;
  /** Approved by the practitioner and cleared to be bought right now. */
  readyToOrder: boolean;
  /** Most recent activity on this treatment — newest first on the dashboard. */
  lastActivityAt: string | null;
};

/**
 * The exact same step trail the product page wizard shows, so "Step 4 of 6" on
 * a treatment page and on the dashboard always agree.
 */
/**
 * True once the patient has actively started this treatment — they confirmed it
 * on the product page (which opens their practitioner review), or they already
 * uploaded/bought blood work or booked a visit for it.
 */
export function treatmentStarted(state: JourneyState, productId: string): boolean {
  return (
    state.eligibility.some((e) => e.productId === productId && Boolean(e.patientConfirmedAt)) ||
    state.labDocs.some((d) => d.forProductId === productId) ||
    state.fulfillments.some((f) => f.forProductId === productId) ||
    state.appointments.some((a) => a.forProductId === productId)
  );
}

/** Newest timestamp we know about for a treatment, used to order the dashboard. */
function lastActivityFor(state: JourneyState, productId: string): string | null {
  const stamps: (string | null | undefined)[] = [
    ...state.eligibility.filter((e) => e.productId === productId).flatMap((e) => [e.updatedAt, e.decidedAt]),
    ...state.labDocs.filter((d) => d.forProductId === productId).map((d) => d.createdAt),
    ...state.fulfillments
      .filter((f) => f.forProductId === productId)
      .flatMap((f) => [f.drawCompletedAt, f.drawBookedAt]),
    ...state.appointments.filter((a) => a.forProductId === productId).map((a) => a.slotDate),
  ];
  const valid = stamps.filter((s): s is string => Boolean(s)).sort();
  return valid.length ? valid[valid.length - 1]! : null;
}

export function wizardProgress(
  state: JourneyState,
  productId: string,
  requiresLabs: boolean,
): { index: number; total: number; label: string } {
  const labs = labStatus(state, requiresLabs, productId);
  const labsCleared = !requiresLabs || labs === "verified" || labs === "results_received";
  const decision = treatmentStatus(state, productId);
  const med = medicationOrderStatus(state, productId);
  const consult = consultStatus(state, true, productId);

  // Step 1 is only complete once the patient themselves confirms the treatment
  // — nothing is picked for them.
  const steps: { label: string; done: boolean }[] = [
    { label: "Confirm your treatment", done: treatmentStarted(state, productId) },
  ];
  if (requiresLabs) steps.push({ label: "Blood work", done: labsCleared });
  steps.push({ label: "Medical profile", done: onboardingComplete(state) });
  steps.push({
    label: "Practitioner consultation",
    done: consult === "booked" || consult === "completed",
  });
  steps.push({ label: "Practitioner decision", done: decision === "approved" });
  steps.push({
    label: "Order your medication",
    done:
      med === "submitted" ||
      med === "paid" ||
      med === "fulfilling" ||
      med === "shipped" ||
      med === "delivered",
  });

  const first = steps.findIndex((s) => !s.done);
  const idx = first === -1 ? steps.length - 1 : first;
  return { index: idx + 1, total: steps.length, label: steps[idx]?.label ?? "In progress" };
}

/** Products the patient started (labs, uploads, visits or a review) and has not ordered. */
export function inProgressTreatments(state: JourneyState): InProgressTreatment[] {
  const ids = new Set<string>();
  for (const e of state.eligibility) if (e.productId) ids.add(e.productId);
  for (const d of state.labDocs) if (d.forProductId) ids.add(d.forProductId);
  for (const f of state.fulfillments) if (f.forProductId) ids.add(f.forProductId);
  for (const a of state.appointments) if (a.forProductId) ids.add(a.forProductId);

  const out: InProgressTreatment[] = [];
  for (const productId of ids) {
    const product = CATALOG.find((p) => p.id === productId);
    if (product?.group === "labs") continue;

    // Already bought → it lives in "My orders", not here.
    const med = medicationOrderStatus(state, productId);
    if (med !== "locked" && med !== "available_to_purchase") continue;

    const ctx: JourneyContext = {
      productId,
      productName: product?.name,
      requiresLabs: product?.lab ?? true,
      requiresConsult: product?.telehealth ?? true,
    };
    const action = resolveNextAction(state, ctx);
    const progress = wizardProgress(state, productId, product?.lab ?? true);
    // Nothing past step 1 yet → the patient has not really started this
    // treatment, so it stays off the dashboard.
    if (progress.index <= 1) continue;

    out.push({
      productId,
      productName: product?.name ?? productId,
      group: product?.group ?? "peptides",
      stepIndex: progress.index,
      stepTotal: progress.total,
      stepLabel: progress.label,
      status: action.title,
      tone: action.tone,
      needsAction: action.tone === "action" || action.tone === "blocked",
      waiting: action.tone === "waiting",
      // Only on the very last step — exactly when the treatment page itself
      // shows its "Add to cart" button.
      readyToOrder: med === "available_to_purchase" && progress.index === progress.total,
      lastActivityAt: lastActivityFor(state, productId),
    });
  }

  // Most recently worked on first, whatever step it is on, so the top of the
  // dashboard always shows what the patient touched last.
  return out.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
}
