import { BarChart3, Download, LogOut, Search, Send, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import { clearAuth, getStoredUser, getStoredWorkspace } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AppSection = "dashboard" | "leads" | "scraper" | "campaigns";

type AppShellProps = {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
  onLogout: () => void;
  children: React.ReactNode;
};

const navItems: Array<{ value: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "leads", label: "Leads", icon: Users },
  { value: "scraper", label: "Scraper", icon: Search },
  { value: "campaigns", label: "Campaigns", icon: Send }
];

export function AppShell({ section, onSectionChange, onLogout, children }: AppShellProps) {
  const user = getStoredUser();
  const workspace = getStoredWorkspace();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo showWordmark={false} />
            <div>
              <p className="text-sm font-semibold">{workspace?.name ?? "DataReach"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Tabs value={section} defaultValue="dashboard" onValueChange={(value) => onSectionChange(value as AppSection)}>
              <TabsList className="grid h-auto grid-cols-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger key={item.value} value={item.value} className="h-9 gap-2 px-2 sm:px-3">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data } = await api.get("/api/exports/leads.csv", { responseType: "blob" });
                const url = URL.createObjectURL(data);
                const link = document.createElement("a");
                link.href = url;
                link.download = "leads.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={() => {
                clearAuth();
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
