import nodemailer from "nodemailer";
import type { Campaign, EmailMessage, Lead, SmtpAccount } from "@prisma/client";
import { env } from "../config/env.js";
import { personalize } from "../utils/personalize.js";

type SendCampaignMessage = EmailMessage & {
  lead: Lead;
  campaign: Campaign & { smtpAccount: SmtpAccount | null };
};

export class EmailService {
  async sendMessage(message: SendCampaignMessage) {
    const smtp = message.campaign.smtpAccount;
    const transporter = nodemailer.createTransport({
      host: smtp?.host ?? env.SMTP_HOST,
      port: smtp?.port ?? env.SMTP_PORT,
      secure: smtp?.secure ?? env.SMTP_SECURE,
      auth: smtp?.username ? { user: smtp.username, pass: smtp.password ?? "" } : undefined
    });

    const from = smtp?.fromEmail
      ? `${smtp.fromName ?? "DataReach"} <${smtp.fromEmail}>`
      : env.SMTP_FROM;

    return transporter.sendMail({
      from,
      to: message.lead.publicEmail!,
      subject: personalize(message.subject, message.lead),
      html: personalize(message.bodyHtml, message.lead)
    });
  }
}
