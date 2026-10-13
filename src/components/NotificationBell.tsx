import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CalendarClock, CalendarPlus, ChevronRight, Repeat, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RequestItem, RequestKind, fetchRequestsForStudent, fetchRequestsForTrainer } from "@/lib/requestsStore";

const MAX_ITEMS = 4;

const KIND_ICON: Record<RequestKind, typeof Bell> = {
  invite: UserPlus,
  booking: CalendarPlus,
  suggestion: CalendarClock,
  reschedule: Repeat,
};

/** Sino de notificações do header: prévia das solicitações mais recentes, com atalho para a página completa. */
export const NotificationBell = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RequestItem[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = user.userType === "trainer" ? await fetchRequestsForTrainer(user.id) : await fetchRequestsForStudent(user.id);
      setItems([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      setItems([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const requestsPath = user.userType === "trainer" ? "/dashboard/trainer/requests" : "/dashboard/student/requests";
  const goToRequests = () => {
    setOpen(false);
    navigate(requestsPath);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className={`relative ${className ?? ""}`}>
          <Bell className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-[1.1rem] text-primary-foreground text-center">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold">Notificações</p>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center text-muted-foreground">Nenhuma notificação por enquanto.</p>
        ) : (
          <div className="divide-y">
            {items.slice(0, MAX_ITEMS).map((item) => {
              const Icon = KIND_ICON[item.kind] ?? Bell;
              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={goToRequests}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-smooth"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{item.title}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={goToRequests}
          className="w-full flex items-center justify-center gap-1 px-4 py-3 border-t text-sm font-medium text-primary hover:bg-muted/60 transition-smooth"
        >
          Ver mais
          <ChevronRight className="h-4 w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
};
