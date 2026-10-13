import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CalendarClock, CalendarPlus, ChevronRight, Repeat, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RequestItem, RequestKind, fetchRequestsForStudent, fetchRequestsForTrainer } from "@/lib/requestsStore";
import { AppNotification, fetchNotifications, markNotificationRead } from "@/lib/eventStore";

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = user.userType === "trainer" ? await fetchRequestsForTrainer(user.id) : await fetchRequestsForStudent(user.id);
      setItems(all);
    } catch {
      setItems([]);
    }
    try {
      setNotifications(await fetchNotifications());
    } catch {
      setNotifications([]);
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

  type Entry = { key: string; title: string; description: string; createdAt: string; Icon: typeof Bell; unread: boolean; onClick: () => void };
  const entries: Entry[] = [
    ...items.map((item): Entry => ({
      key: `req-${item.kind}-${item.id}`,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt,
      Icon: KIND_ICON[item.kind] ?? Bell,
      unread: true,
      onClick: goToRequests,
    })),
    ...notifications.map((n): Entry => ({
      key: `ntf-${n.id}`,
      title: n.title,
      description: n.body,
      createdAt: n.createdAt,
      Icon: Bell,
      unread: !n.readAt,
      onClick: () => {
        markNotificationRead(n.id).catch(() => undefined);
        setOpen(false);
        navigate(n.link ?? requestsPath);
        load();
      },
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = entries.filter((e) => e.unread).length;

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
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-[1.1rem] text-primary-foreground text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold">Notificações</p>
        </div>

        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center text-muted-foreground">Nenhuma notificação por enquanto.</p>
        ) : (
          <div className="divide-y">
            {entries.slice(0, MAX_ITEMS).map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={entry.onClick}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-smooth ${entry.unread ? "" : "opacity-60"}`}
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
          Ver mais
          <ChevronRight className="h-4 w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
};
