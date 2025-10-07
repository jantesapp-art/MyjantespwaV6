import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Reservation } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-react";

export default function AdminReservations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Non autorisé",
        description: "Vous n'avez pas la permission d'accéder à cette page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, isLoading, isAdmin, toast]);

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
    enabled: isAuthenticated && isAdmin,
  });

  if (isLoading || !isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-admin-reservations-title">Reservation Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reservations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border border-border rounded-md hover-elevate"
                  data-testid={`reservation-item-${reservation.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold">Reservation #{reservation.id.slice(0, 8)}</p>
                      <StatusBadge status={reservation.status as any} />
                    </div>
                    <p className="text-sm text-muted-foreground">Client ID: {reservation.clientId.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">Service ID: {reservation.serviceId.slice(0, 8)}</p>
                    {reservation.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(reservation.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {reservation.scheduledDate && (
                      <p className="font-medium">
                        {new Date(reservation.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
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
