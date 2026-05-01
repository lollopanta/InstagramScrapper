import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().min(1).optional(),
  workspaceName: z.string().min(2).default("My Workspace")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post("/register", { schema: { body: registerSchema } }, async (request, reply) => {
    const input = request.body;
    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await app.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email.toLowerCase(), name: input.name, passwordHash }
      });
      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          memberships: { create: { userId: user.id, role: "OWNER" } },
          smtpAccounts: {
            create: {
              name: "Mailcatcher",
              provider: "MAILCATCHER",
              host: "mailcatcher",
              port: 1025,
              secure: false,
              fromEmail: "dev@datareach.local",
              fromName: "DataReach Dev"
            }
          }
        }
      });
      return { user, workspace };
    });

    const token = app.jwt.sign({ sub: result.user.id, workspaceId: result.workspace.id });
    return reply.code(201).send({
      token,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      workspace: result.workspace
    });
  });

  app.post("/login", { schema: { body: loginSchema } }, async (request, reply) => {
    const user = await app.prisma.user.findUnique({ where: { email: request.body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(request.body.password, user.passwordHash))) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const membership = await app.prisma.membership.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { id: "asc" }
    });
    if (!membership) return reply.code(403).send({ message: "No workspace membership" });

    const token = app.jwt.sign({ sub: user.id, workspaceId: membership.workspaceId });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: membership.workspace
    };
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    return { user: request.currentUser };
  });
};
