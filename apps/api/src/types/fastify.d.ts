import type { PrismaClient, User } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Queue } from "bullmq";
import type { EmailJob, ScrapeJobPayload } from "../queues/types.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    queues: {
      scraper: Queue<ScrapeJobPayload>;
      email: Queue<EmailJob>;
    };
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    currentUser?: Pick<User, "id" | "email" | "name"> & { workspaceId: string };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; workspaceId: string };
    user: { sub: string; workspaceId: string };
  }
}
