import type { CatalogGroup } from "@/data/catalog";
import type { CartItem } from "@/lib/cart-context";

export type ConsentTemplate = {
  slug: string;
  title: string;
  version: number;
  body: string;
  /** "always" applies to every non lab-only cart; group consents apply per product. */
  scope: "always" | CatalogGroup[];
};

export const CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    slug: "telehealth-consent",
    title: "Telehealth Consent",
    version: 1,
    scope: "always",
    body: "I consent to receive care from Amino Flux Rx providers through telehealth. I understand that telehealth involves the use of secure electronic communications to enable a licensed provider to evaluate and treat me at a distance, that no specific outcome is guaranteed, and that I may withdraw this consent at any time. I understand that in an emergency I should call 911 or go to the nearest emergency department.",
  },
  {
    slug: "privacy-hipaa",
    title: "Notice of Privacy Practices (HIPAA)",
    version: 1,
    scope: "always",
    body: "I acknowledge that I have received and reviewed the Notice of Privacy Practices describing how my protected health information may be used and disclosed for treatment, payment, and health care operations, and how I may access that information.",
  },
  {
    slug: "financial-policy",
    title: "Financial Policy & Cancellation Terms",
    version: 1,
    scope: "always",
    body: "I understand that Amino Flux Rx is a cash-pay practice, that charges are due at the time of purchase, and that compounded and prescription medications are non-refundable once dispensed. Lab panels are non-refundable once the requisition has been released to the laboratory.",
  },
  {
    slug: "lab-order-consent",
    title: "Laboratory Order Consent",
    version: 1,
    scope: ["labs"],
    body: "I authorize Amino Flux Rx to order the laboratory testing I have selected and to release the requisition to Quest Diagnostics. I understand I am responsible for scheduling my own draw appointment, that results are reviewed by a licensed provider, and that laboratory testing is diagnostic in nature and does not by itself constitute a prescription.",
  },
  {
    slug: "controlled-substance-agreement",
    title: "Controlled Substance Treatment Agreement",
    version: 1,
    scope: ["weight"],
    body: "I understand that certain weight management medications are Schedule IV controlled substances. I agree to take them exactly as prescribed, to use a single prescriber and pharmacy, not to share or sell my medication, and to submit to monitoring including a government-issued photo ID check. I confirm the personal and health information I have provided is accurate.",
  },
  {
    slug: "hormone-therapy-consent",
    title: "Hormone Therapy Informed Consent",
    version: 1,
    scope: ["hormones", "bundles"],
    body: "I have been informed of the expected benefits, alternatives, and risks of hormone replacement therapy, which may include changes in blood counts, cholesterol, mood, fertility, and cardiovascular risk. I agree to complete the required baseline and follow-up laboratory monitoring as directed by my provider.",
  },
  {
    slug: "compounded-peptide-consent",
    title: "Compounded & Peptide Therapy Consent",
    version: 1,
    scope: ["peptides"],
    body: "I understand that compounded peptide preparations are not FDA-approved products, are prepared by a licensed compounding pharmacy on a patient-specific prescription, and that clinical evidence for some uses is limited. I have had the opportunity to ask questions about expected effects and risks.",
  },
  {
    slug: "sexual-health-consent",
    title: "Sexual & Intimate Health Consent",
    version: 1,
    scope: ["intimacy"],
    body: "I consent to treatment for sexual and intimate health concerns, and I understand the potential side effects and the importance of disclosing all cardiovascular conditions and nitrate-containing medications to my provider before use.",
  },
  {
    slug: "dermatology-consent",
    title: "Dermatology & Topical Therapy Consent",
    version: 1,
    scope: ["skin"],
    body: "I understand that prescription topical therapies may cause irritation, dryness, photosensitivity, or pigment changes, and that results vary between individuals. I agree to follow the application directions provided with my prescription.",
  },
];

/** Consents that must be signed before this cart can be submitted. */
export function requiredConsentsForCart(items: CartItem[]): ConsentTemplate[] {
  if (items.length === 0) return [];
  const groups = new Set(items.map((i) => i.group));
  const labOnly = items.every((i) => i.group === "labs");

  return CONSENT_TEMPLATES.filter((t) => {
    if (t.scope === "always") return !labOnly;
    return t.scope.some((g) => groups.has(g));
  });
}

export function cartRequiresIntake(items: CartItem[]): boolean {
  return items.some((i) => i.group !== "labs");
}

export function cartRequiresPhotoId(items: CartItem[]): boolean {
  return items.some((i) => i.isControlled);
}

export function cartRequiresApproval(items: CartItem[]): boolean {
  return items.some((i) => i.requiresApproval);
}

export function cartRequiresLabs(items: CartItem[]): boolean {
  return items.some((i) => i.requiresLabs);
}
