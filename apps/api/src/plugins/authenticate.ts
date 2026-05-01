import fp from "fastify-plugin";

export const authenticatePlugin = fp(async (app) => {
  app.decorate("authenticate", async (request, reply) => {
    try {
      const token = await request.jwtVerify<{ sub: string; workspaceId: string }>();
      const membership = await app.prisma.membership.findFirst({
        where: { userId: token.sub, workspaceId: token.workspaceId },
        include: { user: true }
      });

      if (!membership) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      request.currentUser = {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        workspaceId: membership.workspaceId
      };
    } catch {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });
});
