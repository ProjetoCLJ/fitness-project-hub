import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, CalendarClock, Check, UserPlus, X } from "lucide-react";
import { RequestItem, fetchRequestsForStudent, fetchRequestsForTrainer, respondToRequest } from "@/lib/requestsStore";

const kindIcon = {
  invite: UserPlus,
  booking: CalendarClock,
  suggestion: CalendarClock,
  reschedule: CalendarClock,
} as const;

const Requests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(user.userType === "trainer" ? await fetchRequestsForTrainer(user.id) : await fetchRequestsForStudent(user.id));
    } catch {
      toast({ title: "Não foi possível carregar as solicitações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const respond = async (item: RequestItem, accept: boolean) => {
    setBusyId(item.id);
    try {
      await respondToRequest(item, accept);
      toast({ title: accept ? "Solicitação aceita" : "Solicitação recusada" });
      await load();
    } catch {
      toast({ title: "Não foi possível responder", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Solicitações</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Convites e pedidos que aguardam a sua resposta</p>
        </div>

        {!isLoading && items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3" />
            Nenhuma solicitação pendente.
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = kindIcon[item.kind];
              return (
                <Card key={`${item.kind}-${item.id}`} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{item.title}</p>
                        <Badge variant="outline" className="text-xs">Pendente</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm" disabled={busyId === item.id} onClick={() => respond(item, true)}>
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button className="flex-1" size="sm" variant="outline" disabled={busyId === item.id} onClick={() => respond(item, false)}>
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
