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
  questLink?: string;
  questReference?: string;
  note?: string;
}

const QuestOrderReady = ({ name, orderNumber, questLink, questReference, note }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Quest lab order is ready — schedule your blood draw</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>Your Quest order is ready</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          Great news — your lab order{orderNumber ? ` (${orderNumber})` : ""} has been entered into
          Quest Diagnostics. You can now schedule your blood draw at the Quest location and time
          that works best for you.
        </Text>
        {questReference && (
          <Section style={codeBox}>
            <Text style={codeLabel}>Your Quest confirmation code</Text>
            <Text style={codeValue}>{questReference}</Text>
          </Section>
        )}
        <Button
          style={button}
          href={questLink || "https://appointment.questdiagnostics.com/as-home"}
        >
          Schedule at Quest
        </Button>
        {note && <Text style={text}>Note from our team: {note}</Text>}
        <Hr style={hr} />
        <Text style={text}>
          After your blood draw, Quest will process your results. Once they're in, you can review
          them with your own doctor — or book a lab review with one of our practitioners right from
          the Schedule tab in your patient portal.
        </Text>
        <Text style={footer}>
          Amino Flux Research · Bring a photo ID to your Quest appointment.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: QuestOrderReady,
  subject: "Your Quest lab order is ready — schedule your appointment",
  displayName: "Quest order ready (scheduling link)",
  previewData: {
    name: "Jane",
    orderNumber: "AF-10042",
    questReference: "QXD-88213",
    note: "Fasting recommended 8 hours before your draw.",
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
  fontSize: "22px",
  fontWeight: "bold" as const,
  letterSpacing: "2px",
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
