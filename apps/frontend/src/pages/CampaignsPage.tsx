import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Plus, RefreshCw } from "lucide-react";
import { api, type Campaign, type SmtpAccount } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [smtpAccountId, setSmtpAccountId] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [minDelaySec, setMinDelaySec] = useState("");
  const [maxDelaySec, setMaxDelaySec] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await api.get<Campaign[]>("/api/campaigns");
      return data;
    }
  });

  const smtpQuery = useQuery({
    queryKey: ["smtp-accounts"],
    queryFn: async () => {
      const { data } = await api.get<SmtpAccount[]>("/api/campaigns/smtp-accounts");
      return data;
    }
  });

  const createCampaign = useMutation({
    mutationFn: async () =>
      api.post("/api/campaigns", {
        name,
        smtpAccountId: smtpAccountId || undefined,
        dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
        minDelaySec: minDelaySec ? Number(minDelaySec) : undefined,
        maxDelaySec: maxDelaySec ? Number(maxDelaySec) : undefined,
        warmupEnabled: true,
        targetTagIds: [],
        sequenceSteps: [{ stepIndex: 0, delayDays: 0, subject, bodyHtml }]
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] })
  });

  const startCampaign = useMutation({
    mutationFn: async (id: string) => api.post(`/api/campaigns/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] })
  });

  const pauseCampaign = useMutation({
    mutationFn: async (id: string) => api.post(`/api/campaigns/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] })
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Build personalized sequences and send through SMTP queues.</p>
        </div>
        <Button variant="outline" onClick={() => campaignsQuery.refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Campaign builder</CardTitle>
            <CardDescription>Use placeholders: {"{{name}}"}, {"{{username}}"}, {"{{email}}"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createCampaign.mutate();
              }}
            >
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Instagram warm outreach"
                  required
                />
              </Field>
              <Field label="SMTP account">
                <Select value={smtpAccountId} onChange={(event) => setSmtpAccountId(event.target.value)}>
                  <option value="">Default Mailcatcher</option>
                  {smtpQuery.data?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.host}:{account.port})
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Daily limit">
                  <Input
                    type="number"
                    value={dailyLimit}
                    onChange={(event) => setDailyLimit(event.target.value)}
                    placeholder="50"
                  />
                </Field>
                <Field label="Min delay">
                  <Input
                    type="number"
                    value={minDelaySec}
                    onChange={(event) => setMinDelaySec(event.target.value)}
                    placeholder="45"
                  />
                </Field>
                <Field label="Max delay">
                  <Input
                    type="number"
                    value={maxDelaySec}
                    onChange={(event) => setMaxDelaySec(event.target.value)}
                    placeholder="180"
                  />
                </Field>
              </div>
              <Field label="Subject">
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Quick question for {{name}}"
                  required
                />
              </Field>
              <Field label="HTML body">
                <Textarea
                  value={bodyHtml}
                  onChange={(event) => setBodyHtml(event.target.value)}
                  className="min-h-40 font-mono"
                  placeholder="<p>Hi {{name}},</p><p>I found @{{username}} and wanted to connect.</p>"
                  required
                />
              </Field>
              <Button disabled={createCampaign.isPending}>
                <Plus className="h-4 w-4" />
                Create campaign
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaignsQuery.data ?? []).map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">{campaign.sequenceSteps.length} step sequence</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={campaign.status === "RUNNING" ? "default" : "muted"}>{campaign.status}</Badge>
                    </TableCell>
                    <TableCell>{campaign._count?.messages ?? 0}</TableCell>
                    <TableCell>{campaign.dailyLimit}/day</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" aria-label="Start campaign" onClick={() => startCampaign.mutate(campaign.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Pause campaign" onClick={() => pauseCampaign.mutate(campaign.id)}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
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
