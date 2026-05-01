import type { ScrapeSourceType } from "@prisma/client";

export type NormalizedInstagramSource = {
  sourceType: ScrapeSourceType;
  sourceValue: string;
};

const reservedProfileSegments = new Set([
  "accounts",
  "about",
  "api",
  "developer",
  "directory",
  "explore",
  "legal",
  "oauth",
  "p",
  "reel",
  "reels",
  "stories",
  "tv"
]);

export function normalizeInstagramSource(sourceType: ScrapeSourceType, rawValue: string): NormalizedInstagramSource {
  const value = rawValue.trim();
  const parsedUrl = parseInstagramUrl(value);
  if (parsedUrl) return parsedUrl;

  if (value.startsWith("#")) {
    return { sourceType: "HASHTAG", sourceValue: cleanSegment(value.slice(1)) };
  }

  if (sourceType === "USERNAME") {
    return { sourceType, sourceValue: cleanUsername(value) };
  }

  return { sourceType, sourceValue: cleanSegment(value) };
}

function parseInstagramUrl(value: string): NormalizedInstagramSource | null {
  const url = toUrl(value);
  if (!url || !isInstagramHost(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const [first, second, third] = segments;

  if (!first) return null;
  if (first === "explore" && second === "tags" && third) {
    return { sourceType: "HASHTAG", sourceValue: cleanSegment(third) };
  }
  if (first === "explore" && second === "locations" && third) {
    return { sourceType: "LOCATION", sourceValue: cleanSegment(third) };
  }
  if (!reservedProfileSegments.has(first)) {
    return { sourceType: "USERNAME", sourceValue: cleanUsername(first) };
  }

  return null;
}

function toUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function isInstagramHost(hostname: string) {
  return hostname === "instagram.com" || hostname === "www.instagram.com" || hostname === "m.instagram.com";
}

function cleanUsername(value: string) {
  return cleanSegment(value).replace(/^@/, "").toLowerCase();
}

function cleanSegment(value: string) {
  return value.trim().replace(/^[@#]/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
}
