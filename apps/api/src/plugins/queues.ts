import fp from "fastify-plugin";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import type { EmailJob, ScrapeJobPayload } from "../queues/types.js";

export const queuesPlugin = fp(async (app) => {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const scraper = new Queue<ScrapeJobPayload>("scraper", {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100 }
  });
  const email = new Queue<EmailJob>("email", {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 15_000 }, removeOnComplete: 500 }
  });

  app.decorate("queues", { scraper, email });
  app.addHook("onClose", async () => {
    await Promise.all([scraper.close(), email.close(), connection.quit()]);
  });
});
