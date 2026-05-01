import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RefreshCw } from "lucide-react";
import { api, type ScrapeJob } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ScraperPage() {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<"USERNAME" | "HASHTAG" | "LOCATION">("USERNAME");
  const [sourceValue, setSourceValue] = useState("");

  const jobsQuery = useQuery({
    queryKey: ["scraper-jobs"],
    queryFn: async () => {
      const { data } = await api.get<ScrapeJob[]>("/api/scraper/jobs");
      return data;
    },
    refetchInterval: 10_000
  });

  const createJob = useMutation({
    mutationFn: async () => api.post("/api/scraper/jobs", { sourceType, sourceValue }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraper-jobs"] })
  });

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
              <Select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}>
                <option value="USERNAME">Username</option>
                <option value="HASHTAG">Hashtag</option>
                <option value="LOCATION">Location</option>
              </Select>
            </Field>
            <Field label="Value">
              <Input
                value={sourceValue}
                onChange={(event) => setSourceValue(event.target.value)}
                placeholder="username, hashtag, location id"
                required
              />
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
