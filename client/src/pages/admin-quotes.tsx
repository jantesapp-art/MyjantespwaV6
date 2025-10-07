import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Quote, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X, FileText, Calendar, Download, Plus } from "lucide-react";
import { generateQuotePDF } from "@/lib/pdf-generator";
import { ObjectUploader } from "@/components/ObjectUploader";

export default function AdminQuotes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  const [invoiceDialog, setInvoiceDialog] = useState<Quote | null>(null);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  
  const [reservationDialog, setReservationDialog] = useState<Quote | null>(null);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationNotes, setReservationNotes] = useState("");
  
  const [createQuoteDialog, setCreateQuoteDialog] = useState(false);
  const [newQuoteClientId, setNewQuoteClientId] = useState("");
  const [newQuoteServiceId, setNewQuoteServiceId] = useState("");
  const [newQuotePaymentMethod, setNewQuotePaymentMethod] = useState<"cash" | "other">("other");
  const [newQuoteDetails, setNewQuoteDetails] = useState("");
  const [quoteMediaFiles, setQuoteMediaFiles] = useState<Array<{key: string; type: string}>>([]);

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

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/admin/quotes"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const handleDownloadPDF = (quote: Quote) => {
    const service = services.find(s => s.id === quote.serviceId);
    const clientInfo = { 
      name: `Client-${quote.clientId.slice(0, 8)}`,
      email: 'client@myjantes.fr'
    };
    generateQuotePDF(quote, clientInfo, service);
  };

  const updateQuoteMutation = useMutation({
    mutationFn: async (data: { id: string; quoteAmount?: string; notes?: string; status?: string }) => {
      return apiRequest("PATCH", `/api/admin/quotes/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Devis mis à jour avec succès",
      });
      setSelectedQuote(null);
      setQuoteAmount("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du devis",
        variant: "destructive",
      });
    },
  });

  const handleSaveQuote = () => {
    if (!selectedQuote) return;
    
    updateQuoteMutation.mutate({
      id: selectedQuote.id,
      quoteAmount,
      notes,
      status: "approved",
    });
  };

  const handleRejectQuote = (quoteId: string) => {
    updateQuoteMutation.mutate({
      id: quoteId,
      status: "rejected",
    });
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: { quoteId: string; clientId: string; amount: string; dueDate: string; notes?: string }) => {
      const invoiceNumber = `INV-${Date.now()}`;
      return apiRequest("POST", "/api/admin/invoices", {
        quoteId: data.quoteId,
        clientId: data.clientId,
        invoiceNumber,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Facture créée avec succès",
      });
      setInvoiceDialog(null);
      setInvoiceDueDate("");
      setInvoiceNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de la facture",
        variant: "destructive",
      });
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: { quoteId: string; clientId: string; serviceId: string; scheduledDate: string; notes?: string }) => {
      return apiRequest("POST", "/api/admin/reservations", {
        quoteId: data.quoteId,
        clientId: data.clientId,
        serviceId: data.serviceId,
        scheduledDate: data.scheduledDate,
        status: "confirmed",
        notes: data.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
      });
      setReservationDialog(null);
      setReservationDate("");
      setReservationNotes("");
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

  const handleCreateInvoice = () => {
    if (!invoiceDialog || !invoiceDueDate) return;
    createInvoiceMutation.mutate({
      quoteId: invoiceDialog.id,
      clientId: invoiceDialog.clientId,
      amount: invoiceDialog.quoteAmount || "0",
      dueDate: invoiceDueDate,
      notes: invoiceNotes,
    });
  };

  const handleCreateReservation = () => {
    if (!reservationDialog || !reservationDate) return;
    createReservationMutation.mutate({
      quoteId: reservationDialog.id,
      clientId: reservationDialog.clientId,
      serviceId: reservationDialog.serviceId,
      scheduledDate: reservationDate,
      notes: reservationNotes,
    });
  };

  const createNewQuoteMutation = useMutation({
    mutationFn: async (data: { clientId: string; serviceId: string; paymentMethod: string; requestDetails?: any; mediaFiles?: Array<{key: string; type: string}> }) => {
      return apiRequest("POST", "/api/admin/quotes", data);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Devis créé avec succès",
      });
      setCreateQuoteDialog(false);
      setNewQuoteClientId("");
      setNewQuoteServiceId("");
      setNewQuotePaymentMethod("other");
      setNewQuoteDetails("");
      setQuoteMediaFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création du devis",
        variant: "destructive",
      });
    },
  });

  const handleCreateNewQuote = () => {
    if (!newQuoteClientId || !newQuoteServiceId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et un service",
        variant: "destructive",
      });
      return;
    }
    
    const imageCount = quoteMediaFiles.filter(f => f.type.startsWith('image/')).length;
    if (imageCount < 6) {
      toast({
        title: "Erreur",
        description: `Au moins 6 images sont requises (${imageCount}/6)`,
        variant: "destructive",
      });
      return;
    }
    
    createNewQuoteMutation.mutate({
      clientId: newQuoteClientId,
      serviceId: newQuoteServiceId,
      paymentMethod: newQuotePaymentMethod,
      requestDetails: newQuoteDetails ? { notes: newQuoteDetails } : undefined,
      mediaFiles: quoteMediaFiles,
    });
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-quotes-title">Gestion des Devis</h1>
        <Button onClick={() => setCreateQuoteDialog(true)} data-testid="button-create-quote" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Créer un devis
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les Devis</CardTitle>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun devis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-md hover-elevate"
                  data-testid={`admin-quote-item-${quote.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-semibold">Devis #{quote.id.slice(0, 8)}</p>
                      <StatusBadge status={quote.status as any} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">ID Client: {quote.clientId.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground truncate">ID Service: {quote.serviceId.slice(0, 8)}</p>
                    {quote.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                    {quote.quoteAmount && (
                      <p className="font-mono font-bold text-lg whitespace-nowrap">{quote.quoteAmount} €</p>
                    )}
                    {quote.status === "pending" && (
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setQuoteAmount(quote.quoteAmount || "");
                            setNotes(quote.notes || "");
                          }}
                          data-testid={`button-respond-${quote.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          Répondre
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectQuote(quote.id)}
                          data-testid={`button-reject-${quote.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {quote.status === "approved" && (
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(quote)}
                          data-testid={`button-download-pdf-${quote.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setInvoiceDialog(quote);
                            setInvoiceDueDate(addDays(new Date(), 30).toISOString().split('T')[0]);
                            setInvoiceNotes("");
                          }}
                          data-testid={`button-create-invoice-${quote.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Facture
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReservationDialog(quote);
                            setReservationDate(addDays(new Date(), 7).toISOString().split('T')[0]);
                            setReservationNotes("");
                          }}
                          data-testid={`button-create-reservation-${quote.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Réservation
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Répondre à la Demande de Devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quote-amount">Montant du Devis ($)</Label>
              <Input
                id="quote-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="mt-2"
                data-testid="input-quote-amount"
              />
            </div>
            <div>
              <Label htmlFor="quote-notes">Notes</Label>
              <Textarea
                id="quote-notes"
                placeholder="Ajouter des détails supplémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                rows={4}
                data-testid="textarea-quote-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedQuote(null)}
              data-testid="button-cancel-quote"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveQuote}
              disabled={updateQuoteMutation.isPending || !quoteAmount}
              data-testid="button-save-quote"
            >
              {updateQuoteMutation.isPending ? "Enregistrement..." : "Enregistrer & Approuver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceDialog} onOpenChange={(open) => !open && setInvoiceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une Facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invoice-amount">Montant ($)</Label>
              <Input
                id="invoice-amount"
                type="number"
                step="0.01"
                value={invoiceDialog?.quoteAmount || ""}
                disabled
                className="mt-2"
                data-testid="input-invoice-amount"
              />
            </div>
            <div>
              <Label htmlFor="invoice-due-date">Date d'Échéance</Label>
              <Input
                id="invoice-due-date"
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                className="mt-2"
                data-testid="input-invoice-due-date"
              />
            </div>
            <div>
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Notes supplémentaires..."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="mt-2"
                rows={3}
                data-testid="textarea-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInvoiceDialog(null)}
              data-testid="button-cancel-invoice"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending || !invoiceDueDate}
              data-testid="button-save-invoice"
            >
              {createInvoiceMutation.isPending ? "Création..." : "Créer Facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reservationDialog} onOpenChange={(open) => !open && setReservationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une Réservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reservation-date">Date de Réservation</Label>
              <Input
                id="reservation-date"
                type="date"
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="mt-2"
                data-testid="input-reservation-date"
              />
            </div>
            <div>
              <Label htmlFor="reservation-notes">Notes</Label>
              <Textarea
                id="reservation-notes"
                placeholder="Détails de la réservation..."
                value={reservationNotes}
                onChange={(e) => setReservationNotes(e.target.value)}
                className="mt-2"
                rows={3}
                data-testid="textarea-reservation-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReservationDialog(null)}
              data-testid="button-cancel-reservation"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={createReservationMutation.isPending || !reservationDate}
              data-testid="button-save-reservation"
            >
              {createReservationMutation.isPending ? "Création..." : "Créer Réservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createQuoteDialog} onOpenChange={setCreateQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un Nouveau Devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-quote-client">Client</Label>
              <Select value={newQuoteClientId} onValueChange={setNewQuoteClientId}>
                <SelectTrigger className="mt-2" data-testid="select-new-quote-client">
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
              <Label htmlFor="new-quote-service">Service</Label>
              <Select value={newQuoteServiceId} onValueChange={setNewQuoteServiceId}>
                <SelectTrigger className="mt-2" data-testid="select-new-quote-service">
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-quote-payment-method">Moyen de paiement</Label>
              <Select value={newQuotePaymentMethod} onValueChange={(v) => setNewQuotePaymentMethod(v as "cash" | "other")}>
                <SelectTrigger className="mt-2" data-testid="select-new-quote-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-quote-details">Détails (optionnel)</Label>
              <Textarea
                id="new-quote-details"
                placeholder="Détails de la demande..."
                value={newQuoteDetails}
                onChange={(e) => setNewQuoteDetails(e.target.value)}
                className="mt-2"
                rows={3}
                data-testid="textarea-new-quote-details"
              />
            </div>
            <div>
              <Label>Images et Vidéos</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Minimum 6 images requises. Vidéos optionnelles.
              </p>
              <ObjectUploader
                onUploadComplete={(files) => setQuoteMediaFiles(files)}
                accept={{
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
                  'video/*': ['.mp4', '.webm', '.mov']
                }}
                data-testid="uploader-quote-media"
              />
              {quoteMediaFiles.length > 0 && quoteMediaFiles.filter(f => f.type.startsWith('image/')).length < 6 && (
                <p className="text-sm text-destructive mt-2">
                  Au moins 6 images sont requises ({quoteMediaFiles.filter(f => f.type.startsWith('image/')).length}/6)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateQuoteDialog(false);
                setQuoteMediaFiles([]);
              }}
              data-testid="button-cancel-new-quote"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateNewQuote}
              disabled={
                createNewQuoteMutation.isPending || 
                !newQuoteClientId || 
                !newQuoteServiceId ||
                quoteMediaFiles.filter(f => f.type.startsWith('image/')).length < 6
              }
              data-testid="button-save-new-quote"
            >
              {createNewQuoteMutation.isPending ? "Création..." : "Créer Devis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
