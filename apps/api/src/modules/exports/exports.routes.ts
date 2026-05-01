import { Parser } from "json2csv";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireUser } from "../../utils/http.js";

export const exportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/leads.csv", async (request, reply) => {
    const user = requireUser(request);
    const leads = await app.prisma.lead.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" }
    });
    const parser = new Parser({
      fields: ["username", "fullName", "publicEmail", "website", "followerCount", "followingCount", "bio", "score", "source"]
    });
    const csv = parser.parse(leads);

    return reply
      .header("content-type", "text/csv")
      .header("content-disposition", 'attachment; filename="leads.csv"')
      .send(csv);
  });
};
