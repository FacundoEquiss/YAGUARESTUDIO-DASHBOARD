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
import { AuthPage } from "@/pages/auth";
import { ProfilePage } from "@/pages/profile";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthLoadingBoundary } from "@/components/auth-loading-boundary";
import { RequireAuth } from "@/components/require-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AppErrorBoundary } from "@/components/app-error-boundary";

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="app-theme">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppErrorBoundary>
              <AuthLoadingBoundary>
                <Switch>
                  <Route path="/">
                    <AppShell>
                      <LandingPage />
                    </AppShell>
                  </Route>
                  <Route path="/auth">
                    <AuthPage />
                  </Route>
                  <Route path="/app">
                    <RequireAuth>
                      <DashboardLayout>
                        <CalculatorPage />
                      </DashboardLayout>
                    </RequireAuth>
                  </Route>
                  <Route path="/mockups">
                    <RequireAuth>
                      <DashboardLayout>
                        <ComingSoonPage feature="mockups" />
                      </DashboardLayout>
                    </RequireAuth>
                  </Route>
                  <Route path="/settings">
                    <RequireAuth>
                      <DashboardLayout>
                        <SettingsPage />
                      </DashboardLayout>
                    </RequireAuth>
                  </Route>
                  <Route path="/profile">
                    <RequireAuth>
                      <DashboardLayout>
                        <ProfilePage />
                      </DashboardLayout>
                    </RequireAuth>
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
              </AuthLoadingBoundary>
            </AppErrorBoundary>
          </WouterRouter>
        </ThemeProvider>
      </AuthProvider>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
