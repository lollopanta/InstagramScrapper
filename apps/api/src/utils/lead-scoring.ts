export type LeadScoreInput = {
  publicEmail?: string | null;
  bio?: string | null;
  website?: string | null;
  followerCount?: number | null;
};

const buyingSignals = ["founder", "owner", "coach", "consultant", "agency", "brand", "shop", "booking"];

export function scoreLead(lead: LeadScoreInput) {
  let score = 10;
  const bio = lead.bio?.toLowerCase() ?? "";

  if (lead.publicEmail) score += 35;
  if (lead.website) score += 15;
  if ((lead.followerCount ?? 0) >= 1_000) score += 10;
  if ((lead.followerCount ?? 0) >= 10_000) score += 10;
  if (buyingSignals.some((keyword) => bio.includes(keyword))) score += 20;

  return Math.min(score, 100);
}
