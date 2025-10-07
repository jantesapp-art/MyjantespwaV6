import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileText, DollarSign, Calendar, Users } from "lucide-react";
import type { Quote, Invoice, Reservation, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Non autorisé",
        description: "Vous êtes déconnecté. Reconnexion...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    if (!isLoading && !isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas la permission d'accéder à cette page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, isLoading, isAdmin, toast]);

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/admin/quotes"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
  const upcomingReservations = reservations.filter((r) => r.status === "confirmed").length;
  const totalClients = users.filter((u) => u.role === "client").length;

  if (isLoading || !isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-admin-dashboard-title">Tableau de bord Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis en attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admin-pending-quotes">
              {quotesLoading ? <Skeleton className="h-8 w-16" /> : pendingQuotes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En attente de réponse
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-admin-revenue">
              {invoicesLoading ? <Skeleton className="h-8 w-24" /> : `${totalRevenue.toFixed(2)} €`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Factures payées
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations à venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admin-reservations">
              {reservationsLoading ? <Skeleton className="h-8 w-16" /> : upcomingReservations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rendez-vous confirmés
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admin-clients">
              {usersLoading ? <Skeleton className="h-8 w-16" /> : totalClients}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisateurs enregistrés
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Devis récents</CardTitle>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun devis pour le moment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.slice(0, 5).map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-3 border border-border rounded-md text-sm"
                    data-testid={`admin-quote-${quote.id}`}
                  >
                    <div>
                      <p className="font-medium">Quote #{quote.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">Client: {quote.clientId.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{quote.quoteAmount ? `$${quote.quoteAmount}` : "—"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{quote.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune facture pour le moment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border border-border rounded-md text-sm"
                    data-testid={`admin-invoice-${invoice.id}`}
                  >
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">Client: {invoice.clientId.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">${invoice.amount}</p>
                      <p className="text-xs text-muted-foreground capitalize">{invoice.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
