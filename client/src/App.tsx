// Local authentication with email/password
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import ClientDashboard from "@/pages/client-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Services from "@/pages/services";
import AdminQuotes from "@/pages/admin-quotes";
import AdminServices from "@/pages/admin-services";
import AdminInvoices from "@/pages/admin-invoices";
import AdminInvoiceEdit from "@/pages/admin-invoice-edit";
import AdminReservations from "@/pages/admin-reservations";
import AdminSettings from "@/pages/admin-settings";
import AdminUsers from "@/pages/admin-users";

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  useWebSocket(); // Initialize WebSocket connection

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/landing" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/">
          <Redirect to="/login" />
        </Route>
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  if (isAdmin) {
    const style = {
      "--sidebar-width": "16rem",
      "--sidebar-width-icon": "3rem",
    };

    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-border bg-background">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <NotificationBell />
                <ThemeToggle />
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Switch>
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/admin/services" component={AdminServices} />
                <Route path="/admin/quotes" component={AdminQuotes} />
                <Route path="/admin/invoices/:id/edit" component={AdminInvoiceEdit} />
                <Route path="/admin/invoices" component={AdminInvoices} />
                <Route path="/admin/reservations" component={AdminReservations} />
                <Route path="/admin/users" component={AdminUsers} />
                <Route path="/admin/settings" component={AdminSettings} />
                <Route path="/login">
                  <Redirect to="/admin" />
                </Route>
                <Route path="/" component={AdminDashboard} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-border bg-background">
        <h1 className="text-2xl font-bold text-primary">MyJantes</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={ClientDashboard} />
          <Route path="/services" component={Services} />
          <Route path="/login">
            <Redirect to="/" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
