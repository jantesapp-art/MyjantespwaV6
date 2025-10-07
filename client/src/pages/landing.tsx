import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, FileText, Calendar, Bell } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">MyJantes</h1>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Se connecter</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 lg:py-24 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Gestion Professionnelle de Services
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Simplifiez votre activité automobile avec notre plateforme complète pour les devis, factures et réservations.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login" className="text-base">
              Commencer
            </a>
          </Button>
        </section>

        <section className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Devis Rapides</h3>
            <p className="text-sm text-muted-foreground">
              Demandez et gérez vos devis en toute simplicité
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Approbations Intelligentes</h3>
            <p className="text-sm text-muted-foreground">
              Approuvez les devis et confirmez les réservations instantanément
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Réservations</h3>
            <p className="text-sm text-muted-foreground">
              Planifiez et suivez vos rendez-vous de service
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Notifications en Temps Réel</h3>
            <p className="text-sm text-muted-foreground">
              Restez informé avec des notifications instantanées
            </p>
          </Card>
        </section>

        <section className="py-12 text-center">
          <h3 className="text-2xl font-bold mb-4">Prêt à commencer ?</h3>
          <p className="text-muted-foreground mb-6">
            Rejoignez-nous dès aujourd'hui et simplifiez votre gestion de services
          </p>
          <Button size="lg" asChild data-testid="button-cta">
            <a href="/api/login">Se connecter maintenant</a>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MyJantes. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
