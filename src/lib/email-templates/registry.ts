import type { ComponentType } from "react";
import { template as appointmentConfirmation } from "./appointment-confirmation";
import { template as appointmentMissed } from "./appointment-missed";
import { template as appointmentReminder } from "./appointment-reminder";
import { template as labOrderConfirmation } from "./lab-order-confirmation";
import { template as labResultsReady } from "./lab-results-ready";
import { template as labReviewResult } from "./lab-review-result";
import { template as moreInformationRequired } from "./more-information-required";
import { template as orderShipped } from "./order-shipped";
import { template as orderCompleted } from "./order-completed";
import { template as paymentReceived } from "./payment-received";
import { template as questOrderReady } from "./quest-order-ready";
import { template as treatmentDecision } from "./treatment-decision";
import { template as treatmentOrderReminder } from "./treatment-order-reminder";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "lab-order-confirmation": labOrderConfirmation,
  "lab-review-result": labReviewResult,
  "lab-results-ready": labResultsReady,
  "more-information-required": moreInformationRequired,
  "appointment-confirmation": appointmentConfirmation,
  "appointment-reminder": appointmentReminder,
  "appointment-missed": appointmentMissed,
  "quest-order-ready": questOrderReady,
  "treatment-decision": treatmentDecision,
  "treatment-order-reminder": treatmentOrderReminder,
  "payment-received": paymentReceived,
  "order-shipped": orderShipped,
  "order-completed": orderCompleted,
};
