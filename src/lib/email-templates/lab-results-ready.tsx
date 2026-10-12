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
  orderNumber?: string;
  portalUrl?: string;
}

const LabResultsReady = ({ name, orderNumber, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your lab results are in your portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Your lab results are ready</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          Your blood work{orderNumber ? ` for order ${orderNumber}` : ""} has come back and is now
          available in your patient portal. For your privacy, results are never included in email.
        </Text>
        <Text style={text}>
          You can view and download your results any time, and share them with your own doctor if
          you'd like.
        </Text>
        <Text style={text}>
          Optional: if you'd like help understanding what your results mean, you can book a short
          review with a licensed practitioner from your portal.
        </Text>
        <Button style={button} href={portalUrl || `${PORTAL_URL}#progress`}>
          View my results
        </Button>

        <Hr style={hr} />
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: LabResultsReady,
  subject: "Your lab results are available in your portal",
  displayName: "Lab results received",
  previewData: { name: "Jane", orderNumber: "AF-10042" },
} satisfies TemplateEntry;
