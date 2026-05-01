import { env } from "../config/env.js";

export type ScrapedInstagramLead = {
  instagramId?: string;
  username: string;
  fullName?: string;
  bio?: string;
  website?: string;
  publicEmail?: string;
  followerCount?: number;
  followingCount?: number;
  source?: string;
};

export type InstagramProfileCheckStatus =
  | "FOUND"
  | "NOT_FOUND"
  | "LOGIN_REQUIRED"
  | "RATE_LIMITED"
  | "BLOCKED"
  | "UNSUPPORTED"
  | "UNKNOWN";

type PythonScraperResponse = {
  status: InstagramProfileCheckStatus;
  leads?: ScrapedInstagramLead[];
  error?: string | null;
  raw?: unknown;
};

export class InstagramProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramProfileNotFoundError";
  }
}

export class InstagramAccessError extends Error {
  constructor(
    message: string,
    public readonly status: InstagramProfileCheckStatus
  ) {
    super(message);
    this.name = "InstagramAccessError";
  }
}

export class InstagramScraperService {
  async scrape(sourceType: string, sourceValue: string): Promise<ScrapedInstagramLead[]> {
    const response = await fetch(new URL("/scrape", env.PYTHON_SCRAPER_URL), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceType, sourceValue })
    });

    if (!response.ok) {
      throw new InstagramAccessError(`Python scraper returned HTTP ${response.status}.`, "UNKNOWN");
    }

    const result = (await response.json()) as PythonScraperResponse;
    this.assertReachable(sourceType, sourceValue, result);
    return result.leads ?? [];
  }

  private assertReachable(sourceType: string, sourceValue: string, result: PythonScraperResponse) {
    if (result.status === "FOUND" || result.status === "UNKNOWN") return;
    if (result.status === "NOT_FOUND") {
      throw new InstagramProfileNotFoundError(result.error ?? `${sourceType.toLowerCase()} "${sourceValue}" was not found on Instagram.`);
    }
    throw new InstagramAccessError(result.error ?? `Instagram returned ${result.status.toLowerCase().replaceAll("_", " ")} for ${sourceValue}.`, result.status);
  }
}
