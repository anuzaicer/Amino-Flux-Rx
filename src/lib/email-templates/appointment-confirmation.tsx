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
  date?: string;
  time?: string;
  mode?: string;
  providerName?: string;
  visitType?: string;
  portalUrl?: string;
}

const AppointmentConfirmation = ({
  name,
  date,
  time,
  mode,
  providerName,
  visitType,
  portalUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your appointment is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Your appointment is confirmed</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          You're booked in for your {visitType || "appointment"} with{" "}
          {providerName || "a licensed practitioner"}.
        </Text>
        <Section style={noteBox}>
          <Text style={noteLabel}>When</Text>
          <Text style={noteValue}>
            {date} {time ? `at ${time}` : ""} {mode ? `· ${mode}` : ""}
          </Text>
        </Section>
        <Button style={button} href={portalUrl || "https://afrx.anuzaicer.work/account"}>
          Manage my appointment
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          Need to change it? You can cancel or rebook any time from your portal.
        </Text>
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AppointmentConfirmation,
  subject: "Your Amino Flux appointment is confirmed",
  displayName: "Appointment confirmation",
  previewData: {
    name: "Jane",
    date: "Tuesday, 14 April",
    time: "4:45 PM",
    mode: "Zoom",
    providerName: "Nicole, NP",
    visitType: "lab review",
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
