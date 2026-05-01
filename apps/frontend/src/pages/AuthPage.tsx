import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { api, type AuthResponse } from "@/lib/api";
import { persistAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthPageProps = {
  onAuthenticated: () => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("founder@example.com");
  const [password, setPassword] = useState("change-me-123");
  const [name, setName] = useState("Founder");
  const [workspaceName, setWorkspaceName] = useState("DataReach Workspace");

  const authMutation = useMutation({
    mutationFn: async () => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, name, workspaceName };
      const { data } = await api.post<AuthResponse>(endpoint, payload);
      return data;
    },
    onSuccess: (data) => {
      persistAuth(data);
      onAuthenticated();
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo className="mb-3" />
          <CardTitle>DataReach OSS</CardTitle>
          <CardDescription>Access the lead generation and outreach workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                authMutation.mutate();
              }}
            >
              <TabsContent value="register" className="mt-0 space-y-4">
                <Field label="Name">
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                <Field label="Workspace">
                  <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                </Field>
              </TabsContent>
              <TabsContent value="login" className="mt-0" />
              <Field label="Email">
                <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {authMutation.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Authentication failed. Check the credentials and API status.
                </p>
              ) : null}
              <Button className="w-full" disabled={authMutation.isPending}>
                {authMutation.isPending ? "Working..." : mode === "login" ? "Login" : "Create workspace"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </main>
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
