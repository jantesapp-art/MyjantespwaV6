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
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-16 lg:py-24 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Professional Service Management
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your automotive service business with our comprehensive platform for quotes, invoices, and reservations.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login" className="text-base">
              Get Started
            </a>
          </Button>
        </section>

        <section className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick Quotes</h3>
            <p className="text-sm text-muted-foreground">
              Request and manage service quotes with ease
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Approvals</h3>
            <p className="text-sm text-muted-foreground">
              Approve quotes and confirm reservations instantly
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Reservations</h3>
            <p className="text-sm text-muted-foreground">
              Schedule and track service appointments
            </p>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Stay updated with instant notifications
            </p>
          </Card>
        </section>

        <section className="py-12 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
          <p className="text-muted-foreground mb-6">
            Join us today and streamline your service management
          </p>
          <Button size="lg" asChild data-testid="button-cta">
            <a href="/api/login">Sign In Now</a>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MyJantes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
