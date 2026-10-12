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
  orderNumber?: string;
  amount?: string;
  nextStep?: string;
  portalUrl?: string;
}

const PaymentReceived = ({ name, orderNumber, amount, nextStep, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've recorded your payment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Payment confirmed</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          Our team has confirmed and recorded your payment{orderNumber ? ` for ${orderNumber}` : ""}
          . This is a record of a payment arranged with us directly — no card was charged through
          the website.
        </Text>
        {amount && (
          <Section style={noteBox}>
            <Text style={noteLabel}>Amount recorded</Text>
            <Text style={noteValue}>{amount}</Text>
          </Section>
        )}
        <Text style={text}>
          {nextStep || "Your order now moves to the next step. You can follow it in your portal."}
        </Text>
        <Button style={button} href={portalUrl || `${PORTAL_URL}#orders`}>
          Track my order
        </Button>
        <Hr style={hr} />
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentReceived,
  subject: "We've recorded your payment",
  displayName: "Manual payment confirmation",
  previewData: { name: "Jane", orderNumber: "AF-10042", amount: "$249.00" },
} satisfies TemplateEntry;
