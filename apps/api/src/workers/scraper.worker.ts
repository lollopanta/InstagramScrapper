import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import type { ScrapeJobPayload } from "../queues/types.js";
import { InstagramScraperService } from "../services/instagram-scraper.js";
import { upsertScrapedLeads } from "../services/lead-normalizer.js";

const prisma = new PrismaClient();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<ScrapeJobPayload>(
  "scraper",
  async (job) => {
    await prisma.scrapeJob.update({
      where: { id: job.data.scrapeJobId },
      data: { status: "RUNNING", startedAt: new Date() }
    });

    try {
      const scraper = new InstagramScraperService();
      const leads = await scraper.scrape(job.data.sourceType, job.data.sourceValue);
      const leadsFound = await upsertScrapedLeads(prisma, job.data.workspaceId, leads);

      await prisma.scrapeJob.update({
        where: { id: job.data.scrapeJobId },
        data: { status: "COMPLETED", leadsFound, completedAt: new Date() }
      });
    } catch (error) {
      await prisma.scrapeJob.update({
        where: { id: job.data.scrapeJobId },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown scraper error",
          completedAt: new Date()
        }
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: env.SCRAPER_CONCURRENCY,
    limiter: { max: env.SCRAPER_RATE_LIMIT_PER_MINUTE, duration: 60_000 }
  }
);

worker.on("completed", (job) => {
  console.log(`Scraper job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Scraper job ${job?.id} failed`, error);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function shutdown() {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
