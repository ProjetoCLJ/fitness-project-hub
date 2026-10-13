import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ImageOff, Lock, MapPin, Users } from "lucide-react";
import { EventItem, eventHasEnded, eventIsFull } from "@/lib/eventStore";

export const formatEventWhen = (e: Pick<EventItem, "startsAt" | "endsAt">) => {
  const start = new Date(e.startsAt);
  const date = start.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time(start)}${e.endsAt ? ` – ${time(new Date(e.endsAt))}` : ""}`;
};

export const EventCard = ({ event, onClick }: { event: EventItem; onClick: () => void }) => {
  const ended = eventHasEnded(event);
  const full = eventIsFull(event);
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-medium transition-smooth" onClick={onClick}>
      <div className="h-28 bg-muted">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{event.title}</p>
          <div className="flex flex-wrap gap-1 justify-end shrink-0">
            {event.status === "cancelled" && <Badge variant="destructive">Cancelado</Badge>}
            {event.status === "active" && ended && <Badge variant="secondary">Encerrado</Badge>}
            {event.status === "active" && !ended && full && <Badge variant="secondary">Lotado</Badge>}
            {event.visibility === "private" && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Privado
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatEventWhen(event)}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[event.location, event.city && `${event.city}/${event.state}`].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {event.maxParticipants !== null ? `${event.participantCount}/${event.maxParticipants} vagas preenchidas` : `${event.participantCount} inscritos · sem limite`}
        </p>
      </div>
    </Card>
  );
};
