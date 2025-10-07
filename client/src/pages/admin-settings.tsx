import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, Users, Shield, User as UserIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
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

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "client" | "admin" }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Rôle de l'utilisateur mis à jour",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du rôle",
        variant: "destructive",
      });
    },
  });

  const handleToggleRole = (user: User) => {
    const newRole = user.role === "admin" ? "client" : "admin";
    updateUserRoleMutation.mutate({ userId: user.id, role: newRole });
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const adminUsers = users.filter((u) => u.role === "admin");
  const clientUsers = users.filter((u) => u.role === "client");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-admin-settings-title">Paramètres & Utilisateurs</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Gestion des Utilisateurs</CardTitle>
          </div>
          <CardDescription>Gérez les rôles et permissions des utilisateurs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <>
              {/* Administrateurs */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Administrateurs ({adminUsers.length})
                </h3>
                <div className="space-y-2">
                  {adminUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun administrateur</p>
                  ) : (
                    adminUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover-elevate"
                        data-testid={`user-item-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" data-testid={`badge-role-${user.id}`}>
                            Admin
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRole(user)}
                            disabled={updateUserRoleMutation.isPending}
                            data-testid={`button-toggle-role-${user.id}`}
                          >
                            Rétrograder
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Clients */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Clients ({clientUsers.length})
                </h3>
                <div className="space-y-2">
                  {clientUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun client</p>
                  ) : (
                    clientUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover-elevate"
                        data-testid={`user-item-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" data-testid={`badge-role-${user.id}`}>
                            Client
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRole(user)}
                            disabled={updateUserRoleMutation.isPending}
                            data-testid={`button-toggle-role-${user.id}`}
                          >
                            Promouvoir
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Paramètres de l'Application</CardTitle>
          </div>
          <CardDescription>Configurez votre application MyJantes</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            D'autres paramètres seront disponibles dans les prochaines versions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
