import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
