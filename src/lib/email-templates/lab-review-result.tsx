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
  verified?: boolean;
  fileName?: string;
  note?: string;
  portalUrl?: string;
}

const LabReviewResult = ({ name, verified, fileName, note, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {verified ? "Your blood work has been verified" : "We need new blood work from you"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>
          {verified ? "Your blood work is verified" : "New blood work needed"}
        </Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          {verified
            ? `A licensed practitioner has reviewed and accepted the results you sent${
                fileName ? ` (${fileName})` : ""
              }. You can now book your consultation and move ahead with treatment.`
            : `A licensed practitioner reviewed the file you sent${
                fileName ? ` (${fileName})` : ""
              } and can't use it as it stands.`}
        </Text>
        {note && (
          <Section style={noteBox}>
            <Text style={noteLabel}>Note from your practitioner</Text>
            <Text style={noteValue}>{note}</Text>
          </Section>
        )}
        <Button style={button} href={portalUrl || "https://afrx.anuzaicer.work/account"}>
          {verified ? "Book your consultation" : "Send new results"}
        </Button>
        <Hr style={hr} />
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: LabReviewResult,
  subject: (data: Record<string, any>) =>
    data["verified"] ? "Your blood work has been verified" : "We need new blood work from you",
  displayName: "Lab review result",
  previewData: {
    name: "Jane",
    verified: true,
    fileName: "labs-june.pdf",
    note: "Everything I need is here — book your visit when you are ready.",
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
