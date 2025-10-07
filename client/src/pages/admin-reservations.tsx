import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Reservation, User, Service, Quote } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AdminReservations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [createReservationDialog, setCreateReservationDialog] = useState(false);
  const [reservationType, setReservationType] = useState<"direct" | "from-quote">("direct");
  
  // Form state for direct reservation
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [wheelCount, setWheelCount] = useState<string>("1");
  const [diameter, setDiameter] = useState<string>("");
  const [priceHT, setPriceHT] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("20");
  const [productDetails, setProductDetails] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Form state for quote-based reservation
  const [selectedQuote, setSelectedQuote] = useState<string>("");

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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/admin/quotes"],
    enabled: isAuthenticated && isAdmin,
  });

  const approvedQuotes = quotes.filter(q => q.status === "approved");

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/reservations", data);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
      });
      resetForm();
      setCreateReservationDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de la réservation",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setReservationType("direct");
    setSelectedClient("");
    setSelectedService("");
    setScheduledDate("");
    setWheelCount("1");
    setDiameter("");
    setPriceHT("");
    setTaxRate("20");
    setProductDetails("");
    setNotes("");
    setSelectedQuote("");
  };

  const handleCreateReservation = () => {
    if (reservationType === "from-quote") {
      if (!selectedQuote || !scheduledDate) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un devis et une date",
          variant: "destructive",
        });
        return;
      }

      const quote = quotes.find(q => q.id === selectedQuote);
      if (!quote) {
        toast({
          title: "Erreur",
          description: "Devis introuvable",
          variant: "destructive",
        });
        return;
      }

      createReservationMutation.mutate({
        quoteId: selectedQuote,
        clientId: quote.clientId,
        serviceId: quote.serviceId,
        scheduledDate,
        wheelCount: quote.wheelCount,
        diameter: quote.diameter,
        priceExcludingTax: quote.priceExcludingTax,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        productDetails: quote.productDetails,
        notes: notes || undefined,
      });
    } else {
      if (!selectedClient || !selectedService || !scheduledDate) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      const taxRateNum = parseFloat(taxRate);
      const priceHTNum = parseFloat(priceHT || "0");
      const taxAmount = (priceHTNum * taxRateNum / 100).toFixed(2);

      createReservationMutation.mutate({
        clientId: selectedClient,
        serviceId: selectedService,
        scheduledDate,
        wheelCount: parseInt(wheelCount),
        diameter: diameter || undefined,
        priceExcludingTax: priceHT || undefined,
        taxRate: taxRate || undefined,
        taxAmount: taxAmount || undefined,
        productDetails: productDetails || undefined,
        notes: notes || undefined,
      });
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
      </div>
    );
  }

  const selectedQuoteDetails = selectedQuote ? quotes.find(q => q.id === selectedQuote) : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-reservations-title">Gestion des Réservations</h1>
        <Button onClick={() => setCreateReservationDialog(true)} data-testid="button-create-reservation" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Créer une réservation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les Réservations</CardTitle>
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
              <p>Aucune réservation pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-md hover-elevate"
                  data-testid={`reservation-item-${reservation.id}`}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <p className="font-semibold">Réservation #{reservation.id.slice(0, 8)}</p>
                      <StatusBadge status={reservation.status as any} />
                    </div>
                    <p className="text-sm text-muted-foreground">Client: {reservation.clientId.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">Service: {reservation.serviceId.slice(0, 8)}</p>
                    {reservation.quoteId && (
                      <p className="text-sm text-muted-foreground">Devis: {reservation.quoteId.slice(0, 8)}</p>
                    )}
                    {reservation.wheelCount && (
                      <p className="text-sm text-muted-foreground">Jantes: {reservation.wheelCount} | Diamètre: {reservation.diameter || "N/A"}</p>
                    )}
                    {reservation.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(reservation.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    {reservation.scheduledDate && (
                      <p className="font-medium text-primary">
                        {new Date(reservation.scheduledDate).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                    {reservation.priceExcludingTax && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Prix HT: {parseFloat(reservation.priceExcludingTax).toFixed(2)} €
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createReservationDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setCreateReservationDialog(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une Réservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Type de réservation</Label>
              <RadioGroup value={reservationType} onValueChange={(v) => setReservationType(v as "direct" | "from-quote")} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" data-testid="radio-reservation-direct" />
                  <Label htmlFor="direct" className="font-normal cursor-pointer">Réservation directe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="from-quote" id="from-quote" data-testid="radio-reservation-from-quote" />
                  <Label htmlFor="from-quote" className="font-normal cursor-pointer">À partir d'un devis approuvé</Label>
                </div>
              </RadioGroup>
            </div>

            {reservationType === "from-quote" ? (
              <>
                <div>
                  <Label htmlFor="selected-quote">Devis approuvé *</Label>
                  <Select value={selectedQuote} onValueChange={setSelectedQuote}>
                    <SelectTrigger className="mt-2" data-testid="select-quote">
                      <SelectValue placeholder="Sélectionner un devis" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedQuotes.map((quote) => (
                        <SelectItem key={quote.id} value={quote.id}>
                          Devis #{quote.id.slice(0, 8)} - {quote.quoteAmount ? `${parseFloat(quote.quoteAmount).toFixed(2)} €` : "N/A"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedQuoteDetails && (
                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <p className="font-semibold">Détails du devis</p>
                    <p className="text-sm">Client: {selectedQuoteDetails.clientId.slice(0, 8)}</p>
                    <p className="text-sm">Service: {selectedQuoteDetails.serviceId.slice(0, 8)}</p>
                    {selectedQuoteDetails.wheelCount && (
                      <p className="text-sm">Jantes: {selectedQuoteDetails.wheelCount} | Diamètre: {selectedQuoteDetails.diameter || "N/A"}</p>
                    )}
                    {selectedQuoteDetails.priceExcludingTax && (
                      <p className="text-sm">Prix HT: {parseFloat(selectedQuoteDetails.priceExcludingTax).toFixed(2)} €</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="scheduled-date">Date de réservation *</Label>
                  <Input
                    id="scheduled-date"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-2"
                    data-testid="input-scheduled-date"
                  />
                </div>

                <div>
                  <Label htmlFor="notes-quote">Notes (optionnel)</Label>
                  <Textarea
                    id="notes-quote"
                    placeholder="Notes supplémentaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    data-testid="input-notes"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="mt-2" data-testid="select-client">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === "client").map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service">Service *</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="mt-2" data-testid="select-service">
                      <SelectValue placeholder="Sélectionner un service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.isActive).map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} {service.basePrice ? `- ${parseFloat(service.basePrice).toFixed(2)} €` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="scheduled-date-direct">Date de réservation *</Label>
                  <Input
                    id="scheduled-date-direct"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-2"
                    data-testid="input-scheduled-date-direct"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="wheel-count">Nombre de jantes</Label>
                    <Select value={wheelCount} onValueChange={setWheelCount}>
                      <SelectTrigger className="mt-2" data-testid="select-wheel-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 jante</SelectItem>
                        <SelectItem value="2">2 jantes</SelectItem>
                        <SelectItem value="3">3 jantes</SelectItem>
                        <SelectItem value="4">4 jantes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="diameter">Diamètre</Label>
                    <Input
                      id="diameter"
                      type="text"
                      placeholder="ex: 17 pouces"
                      value={diameter}
                      onChange={(e) => setDiameter(e.target.value)}
                      className="mt-2"
                      data-testid="input-diameter"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price-ht">Prix HT (€)</Label>
                    <Input
                      id="price-ht"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={priceHT}
                      onChange={(e) => setPriceHT(e.target.value)}
                      className="mt-2"
                      data-testid="input-price-ht"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax-rate">Taux TVA (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      placeholder="20"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="mt-2"
                      data-testid="input-tax-rate"
                    />
                  </div>
                </div>

                {priceHT && taxRate && (
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-semibold">Calcul automatique:</p>
                    <p className="text-sm">Prix HT: {parseFloat(priceHT).toFixed(2)} €</p>
                    <p className="text-sm">TVA ({taxRate}%): {(parseFloat(priceHT) * parseFloat(taxRate) / 100).toFixed(2)} €</p>
                    <p className="text-sm font-semibold">Prix TTC: {(parseFloat(priceHT) * (1 + parseFloat(taxRate) / 100)).toFixed(2)} €</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="product-details">Détails produit</Label>
                  <Textarea
                    id="product-details"
                    placeholder="Détails sur les produits et services..."
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    className="mt-2"
                    rows={3}
                    data-testid="input-product-details"
                  />
                </div>

                <div>
                  <Label htmlFor="notes-direct">Notes (optionnel)</Label>
                  <Textarea
                    id="notes-direct"
                    placeholder="Notes supplémentaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    data-testid="input-notes-direct"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setCreateReservationDialog(false);
              }}
              data-testid="button-cancel-create-reservation"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={createReservationMutation.isPending}
              data-testid="button-save-reservation"
            >
              {createReservationMutation.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
