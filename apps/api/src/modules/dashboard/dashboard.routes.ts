import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireUser } from "../../utils/http.js";

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/stats", async (request) => {
    const user = requireUser(request);
    const [leadCount, leadsWithEmail, sent, opened, replied, campaigns] = await Promise.all([
      app.prisma.lead.count({ where: { workspaceId: user.workspaceId } }),
      app.prisma.lead.count({ where: { workspaceId: user.workspaceId, publicEmail: { not: null } } }),
      app.prisma.emailMessage.count({ where: { campaign: { workspaceId: user.workspaceId }, status: "SENT" } }),
      app.prisma.emailMessage.count({ where: { campaign: { workspaceId: user.workspaceId }, status: "OPENED" } }),
      app.prisma.emailMessage.count({ where: { campaign: { workspaceId: user.workspaceId }, status: "REPLIED" } }),
      app.prisma.campaign.count({ where: { workspaceId: user.workspaceId } })
    ]);

    return { leadCount, leadsWithEmail, campaigns, sent, opened, replied };
  });
};
