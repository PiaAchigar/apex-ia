import nodemailer from "nodemailer";
import { logger } from "../../utils/logger.js";
import { DrizzleDb } from "../../db/drizzle.js";
import { contacts, conversations, messages } from "@apex-ia/database";
import { eq, and } from "drizzle-orm";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
};

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private tenantDb?: DrizzleDb;

  constructor(tenantDb?: DrizzleDb) {
    this.tenantDb = tenantDb;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const resendKey = process.env["RESEND_API_KEY"];
    const smtpHost = process.env["SMTP_HOST"];
    const smtpPort = process.env["SMTP_PORT"];
    const smtpUser = process.env["SMTP_USER"];
    const smtpPass = process.env["SMTP_PASS"];

    if (resendKey) {
      // Use Resend API (via nodemailer-friendly adapter)
      // Note: This would require @react-email/resend or custom Resend client
      // For now, using SMTP fallback
      logger.info("Using SMTP transport for emails");
      this.initializeSmtp(smtpHost, smtpPort, smtpUser, smtpPass);
    } else if (smtpHost && smtpPort && smtpUser && smtpPass) {
      logger.info("Using SMTP transport for emails");
      this.initializeSmtp(smtpHost, smtpPort, smtpUser, smtpPass);
    } else {
      logger.warn("No email service configured (RESEND_API_KEY or SMTP env vars required)");
    }
  }

  private initializeSmtp(
    host?: string,
    port?: string,
    user?: string,
    pass?: string
  ) {
    if (!host || !port || !user || !pass) {
      logger.warn("Incomplete SMTP configuration");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: {
          user,
          pass,
        },
      });

      logger.info({ host, port }, "SMTP transporter initialized");
    } catch (err) {
      logger.error({ err }, "Failed to initialize SMTP transporter");
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    from?: string
  ): Promise<void> {
    if (!this.transporter) {
      logger.warn({ to, subject }, "Email service not configured, skipping send");
      throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
    }

    try {
      const fromAddress = from || process.env["SMTP_USER"] || "noreply@apexia.app";

      await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html: htmlBody,
      });

      logger.info({ to, subject, from: fromAddress }, "Email sent successfully");
    } catch (err) {
      logger.error(
        { to, subject, error: (err as Error).message },
        "Failed to send email"
      );
      throw err;
    }
  }

  async configureSmtp(config: SmtpConfig): Promise<void> {
    if (!this.tenantDb) {
      throw new Error("Database not configured for SMTP setup");
    }

    try {
      // Validate connection first
      const test = await this.testSmtpConnection(config);
      if (!test.success) {
        throw new Error(test.error || "SMTP connection failed");
      }

      // TODO: Save encrypted config to channel_credentials table
      // This requires implementing credential encryption first
      logger.info("SMTP configuration updated", { host: config.host });
    } catch (error) {
      logger.error("Error configuring SMTP", { error });
      throw error;
    }
  }

  async testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const testTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await testTransporter.verify();
      await testTransporter.close();

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Connection failed";
      logger.error("SMTP connection test failed", { error: errorMsg, host: config.host });
      return { success: false, error: errorMsg };
    }
  }

  async handleIncomingEmail(rawEmail: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ conversationId: string; messageId: string } | null> {
    if (!this.tenantDb) {
      logger.warn("Database not configured for incoming email");
      return null;
    }

    try {
      // 1. Find or create contact by email
      let contact = await this.tenantDb
        .select()
        .from(contacts)
        .where(eq(contacts.email, rawEmail.from))
        .limit(1)
        .then((r) => r[0]);

      if (!contact) {
        const [newContact] = await this.tenantDb
          .insert(contacts)
          .values({
            name: rawEmail.from.split("@")[0],
            email: rawEmail.from,
          })
          .returning();

        contact = newContact;
      }

      // 2. Find or create open email conversation
      let conversation = await this.tenantDb
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.contactId, contact!.id),
            eq(conversations.channel, "email"),
            eq(conversations.status, "open")
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (!conversation) {
        const [newConversation] = await this.tenantDb
          .insert(conversations)
          .values({
            contactId: contact!.id,
            channel: "email",
            status: "open",
          })
          .returning();

        conversation = newConversation;
      }

      // 3. Insert message
      const [message] = await this.tenantDb
        .insert(messages)
        .values({
          conversationId: conversation!.id,
          senderType: "contact",
          content: rawEmail.html || rawEmail.text,
          metadataJson: { subject: rawEmail.subject },
        })
        .returning();

      return {
        conversationId: conversation!.id,
        messageId: message!.id,
      };
    } catch (error) {
      logger.error("Error handling incoming email", { error, from: rawEmail.from });
      return null;
    }
  }
}
