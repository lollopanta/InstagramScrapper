import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../utils/http.js";
import { scoreLead } from "../../utils/lead-scoring.js";

const leadCreateSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url().optional(),
  publicEmail: z.string().email().optional(),
  followerCount: z.number().int().nonnegative().default(0),
  followingCount: z.number().int().nonnegative().default(0),
  source: z.string().optional(),
  tags: z.array(z.string().min(1)).default([])
});

const leadQuerySchema = z.object({
  hasEmail: z.coerce.boolean().optional(),
  keyword: z.string().optional(),
  minFollowers: z.coerce.number().int().nonnegative().optional(),
  maxFollowers: z.coerce.number().int().nonnegative().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});

export const leadRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", { schema: { querystring: leadQuerySchema } }, async (request) => {
    const user = requireUser(request);
    const query = request.query;
    const where: Prisma.LeadWhereInput = {
      workspaceId: user.workspaceId,
      ...(query.hasEmail ? { publicEmail: { not: null } } : {}),
      ...(query.keyword ? { bio: { contains: query.keyword, mode: "insensitive" } } : {}),
      ...(query.minFollowers || query.maxFollowers
        ? { followerCount: { gte: query.minFollowers, lte: query.maxFollowers } }
        : {}),
      ...(query.tag ? { tags: { some: { tag: { name: query.tag } } } } : {})
    };

    const [items, total] = await Promise.all([
      app.prisma.lead.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      app.prisma.lead.count({ where })
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  });

  app.post("/", { schema: { body: leadCreateSchema } }, async (request, reply) => {
    const user = requireUser(request);
    const input = request.body;
    const { tags, ...leadInput } = input;
    const normalizedEmail = input.publicEmail?.toLowerCase();
    const score = scoreLead(input);

    const lead = await app.prisma.lead.upsert({
      where: { workspaceId_username: { workspaceId: user.workspaceId, username: input.username.toLowerCase() } },
      update: {
        ...leadInput,
        username: input.username.toLowerCase(),
        normalizedEmail,
        score
      },
      create: {
        ...leadInput,
        username: input.username.toLowerCase(),
        normalizedEmail,
        score,
        workspaceId: user.workspaceId
      }
    });

    for (const tagName of tags) {
      const tag = await app.prisma.tag.upsert({
        where: { workspaceId_name: { workspaceId: user.workspaceId, name: tagName } },
        update: {},
        create: { workspaceId: user.workspaceId, name: tagName }
      });
      await app.prisma.leadTag.upsert({
        where: { leadId_tagId: { leadId: lead.id, tagId: tag.id } },
        update: {},
        create: { leadId: lead.id, tagId: tag.id }
      });
    }

    return reply.code(201).send(lead);
  });

  app.post("/:id/tags", { schema: { body: z.object({ tags: z.array(z.string().min(1)) }) } }, async (request) => {
    const user = requireUser(request);
    const { id } = request.params as { id: string };
    const lead = await app.prisma.lead.findFirstOrThrow({ where: { id, workspaceId: user.workspaceId } });

    for (const tagName of request.body.tags) {
      const tag = await app.prisma.tag.upsert({
        where: { workspaceId_name: { workspaceId: user.workspaceId, name: tagName } },
        update: {},
        create: { workspaceId: user.workspaceId, name: tagName }
      });
      await app.prisma.leadTag.upsert({
        where: { leadId_tagId: { leadId: lead.id, tagId: tag.id } },
        update: {},
        create: { leadId: lead.id, tagId: tag.id }
      });
    }

    return app.prisma.lead.findUnique({ where: { id: lead.id }, include: { tags: { include: { tag: true } } } });
  });
};
