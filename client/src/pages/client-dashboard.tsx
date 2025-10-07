import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Calendar, DollarSign, Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import type { Quote, Invoice, Reservation } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
  }, [isAuthenticated, isLoading, toast]);

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: isAuthenticated,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated,
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

  const pendingQuotes = quotes.filter((q) => q.status === "pending");
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const upcomingReservations = reservations.filter((r) => r.status === "confirmed");

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Tableau de bord</h1>
        <Button asChild data-testid="button-new-quote">
          <Link href="/services">
            <Plus className="h-4 w-4 mr-2" />
            Demander un devis
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis en attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-quotes">
              {quotesLoading ? <Skeleton className="h-8 w-16" /> : pendingQuotes.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-invoices">
              {invoicesLoading ? <Skeleton className="h-8 w-16" /> : pendingInvoices.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations à venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-reservations">
              {reservationsLoading ? <Skeleton className="h-8 w-16" /> : upcomingReservations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devis récents</CardTitle>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun devis pour le moment. Demandez un devis pour commencer !</p>
              <Button asChild className="mt-4" variant="outline" data-testid="button-request-first-quote">
                <Link href="/services">Parcourir les services</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.slice(0, 5).map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border border-border rounded-md hover-elevate"
                  data-testid={`quote-card-${quote.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">Quote #{quote.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {quote.createdAt && formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {quote.quoteAmount && (
                      <p className="font-mono font-semibold">${quote.quoteAmount}</p>
                    )}
                    <StatusBadge status={quote.status as any} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
