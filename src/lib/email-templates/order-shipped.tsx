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
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items?: string[];
}

const OrderShipped = ({
  name,
  orderNumber,
  carrier,
  trackingNumber,
  trackingUrl,
  items,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Amino Flux order is on its way</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RX</Text>
        <Heading style={heading}>Your order has shipped</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          Good news — your order{orderNumber ? ` ${orderNumber}` : ""} has shipped and is on its
          way to you.
        </Text>
        {items && items.length > 0 && (
          <Section style={listBox}>
            {items.map((item) => (
              <Text key={item} style={listItem}>
                • {item}
              </Text>
            ))}
          </Section>
        )}
        {trackingNumber && (
          <Section style={codeBox}>
            <Text style={codeLabel}>{carrier ? `${carrier} tracking` : "Tracking number"}</Text>
            <Text style={codeValue}>{trackingNumber}</Text>
          </Section>
        )}
        {trackingUrl && (
          <Button style={button} href={trackingUrl}>
            Track your shipment
          </Button>
        )}
        <Hr style={hr} />
        <Text style={text}>
          Store your medication as directed on the label. Questions about dosing? Book a follow-up
          with your practitioner from the Schedule tab in your portal.
        </Text>
        <Text style={footer}>Amino Flux Research · Delivered straight to your door.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OrderShipped,
  subject: "Your Amino Flux order has shipped",
  displayName: "Order shipped (tracking)",
  previewData: {
    name: "Jane",
    orderNumber: "AF-10042",
    carrier: "UPS",
    trackingNumber: "1Z999AA10123456784",
    items: ["Testosterone Cypionate 200mg/mL", "Syringe kit"],
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
const listBox = { margin: "8px 0 4px" };
const listItem = { color: "#333333", fontSize: "15px", lineHeight: "22px", margin: "0" };
const codeBox = {
  backgroundColor: "#eef4fc",
  border: "1px solid #c8dcf5",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "12px 0",
  textAlign: "center" as const,
};
const codeLabel = {
  color: "#2173D1",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px",
};
const codeValue = {
  color: "#050816",
  fontSize: "20px",
  fontWeight: "bold" as const,
  letterSpacing: "1px",
  margin: "0",
};
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
