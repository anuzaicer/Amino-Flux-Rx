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
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { PORTAL_URL, brand, button, container, footer, heading, hr, main, text } from "./_shared";

interface Props {
  name?: string;
  date?: string;
  providerName?: string;
  portalUrl?: string;
}

const AppointmentMissed = ({ name, date, providerName, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We missed you — rebook your appointment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>We missed you</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          {providerName || "Your practitioner"} wasn't able to meet with you
          {date ? ` on ${date}` : ""}. You can pick a new time from your portal whenever you're
          ready, or message your care team if you'd rather talk it through first.
        </Text>

        <Button style={button} href={portalUrl || `${PORTAL_URL}#visits`}>
          Book a new time
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          If something went wrong joining the call, message your care team from the Messages tab and
          we'll help.
        </Text>
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AppointmentMissed,
  subject: "We missed you — rebook your appointment",
  displayName: "Missed appointment follow-up",
  previewData: { name: "Jane", date: "Tue, Sep 15", providerName: "Nicole, NP" },
} satisfies TemplateEntry;
