import { chromium, type Browser } from "playwright";

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

const userAgents = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
];

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export class InstagramScraperService {
  private browser?: Browser;

  async scrape(sourceType: string, sourceValue: string): Promise<ScrapedInstagramLead[]> {
    this.browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH
    });
    const context = await this.browser.newContext({
      userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
      viewport: { width: 1365, height: 900 }
    });
    const page = await context.newPage();

    try {
      const url = this.toInstagramUrl(sourceType, sourceValue);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(2_000 + Math.floor(Math.random() * 2_000));

      const text = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
      const emails = text.match(emailRegex) ?? [];
      const username = sourceType === "USERNAME" ? sourceValue.replace(/^@/, "").toLowerCase() : sourceValue.toLowerCase();

      return [
        {
          username,
          bio: text.slice(0, 500),
          publicEmail: emails[0]?.toLowerCase(),
          source: `${sourceType}:${sourceValue}`
        }
      ];
    } finally {
      await context.close();
      await this.browser?.close();
    }
  }

  private toInstagramUrl(sourceType: string, sourceValue: string) {
    const clean = sourceValue.replace(/^[@#]/, "");
    if (sourceType === "HASHTAG") return `https://www.instagram.com/explore/tags/${encodeURIComponent(clean)}/`;
    if (sourceType === "LOCATION") return `https://www.instagram.com/explore/locations/${encodeURIComponent(clean)}/`;
    return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
  }
}
