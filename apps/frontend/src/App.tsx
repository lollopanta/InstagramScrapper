import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell, type AppSection } from "@/components/AppShell";
import { getToken } from "@/lib/auth";
import { AuthPage } from "@/pages/AuthPage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadsPage } from "@/pages/LeadsPage";
import { ScraperPage } from "@/pages/ScraperPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [section, setSection] = useState<AppSection>("dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      {authenticated ? (
        <AppShell
          section={section}
          onSectionChange={setSection}
          onLogout={() => {
            queryClient.clear();
            setAuthenticated(false);
          }}
        >
          {section === "dashboard" ? <DashboardPage /> : null}
          {section === "leads" ? <LeadsPage /> : null}
          {section === "scraper" ? <ScraperPage /> : null}
          {section === "campaigns" ? <CampaignsPage /> : null}
        </AppShell>
      ) : (
        <AuthPage onAuthenticated={() => setAuthenticated(true)} />
      )}
    </QueryClientProvider>
  );
}
