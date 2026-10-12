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
  panels?: string[];
}

const LabOrderConfirmation = ({ name, orderNumber, panels }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Lab order received — here's what happens next</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Lab order received</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          We've received your lab order{orderNumber ? ` (${orderNumber})` : ""}. Payment hasn't
          necessarily been collected in the portal yet — if anything is still due, our care team
          will contact you with payment instructions.
        </Text>
        {panels && panels.length > 0 && (
          <Section style={panelBox}>
            <Text style={panelTitle}>Your lab panel</Text>
            {panels.map((p) => (
              <Text key={p} style={panelItem}>
                • {p}
              </Text>
            ))}
          </Section>
        )}
        <Text style={text}>
          Once payment is confirmed, we enter your panel into Quest Diagnostics and email you a
          scheduling link so you can choose the location and appointment time that suits you.
        </Text>
        <Hr style={hr} />
        <Text style={muted}>What happens next</Text>
        <Text style={text}>
          1. Payment is confirmed{"\n"}2. We enter your order into Quest{"\n"}3. You get your Quest
          scheduling link by email{"\n"}4. You visit Quest for your blood draw{"\n"}5. You book a
          lab review with a practitioner in your patient portal
        </Text>
        <Button style={button} href="https://afrx.anuzaicer.work/account">
          View your patient portal
        </Button>
        <Text style={footer}>
          Amino Flux Research · Questions? Reply to this email and our care team will help.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: LabOrderConfirmation,
  subject: (data: Record<string, any>) =>
    `Lab order received ${data?.orderNumber ?? ""}`.replace(/\s+/g, " ").trim(),
  displayName: "Lab order received",
  previewData: {
    name: "Jane",
    orderNumber: "AF-10042",
    panels: ["Comprehensive Metabolic Panel", "Lipid Panel"],
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
const text = {
  color: "#333333",
  fontSize: "15px",
  lineHeight: "24px",
  whiteSpace: "pre-line" as const,
};
const panelBox = {
  backgroundColor: "#f4f8ef",
  border: "1px solid #d9e8c4",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "12px 0",
};
const panelTitle = {
  color: "#4a7d1c",
  fontSize: "13px",
  fontWeight: "bold" as const,
  margin: "0 0 6px",
};
const panelItem = { color: "#333333", fontSize: "14px", margin: "2px 0" };
const hr = { borderColor: "#e6e6e6", margin: "20px 0" };
const muted = {
  color: "#888888",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};
const button = {
  backgroundColor: "#2173D1",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "12px 22px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
  marginTop: "8px",
};
const footer = { color: "#999999", fontSize: "12px", marginTop: "28px" };
