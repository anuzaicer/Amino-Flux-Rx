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
  PORTAL_URL,
  text,
} from "./_shared";

interface Props {
  name?: string;
  orderNumber?: string;
}

const OrderCompleted = ({ name, orderNumber }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Amino Flux order is complete — thank you</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RX</Text>
        <Heading style={heading}>Thank you for your order</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          Thank you for choosing Amino Flux. Your order is now complete — there's nothing else you
          need to do.
        </Text>
        {orderNumber && (
          <Section style={noteBox}>
            <Text style={noteLabel}>Order number</Text>
            <Text style={noteValue}>{orderNumber}</Text>
          </Section>
        )}
        <Button style={button} href={PORTAL_URL}>
          View your account
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          Questions about your treatment? Send your care team a message from your account anytime.
        </Text>
        <Text style={footer}>Amino Flux Rx · Thank you for trusting us with your care.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OrderCompleted,
  subject: "Thank you for your Amino Flux order",
  displayName: "Order completed (thank you)",
  previewData: { name: "Jane", orderNumber: "AF-10042" },
} satisfies TemplateEntry;
