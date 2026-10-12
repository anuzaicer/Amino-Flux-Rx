import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  orderNumber?: string;
  approved?: boolean;
  providerName?: string;
  note?: string;
  portalUrl?: string;
}

const TreatmentDecision = ({
  name,
  orderNumber,
  approved,
  providerName,
  note,
  portalUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {approved
        ? "Your practitioner approved your treatment — your order is moving forward"
        : "An update on your treatment review"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>
          {approved ? "Your treatment is approved" : "Your review is complete"}
        </Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          {approved
            ? `${providerName || "Your practitioner"} reviewed your labs and approved your order${
                orderNumber ? ` (${orderNumber})` : ""
              }. Step 6 of the six-step process is done — we're preparing your medication for shipment straight to your door.`
            : `${providerName || "Your practitioner"} reviewed your labs and was not able to approve this order${
                orderNumber ? ` (${orderNumber})` : ""
              } at this time.`}
        </Text>
        {note && (
          <Section style={noteBox}>
            <Text style={noteLabel}>Note from your practitioner</Text>
            <Text style={noteValue}>{note}</Text>
          </Section>
        )}
        <Button style={button} href={portalUrl || "https://afrx.anuzaicer.work/account"}>
          View your order
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          {approved
            ? "You'll get one more email with tracking as soon as your medication ships."
            : "You can book another review from the Schedule tab in your portal if you have questions or new labs."}
        </Text>
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TreatmentDecision,
  subject: (data: Record<string, any>) =>
    data["approved"]
      ? `Approved — order ${data["orderNumber"] || ""} is moving forward`.trim()
      : "An update on your treatment review",
  displayName: "Practitioner treatment decision",
  previewData: {
    name: "Jane",
    orderNumber: "AF-10042",
    approved: true,
    providerName: "Nicole, NP",
    note: "Labs look good. Start at the lowest dose and check back in 8 weeks.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 25px", maxWidth: "560px" };
const brand = {
  color: "#2173D1",
  fontSize: "12px",
  letterSpacing: "3px",
  fontWeight: "bold" as const,
};
const heading = { color: "#050816", fontSize: "24px", margin: "8px 0 16px" };
const text = { color: "#333333", fontSize: "15px", lineHeight: "24px" };
const noteBox = {
  backgroundColor: "#f3f8ee",
  border: "1px solid #d6e8c2",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "12px 0",
};
const noteLabel = {
  color: "#5c8f28",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px",
};
const noteValue = { color: "#050816", fontSize: "15px", lineHeight: "22px", margin: "0" };
const hr = { borderColor: "#e6e6e6", margin: "20px 0" };
const button = {
  backgroundColor: "#74B439",
  color: "#050816",
  borderRadius: "8px",
  padding: "12px 22px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
  marginTop: "8px",
};
const footer = { color: "#999999", fontSize: "12px", marginTop: "28px" };
