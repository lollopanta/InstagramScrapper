import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../utils/http.js";
import { normalizeInstagramSource } from "../../utils/instagram-input.js";

const scrapeSchema = z.object({
  sourceType: z.enum(["USERNAME", "HASHTAG", "LOCATION"]),
  sourceValue: z.string().min(1)
});

export const scraperRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.post("/jobs", { schema: { body: scrapeSchema } }, async (request, reply) => {
    const user = requireUser(request);
    const source = normalizeInstagramSource(request.body.sourceType, request.body.sourceValue);
    const scrapeJob = await app.prisma.scrapeJob.create({
      data: {
        workspaceId: user.workspaceId,
        sourceType: source.sourceType,
        sourceValue: source.sourceValue,
        requestedById: user.id
      }
    });

    const bullJob = await app.queues.scraper.add("scrape-instagram", {
      scrapeJobId: scrapeJob.id,
      workspaceId: user.workspaceId,
      sourceType: source.sourceType,
      sourceValue: source.sourceValue
    });

    await app.prisma.scrapeJob.update({ where: { id: scrapeJob.id }, data: { bullJobId: bullJob.id } });
    return reply.code(202).send({ id: scrapeJob.id, status: "QUEUED" });
  });

  app.get("/jobs", async (request) => {
    const user = requireUser(request);
    return app.prisma.scrapeJob.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  });

  app.get("/jobs/:id", async (request, reply) => {
    const user = requireUser(request);
    const { id } = request.params as { id: string };
    const job = await app.prisma.scrapeJob.findFirst({
      where: { id, workspaceId: user.workspaceId }
    });

    if (!job) {
      return reply.code(404).send({ message: "Scrape job not found" });
    }

    const queueJob = job.bullJobId ? await app.queues.scraper.getJob(job.bullJobId) : null;
    const queueState = queueJob ? await queueJob.getState() : null;
    const queueLogs = job.bullJobId
      ? await app.queues.scraper.getJobLogs(job.bullJobId, 0, 100).catch(() => ({ logs: [], count: 0 }))
      : { logs: [], count: 0 };

    return {
      job,
      targetUrl: toInstagramUrl(job.sourceType, job.sourceValue),
      queue: queueJob
        ? {
            id: queueJob.id,
            name: queueJob.name,
            state: queueState,
            progress: queueJob.progress,
            attemptsMade: queueJob.attemptsMade,
            attemptsStarted: queueJob.attemptsStarted,
            failedReason: queueJob.failedReason,
            stacktrace: queueJob.stacktrace,
            timestamp: queueJob.timestamp,
            processedOn: queueJob.processedOn,
            finishedOn: queueJob.finishedOn,
            delay: queueJob.delay,
            data: queueJob.data,
            logs: queueLogs.logs,
            logCount: queueLogs.count
          }
        : null
    };
  });
};

function toInstagramUrl(sourceType: string, sourceValue: string) {
  const clean = sourceValue.replace(/^[@#]/, "");
  if (sourceType === "HASHTAG") return `https://www.instagram.com/explore/tags/${encodeURIComponent(clean)}/`;
  if (sourceType === "LOCATION") return `https://www.instagram.com/explore/locations/${encodeURIComponent(clean)}/`;
  return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
}
