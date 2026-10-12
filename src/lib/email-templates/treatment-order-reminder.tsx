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
  productName?: string;
  portalUrl?: string;
}

const TreatmentOrderReminder = ({ name, productName, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your approved treatment is still waiting to be ordered</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Your approved treatment is ready to order</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          A licensed practitioner has approved your treatment
          {productName ? ` (${productName})` : ""}, but we haven't received an order yet. Nothing
          has been charged — placing the order is the next step, and it only takes a minute.
        </Text>
        <Button style={button} href={portalUrl || PORTAL_URL}>
          Place my order
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          Questions before you order? Message your care team from the Messages tab in your portal.
        </Text>
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TreatmentOrderReminder,
  subject: "Your approved treatment is ready to order",
  displayName: "Approved but not ordered reminder",
  previewData: { name: "Jane", productName: "Peptide protocol" },
} satisfies TemplateEntry;
