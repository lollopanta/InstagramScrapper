import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Eye, Play, RefreshCw } from "lucide-react";
import { api, type ScrapeJob, type ScrapeJobDetails } from "@/lib/api";
import { normalizeInstagramSource, type ScrapeSourceType } from "@/lib/instagram-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ScraperPage() {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<ScrapeSourceType>("USERNAME");
  const [sourceValue, setSourceValue] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const normalizedSource = normalizeInstagramSource(sourceType, sourceValue);

  const jobsQuery = useQuery({
    queryKey: ["scraper-jobs"],
    queryFn: async () => {
      const { data } = await api.get<ScrapeJob[]>("/api/scraper/jobs");
      return data;
    },
    refetchInterval: 10_000
  });

  const createJob = useMutation({
    mutationFn: async () => api.post("/api/scraper/jobs", normalizedSource),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraper-jobs"] })
  });

  const selectedJobQuery = useQuery({
    queryKey: ["scraper-job", selectedJobId],
    enabled: Boolean(selectedJobId),
    queryFn: async () => {
      const { data } = await api.get<ScrapeJobDetails>(`/api/scraper/jobs/${selectedJobId}`);
      return data;
    },
    refetchInterval: selectedJobId ? 5_000 : false
  });

  if (selectedJobId) {
    return (
      <ScrapeJobDetail
        details={selectedJobQuery.data}
        isLoading={selectedJobQuery.isLoading}
        onBack={() => setSelectedJobId(null)}
        onRefresh={() => selectedJobQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Scraper</h1>
        <p className="text-sm text-muted-foreground">Queue Instagram collection jobs with backend rate limiting.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New job</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[220px_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              createJob.mutate();
            }}
          >
            <Field label="Source">
              <Select value={sourceType} onChange={(event) => setSourceType(event.target.value as ScrapeSourceType)}>
                <option value="USERNAME">Username</option>
                <option value="HASHTAG">Hashtag</option>
                <option value="LOCATION">Location</option>
              </Select>
            </Field>
            <Field label="Value">
              <Input
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                placeholder="username or https://www.instagram.com/username/"
                required
              />
              {sourceValue.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Detected {normalizedSource.sourceType.toLowerCase()}:{" "}
                  <span className="font-medium text-foreground">{normalizedSource.sourceValue || "none"}</span>
                </p>
              ) : null}
            </Field>
            <Button className="self-end" disabled={createJob.isPending}>
              <Play className="h-4 w-4" />
              Queue
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent jobs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => jobsQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-20">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobsQuery.data ?? []).map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.sourceValue}</div>
                    <div className="text-xs text-muted-foreground">{job.sourceType}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.status === "COMPLETED" ? "default" : job.status === "FAILED" ? "outline" : "secondary"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.leadsFound}</TableCell>
                  <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="max-w-md text-destructive">{job.error}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="icon" aria-label="View job details" onClick={() => setSelectedJobId(job.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ScrapeJobDetail({
  details,
  isLoading,
  onBack,
  onRefresh
}: {
  details?: ScrapeJobDetails;
  isLoading: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const job = details?.job;
  const queue = details?.queue;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 px-0">
            <ArrowLeft className="h-4 w-4" />
            Jobs
          </Button>
          <h1 className="text-2xl font-semibold tracking-normal">Scrape job details</h1>
          <p className="text-sm text-muted-foreground">Queue state, attempts, errors, and target information.</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">Loading job details...</CardContent>
        </Card>
      ) : null}

      {job && details ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Metric label="Status" value={job.status} />
            <Metric label="Queue state" value={queue?.state ?? "missing"} />
            <Metric label="Leads found" value={String(job.leadsFound)} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Detection</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <KeyValue label="Profile status" value={readProgressValue(queue?.progress, "profileStatus") ?? inferProfileStatus(job, queue)} />
              <KeyValue label="Parsed leads" value={readProgressValue(queue?.progress, "leadsParsed") ?? "Not parsed"} />
              <KeyValue label="Source checked" value={readProgressValue(queue?.progress, "source") ?? job.sourceValue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <KeyValue label="Source type" value={job.sourceType} />
              <KeyValue label="Source value" value={job.sourceValue} />
              <KeyValue label="Database job ID" value={job.id} />
              <KeyValue label="Queue job ID" value={job.bullJobId ?? "Not linked"} />
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Instagram URL</p>
                <a
                  className="inline-flex items-center gap-2 break-all text-sm font-medium text-primary hover:underline"
                  href={details.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {details.targetUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <KeyValue label="Created" value={formatDate(job.createdAt)} />
              <KeyValue label="Started" value={formatDate(job.startedAt)} />
              <KeyValue label="Completed" value={formatDate(job.completedAt)} />
              <KeyValue label="Queue created" value={formatMs(queue?.timestamp)} />
              <KeyValue label="Queue processed" value={formatMs(queue?.processedOn)} />
              <KeyValue label="Queue finished" value={formatMs(queue?.finishedOn)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <KeyValue label="Attempts made" value={String(queue?.attemptsMade ?? 0)} />
              <KeyValue label="Attempts started" value={String(queue?.attemptsStarted ?? 0)} />
              <KeyValue label="Delay" value={`${queue?.delay ?? 0} ms`} />
              <KeyValue label="Progress" value={formatJson(queue?.progress)} wide />
              <KeyValue label="Queue data" value={formatJson(queue?.data)} wide />
            </CardContent>
          </Card>

          {job.error || queue?.failedReason || queue?.stacktrace.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Failure details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KeyValue label="Database error" value={job.error ?? "None"} />
                <KeyValue label="Queue failure" value={queue?.failedReason ?? "None"} />
                {queue?.stacktrace.length ? (
                  <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
                    {queue.stacktrace.join("\n\n")}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Queue logs</CardTitle>
            </CardHeader>
            <CardContent>
              {queue?.logs.length ? (
                <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{queue.logs.join("\n")}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">No queue logs recorded for this job.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function KeyValue({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "space-y-1 md:col-span-3" : "space-y-1"}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function formatMs(value?: number) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function formatJson(value: unknown) {
  if (value === undefined || value === null) return "None";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function readProgressValue(progress: unknown, key: string) {
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) return null;
  const value = (progress as Record<string, unknown>)[key];
  if (value === undefined || value === null) return null;
  return String(value);
}

function inferProfileStatus(job: ScrapeJob, queue?: ScrapeJobDetails["queue"]) {
  const error = `${job.error ?? ""} ${queue?.failedReason ?? ""}`.toLowerCase();
  if (error.includes("not found")) return "NOT_FOUND";
  if (error.includes("login required")) return "LOGIN_REQUIRED";
  if (error.includes("rate limited")) return "RATE_LIMITED";
  if (error.includes("blocked")) return "BLOCKED";
  if (job.status === "COMPLETED") return "FOUND";
  if (job.status === "RUNNING") return "CHECKING";
  return "UNKNOWN";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
