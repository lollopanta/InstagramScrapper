import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("datareach_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AuthResponse = {
  token: string;
  user: { id: string; email: string; name?: string | null };
  workspace: { id: string; name: string };
};

export type DashboardStats = {
  leadCount: number;
  leadsWithEmail: number;
  campaigns: number;
  sent: number;
  opened: number;
  replied: number;
};

export type Lead = {
  id: string;
  username: string;
  fullName?: string | null;
  bio?: string | null;
  website?: string | null;
  publicEmail?: string | null;
  followerCount: number;
  followingCount: number;
  score: number;
  source?: string | null;
  tags?: Array<{ tag: { id: string; name: string } }>;
};

export type ScrapeJob = {
  id: string;
  bullJobId?: string | null;
  sourceType: "USERNAME" | "HASHTAG" | "LOCATION";
  sourceValue: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  leadsFound: number;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ScrapeJobDetails = {
  job: ScrapeJob;
  targetUrl: string;
  queue: {
    id?: string;
    name: string;
    state: string | null;
    progress: unknown;
    attemptsMade: number;
    attemptsStarted?: number;
    failedReason?: string;
    stacktrace: string[];
    timestamp?: number;
    processedOn?: number;
    finishedOn?: number;
    delay?: number;
    data: unknown;
    logs: string[];
    logCount: number;
  } | null;
};

export type Campaign = {
  id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED";
  dailyLimit: number;
  minDelaySec: number;
  maxDelaySec: number;
  sequenceSteps: Array<{ id: string; stepIndex: number; subject: string; bodyHtml: string; delayDays: number }>;
  _count?: { messages: number };
};

export type SmtpAccount = {
  id: string;
  name: string;
  provider: string;
  host: string;
  port: number;
  fromEmail: string;
  fromName?: string | null;
};
