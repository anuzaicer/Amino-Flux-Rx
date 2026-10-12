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
import {
  PORTAL_URL,
  brand,
  button,
  container,
  footer,
  heading,
  hr,
  main,
  noteBox,
  noteLabel,
  noteValue,
  text,
} from "./_shared";

interface Props {
  name?: string;
  date?: string;
  time?: string;
  mode?: string;
  providerName?: string;
  visitType?: string;
  /** "24 hours" | "1 hour" */
  window?: string;
  meetingDetail?: string;
  portalUrl?: string;
}

const AppointmentReminder = ({
  name,
  date,
  time,
  mode,
  providerName,
  visitType,
  window,
  meetingDetail,
  portalUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reminder: your appointment is coming up</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Your appointment is in about {window || "24 hours"}</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          This is a reminder for your {visitType || "appointment"} with{" "}
          {providerName || "a licensed practitioner"}.
        </Text>
        <Section style={noteBox}>
          <Text style={noteLabel}>When</Text>
          <Text style={noteValue}>
            {date} {time ? `at ${time}` : ""} {mode ? `· ${mode}` : ""}
          </Text>
        </Section>
        {meetingDetail && <Text style={text}>How to join: {meetingDetail}</Text>}
        <Button style={button} href={portalUrl || PORTAL_URL}>
          View my appointment
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          Can't make it? Cancel or rebook from your portal so the time can be released to another
          patient.
        </Text>
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AppointmentReminder,
  subject: (data: Record<string, any>) =>
    data["window"] === "1 hour"
      ? "Reminder: your appointment starts in about 1 hour"
      : "Reminder: your appointment is tomorrow",
  displayName: "Appointment reminder (24h / 1h)",
  previewData: {
    name: "Jane",
    date: "Tue, Sep 15",
    time: "10:30",
    mode: "zoom",
    providerName: "Nicole, NP",
    visitType: "lab review",
    window: "24 hours",
  },
} satisfies TemplateEntry;
