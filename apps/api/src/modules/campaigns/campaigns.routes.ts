import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../utils/http.js";
import { personalize } from "../../utils/personalize.js";

const sequenceStepSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  delayDays: z.number().int().nonnegative().default(0),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional()
});

const createCampaignSchema = z.object({
  name: z.string().min(2),
  smtpAccountId: z.string().optional(),
  targetTagIds: z.array(z.string()).default([]),
  dailyLimit: z.number().int().positive().max(2_000).default(100),
  minDelaySec: z.number().int().positive().default(45),
  maxDelaySec: z.number().int().positive().default(180),
  warmupEnabled: z.boolean().default(true),
  sequenceSteps: z.array(sequenceStepSchema).min(1)
});

const smtpSchema = z.object({
  provider: z.enum(["GMAIL", "OUTLOOK", "MAILCATCHER", "CUSTOM"]).default("CUSTOM"),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().optional()
});

export const campaignRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => {
    const user = requireUser(request);
    return app.prisma.campaign.findMany({
      where: { workspaceId: user.workspaceId },
      include: { sequenceSteps: true, _count: { select: { messages: true } } },
      orderBy: { createdAt: "desc" }
    });
  });

  app.post("/", { schema: { body: createCampaignSchema } }, async (request, reply) => {
    const user = requireUser(request);
    const campaign = await app.prisma.campaign.create({
      data: {
        workspaceId: user.workspaceId,
        name: request.body.name,
        smtpAccountId: request.body.smtpAccountId,
        targetTagIds: request.body.targetTagIds,
        dailyLimit: request.body.dailyLimit,
        minDelaySec: request.body.minDelaySec,
        maxDelaySec: request.body.maxDelaySec,
        warmupEnabled: request.body.warmupEnabled,
        sequenceSteps: { create: request.body.sequenceSteps }
      },
      include: { sequenceSteps: true }
    });

    return reply.code(201).send(campaign);
  });

  app.post("/:id/start", async (request, reply) => {
    const user = requireUser(request);
    const { id } = request.params as { id: string };
    const campaign = await app.prisma.campaign.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { sequenceSteps: { orderBy: { stepIndex: "asc" } } }
    });
    if (!campaign) return reply.code(404).send({ message: "Campaign not found" });
    if (campaign.sequenceSteps.length === 0) return reply.code(400).send({ message: "Campaign has no sequence steps" });

    const where: Prisma.LeadWhereInput = {
      workspaceId: user.workspaceId,
      publicEmail: { not: null },
      ...(campaign.targetTagIds.length > 0
        ? { tags: { some: { tagId: { in: campaign.targetTagIds } } } }
        : {})
    };
    const leads = await app.prisma.lead.findMany({ where, take: campaign.dailyLimit, orderBy: { score: "desc" } });
    const firstStep = campaign.sequenceSteps[0];
    let queued = 0;

    for (const lead of leads) {
      const bodyHtml = personalize(firstStep.bodyHtml, lead);
      const subject = personalize(firstStep.subject, lead);
      const message = await app.prisma.emailMessage.create({
        data: { campaignId: campaign.id, leadId: lead.id, stepIndex: firstStep.stepIndex, subject, bodyHtml }
      });
      const delayMs = randomDelayMs(campaign.minDelaySec, campaign.maxDelaySec, queued, campaign.warmupEnabled);
      await app.queues.email.add(
        "send-email",
        { messageId: message.id, campaignId: campaign.id, workspaceId: user.workspaceId },
        { delay: delayMs }
      );
      queued += 1;
    }

    await app.prisma.campaign.update({ where: { id: campaign.id }, data: { status: "RUNNING" } });
    return reply.code(202).send({ queued });
  });

  app.post("/:id/pause", async (request) => {
    const user = requireUser(request);
    const { id } = request.params as { id: string };
    const result = await app.prisma.campaign.updateMany({
      where: { id, workspaceId: user.workspaceId },
      data: { status: "PAUSED" }
    });
    return { updated: result.count };
  });

  app.get("/smtp-accounts", async (request) => {
    const user = requireUser(request);
    return app.prisma.smtpAccount.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "desc" } });
  });

  app.post("/smtp-accounts", { schema: { body: smtpSchema } }, async (request, reply) => {
    const user = requireUser(request);
    const account = await app.prisma.smtpAccount.create({
      data: { ...request.body, workspaceId: user.workspaceId }
    });
    return reply.code(201).send(account);
  });
};

function randomDelayMs(minDelaySec: number, maxDelaySec: number, index: number, warmup: boolean) {
  const min = Math.min(minDelaySec, maxDelaySec);
  const max = Math.max(minDelaySec, maxDelaySec);
  const random = min + Math.floor(Math.random() * (max - min + 1));
  const warmupMultiplier = warmup ? Math.ceil((index + 1) / 20) : 1;
  return random * warmupMultiplier * 1_000;
}
