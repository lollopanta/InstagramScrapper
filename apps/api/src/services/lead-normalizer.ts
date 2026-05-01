import type { PrismaClient } from "@prisma/client";
import type { ScrapedInstagramLead } from "./instagram-scraper.js";
import { scoreLead } from "../utils/lead-scoring.js";

export async function upsertScrapedLeads(prisma: PrismaClient, workspaceId: string, leads: ScrapedInstagramLead[]) {
  let count = 0;

  for (const raw of leads) {
    const username = raw.username.trim().replace(/^@/, "").toLowerCase();
    if (!username) continue;

    await prisma.lead.upsert({
      where: { workspaceId_username: { workspaceId, username } },
      update: {
        instagramId: raw.instagramId,
        fullName: raw.fullName,
        bio: raw.bio,
        website: raw.website,
        publicEmail: raw.publicEmail?.toLowerCase(),
        normalizedEmail: raw.publicEmail?.toLowerCase(),
        followerCount: raw.followerCount ?? 0,
        followingCount: raw.followingCount ?? 0,
        source: raw.source,
        score: scoreLead(raw)
      },
      create: {
        workspaceId,
        instagramId: raw.instagramId,
        username,
        fullName: raw.fullName,
        bio: raw.bio,
        website: raw.website,
        publicEmail: raw.publicEmail?.toLowerCase(),
        normalizedEmail: raw.publicEmail?.toLowerCase(),
        followerCount: raw.followerCount ?? 0,
        followingCount: raw.followingCount ?? 0,
        source: raw.source,
        score: scoreLead(raw)
      }
    });
    count += 1;
  }

  return count;
}
