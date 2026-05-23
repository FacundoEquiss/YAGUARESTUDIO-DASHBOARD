import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppShell } from "@/components/app-shell";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CalculatorPage } from "@/pages/calculator";
import { SettingsPage } from "@/pages/settings";
import { SupportPage } from "@/pages/support";
import { LandingPage } from "@/pages/landing";
import { ComingSoonPage } from "@/pages/coming-soon";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AppErrorBoundary } from "@/components/app-error-boundary";

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="app-theme">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppErrorBoundary>
              <Switch>
                <Route path="/">
                  <AppShell>
                    <LandingPage />
                  </AppShell>
                </Route>
                <Route path="/app">
                  <DashboardLayout>
                    <CalculatorPage />
                  </DashboardLayout>
                </Route>
                <Route path="/mockups">
                  <DashboardLayout>
                    <ComingSoonPage feature="mockups" />
                  </DashboardLayout>
                </Route>
                <Route path="/settings">
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                </Route>
                <Route path="/support">
                  <DashboardLayout>
                    <SupportPage />
                  </DashboardLayout>
                </Route>
                <Route>
                  <AppShell>
                    <NotFound />
                  </AppShell>
                </Route>
              </Switch>
            </AppErrorBoundary>
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
