import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../utils/http.js";

const scrapeSchema = z.object({
  sourceType: z.enum(["USERNAME", "HASHTAG", "LOCATION"]),
  sourceValue: z.string().min(1)
});

export const scraperRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.post("/jobs", { schema: { body: scrapeSchema } }, async (request, reply) => {
    const user = requireUser(request);
    const scrapeJob = await app.prisma.scrapeJob.create({
      data: {
        workspaceId: user.workspaceId,
        sourceType: request.body.sourceType,
        sourceValue: request.body.sourceValue,
        requestedById: user.id
      }
    });

    const bullJob = await app.queues.scraper.add("scrape-instagram", {
      scrapeJobId: scrapeJob.id,
      workspaceId: user.workspaceId,
      sourceType: request.body.sourceType,
      sourceValue: request.body.sourceValue
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
};
