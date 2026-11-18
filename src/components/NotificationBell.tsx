import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CalendarClock, CalendarPlus, ChevronRight, Repeat, UserPlus, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RequestItem, RequestKind, fetchRequestsForStudent, fetchRequestsForTrainer } from "@/lib/requestsStore";
import { fetchWorkoutRequests } from "@/lib/workoutRequests";
import { useRequestsBadge } from "@/lib/useRequestsBadge";

const MAX_ITEMS = 4;

const KIND_ICON: Record<RequestKind, typeof Bell> = {
  invite: UserPlus,
  booking: CalendarPlus,
  suggestion: CalendarClock,
  reschedule: Repeat,
};

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

interface Entry {
  key: string;
  title: string;
  description: string;
  createdAt: string;
  Icon: typeof Bell;
}

/** Sino do header: só as solicitações que aguardam a sua resposta, com atalho para a página de Solicitações. */
export const NotificationBell = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const count = useRequestsBadge();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [asTrainer, asStudent, workout] = await Promise.all([
        user.trainerId ? fetchRequestsForTrainer(user.trainerId) : Promise.resolve([] as RequestItem[]),
        fetchRequestsForStudent(user.studentId),
        fetchWorkoutRequests().catch(() => []),
      ]);
      const legacy: Entry[] = [...asTrainer, ...asStudent].map((item) => ({
        key: `req-${item.kind}-${item.id}`,
        title: item.title,
        description: item.description,
        createdAt: item.createdAt,
        Icon: KIND_ICON[item.kind] ?? Bell,
      }));
      const mine: Entry[] = workout
        .filter((r) => r.status === "pending" && r.requestedBy !== (user.trainerId && r.trainerId === user.trainerId ? "trainer" : "student"))
        .map((r) => {
          const iAmTrainer = !!user.trainerId && r.trainerId === user.trainerId;
          const who = iAmTrainer ? r.studentName : r.trainerName;
          const what = r.kind === "cancel" ? "cancelar" : "mudar";
          return {
            key: `wr-${r.id}`,
            title: r.kind === "cancel" ? "Pedido de cancelamento de treino" : r.scope === "all" ? "Pedido de mudança em todas as semanas" : "Pedido de mudança de treino",
            description: `${who} pediu para ${what} "${r.workoutName}" de ${fmtDate(r.fromDate)}.`,
            createdAt: r.createdAt,
            Icon: r.kind === "cancel" ? XCircle : CalendarClock,
          };
        });
      setEntries([...legacy, ...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      setEntries([]);
    }
  }, [user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!user) return null;

  const requestsPath = user.userType === "trainer" ? "/dashboard/trainer/requests" : "/dashboard/student/requests";
  const goToRequests = () => {
    setOpen(false);
    navigate(requestsPath);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Solicitações" className={`relative ${className ?? ""}`}>
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-[1.1rem] text-primary-foreground text-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold">Solicitações</p>
        </div>

        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center text-muted-foreground">Nenhuma solicitação aguardando a sua resposta.</p>
        ) : (
          <div className="divide-y">
            {entries.slice(0, MAX_ITEMS).map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={goToRequests}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-smooth"
              >
                <entry.Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{entry.title}</span>
                  <span className="block text-xs text-muted-foreground line-clamp-2">{entry.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={goToRequests}
          className="w-full flex items-center justify-center gap-1 px-4 py-3 border-t text-sm font-medium text-primary hover:bg-muted/60 transition-smooth"
        >
          Ver todas as solicitações
          <ChevronRight className="h-4 w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
};
