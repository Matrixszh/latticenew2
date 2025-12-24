import nodemailer from "nodemailer";

function bool(v: string | undefined) {
  return v === "true" || v === "1";
}

export function getTransporter() {
  const host = process.env.SMTP_HOST ?? "";
  const port = Number(process.env.SMTP_PORT ?? "0");
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const secure = bool(process.env.SMTP_SECURE);
  if (!host || !port || !user || !pass) {
    throw new Error("Missing SMTP configuration");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export function getFromAddress() {
  return process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
}

