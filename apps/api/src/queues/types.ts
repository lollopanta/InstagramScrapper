import type { ScrapeSourceType } from "@prisma/client";

export type ScrapeJobPayload = {
  scrapeJobId: string;
  workspaceId: string;
  sourceType: ScrapeSourceType;
  sourceValue: string;
};

export type EmailJob = {
  messageId: string;
  campaignId: string;
  workspaceId: string;
};
