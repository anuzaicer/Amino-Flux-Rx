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
  providerName?: string;
  message?: string;
  portalUrl?: string;
}

const MoreInformationRequired = ({ name, providerName, message, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your practitioner needs a little more information</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AMINO FLUX RESEARCH</Text>
        <Heading style={heading}>One more thing before we decide</Heading>
        <Text style={text}>Hi{name ? ` ${name}` : ""},</Text>
        <Text style={text}>
          {providerName || "Your practitioner"} needs a little more information before making a
          decision on your treatment. Nothing has been charged.
        </Text>
        {message && (
          <Section style={noteBox}>
            <Text style={noteLabel}>What we need</Text>
            <Text style={noteValue}>{message}</Text>
          </Section>
        )}
        <Button style={button} href={portalUrl || "https://afrx.anuzaicer.work/account"}>
          Reply in your portal
        </Button>
        <Hr style={hr} />
        <Text style={footer}>Amino Flux Research · Telehealth prescription services.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: MoreInformationRequired,
  subject: "Your practitioner needs a little more information",
  displayName: "More information required",
  previewData: {
    name: "Jane",
    providerName: "Nicole, NP",
    message: "Could you confirm the date of your last blood pressure reading?",
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
  backgroundColor: "#eef4fc",
  border: "1px solid #c7ddf7",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "12px 0",
};
const noteLabel = {
  color: "#2173D1",
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
