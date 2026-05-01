import { useQuery } from "@tanstack/react-query";
import { Activity, MailCheck, MessageSquareReply, MousePointerClick, Send, Users } from "lucide-react";
import { api, type DashboardStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statCards = [
  { key: "leadCount", label: "Leads", icon: Users },
  { key: "leadsWithEmail", label: "With email", icon: MailCheck },
  { key: "campaigns", label: "Campaigns", icon: Activity },
  { key: "sent", label: "Sent", icon: Send },
  { key: "opened", label: "Opened", icon: MousePointerClick },
  { key: "replied", label: "Replied", icon: MessageSquareReply }
] as const;

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>("/api/dashboard/stats");
      return data;
    }
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Pipeline health across scraping, lead quality, and outreach.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{stats ? stats[stat.key] : "..."}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
