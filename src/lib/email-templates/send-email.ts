import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "./registry";

// Server-only: reads RESEND_API_KEY. Never import from client components.
//
// Sign-up, password reset and other account emails are sent by Supabase Auth
// itself (configure them in the Supabase dashboard). This module sends the
// app's own notification emails (lab orders, payments, shipping, reminders).
//
// Those notifications go through Resend when RESEND_API_KEY is set. Without
// it, every notification is skipped and logged — the app keeps working, and
// patients still see every update in their portal.

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: "recipient_suppressed" | "email_not_configured" };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string;
  replyTo?: string;
}

function emailConfig() {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return null;
  const fromAddress = process.env["EMAIL_FROM_ADDRESS"];
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS is not configured");
  return {
    apiKey,
    from: `${process.env["EMAIL_FROM_NAME"] || "Amino Flux Rx"} <${fromAddress}>`,
  };
}

/**
 * Renders a registered template and sends it through Resend. When email is
 * not configured the send is skipped ({ sent: false }); any other failure
 * throws.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`,
    );
  }

  const config = emailConfig();
  if (!config) {
    console.warn(`[email] RESEND_API_KEY not set — skipped '${templateName}' email.`);
    return { sent: false, reason: "email_not_configured" };
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to;
  if (!recipient) {
    throw new Error("Recipient is required (the template defines no fixed recipient)");
  }

  const templateData = options.templateData ?? {};
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey || crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      subject,
      html,
      text,
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      tags: [{ name: "template", value: templateName.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Resend error ${res.status}: ${body?.message ?? res.statusText}`);
  }

  return { sent: true };
}
