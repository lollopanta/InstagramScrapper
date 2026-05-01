import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { env } from "./config/env.js";
import { authenticatePlugin } from "./plugins/authenticate.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { queuesPlugin } from "./plugins/queues.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { leadRoutes } from "./modules/leads/leads.routes.js";
import { scraperRoutes } from "./modules/scraper/scraper.routes.js";
import { campaignRoutes } from "./modules/campaigns/campaigns.routes.js";
import { exportRoutes } from "./modules/exports/exports.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, { origin: env.APP_ORIGIN, credentials: true });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute"
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "DataReach OSS API", version: "0.1.0" },
      servers: [{ url: `http://localhost:${env.PORT}` }]
    },
    transform: jsonSchemaTransform
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(prismaPlugin);
  await app.register(queuesPlugin);
  await app.register(authenticatePlugin);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(leadRoutes, { prefix: "/api/leads" });
  await app.register(scraperRoutes, { prefix: "/api/scraper" });
  await app.register(campaignRoutes, { prefix: "/api/campaigns" });
  await app.register(exportRoutes, { prefix: "/api/exports" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });

  return app;
}
