import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, RefreshCw } from "lucide-react";
import { api, type Lead } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function LeadsPage() {
  const [hasEmail, setHasEmail] = useState("true");
  const [keyword, setKeyword] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [tag, setTag] = useState("");

  const params = useMemo(
    () => ({
      hasEmail: hasEmail === "any" ? undefined : hasEmail,
      keyword: keyword || undefined,
      minFollowers: minFollowers || undefined,
      tag: tag || undefined,
      pageSize: 50
    }),
    [hasEmail, keyword, minFollowers, tag]
  );

  const leadsQuery = useQuery({
    queryKey: ["leads", params],
    queryFn: async () => {
      const { data } = await api.get<{ items: Lead[]; total: number }>("/api/leads", { params });
      return data;
    }
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Leads</h1>
          <p className="text-sm text-muted-foreground">Filter, score, and prepare Instagram leads for outreach.</p>
        </div>
        <Button variant="outline" onClick={() => leadsQuery.refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Field label="Email">
            <Select value={hasEmail} onChange={(event) => setHasEmail(event.target.value)}>
              <option value="true">Has email</option>
              <option value="false">No email</option>
              <option value="any">Any</option>
            </Select>
          </Field>
          <Field label="Bio keyword">
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="coach, agency, shop" />
          </Field>
          <Field label="Min followers">
            <Input value={minFollowers} onChange={(event) => setMinFollowers(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Tag">
            <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="warm" />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Bio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leadsQuery.data?.items ?? []).map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">@{lead.username}</div>
                    <div className="text-xs text-muted-foreground">{lead.fullName}</div>
                  </TableCell>
                  <TableCell>{lead.publicEmail ?? <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell>{lead.followerCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={lead.score >= 70 ? "default" : lead.score >= 40 ? "secondary" : "muted"}>{lead.score}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags?.map((tagItem) => (
                        <Badge key={tagItem.tag.id} variant="outline">
                          {tagItem.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md text-muted-foreground">
                    <p className="line-clamp-2">{lead.bio}</p>
                  </TableCell>
                </TableRow>
              ))}
              {!leadsQuery.isLoading && (leadsQuery.data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No leads match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
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
