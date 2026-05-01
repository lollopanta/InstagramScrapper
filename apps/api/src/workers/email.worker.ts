import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import type { EmailJob } from "../queues/types.js";
import { EmailService } from "../services/email-service.js";

const prisma = new PrismaClient();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const emailService = new EmailService();

const worker = new Worker<EmailJob>(
  "email",
  async (job) => {
    const message = await prisma.emailMessage.findFirst({
      where: {
        id: job.data.messageId,
        campaign: { workspaceId: job.data.workspaceId, status: { in: ["RUNNING", "SCHEDULED"] } }
      },
      include: { lead: true, campaign: { include: { smtpAccount: true } } }
    });

    if (!message) return;
    if (!message.lead.publicEmail) {
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: "FAILED", error: "Lead has no public email" }
      });
      return;
    }

    try {
      await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "SENDING" } });
      await emailService.sendMessage(message);
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          events: { create: { type: "SENT" } }
        }
      });
    } catch (error) {
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown email error",
          events: { create: { type: "FAILED", metadata: { message: String(error) } } }
        }
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: env.EMAIL_CONCURRENCY,
    limiter: { max: env.EMAIL_RATE_LIMIT_PER_MINUTE, duration: 60_000 }
  }
);

worker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Email job ${job?.id} failed`, error);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function shutdown() {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
