import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { StudentPicker } from "@/components/events/StudentPicker";
import { formatEventWhen } from "@/components/events/EventCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Copy, ImageOff, Lock, MapPin, Share2, UserCircle, UserPlus, Users } from "lucide-react";
import {
  EventItem,
  EventParticipant,
  cancelEvent,
  eventHasEnded,
  eventIsFull,
  eventLink,
  fetchEvent,
  fetchParticipants,
  inviteStudentsToEvent,
  isJoined,
  joinEvent,
  leaveEvent,
  setEventInviteActive,
  updateEvent,
} from "@/lib/eventStore";

const EventDetail = () => {
  const { user } = useAuth();
  const uid = useAuthUid();
  const { id = "" } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const e = await fetchEvent(id);
      setEvent(e);
      if (!e) return;
      setJoined(await isJoined(id, uid));
      if (e.creatorId === uid) setParticipants(await fetchParticipants(id));
    } catch {
      setEvent(null);
      toast({ title: "Não foi possível carregar o evento", variant: "destructive" });
    }
  }, [id, uid, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || !uid || event === undefined) return null;

  const back = () => navigate("/eventos");

  if (event === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLoginClick={() => {}} />
        <div className="container mx-auto px-4 pt-24 max-w-3xl">
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Evento não encontrado, ou você não tem acesso a ele.
            <div className="mt-4">
              <Button variant="outline" onClick={back}>Voltar</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isCreator = event.creatorId === uid;
  const ended = eventHasEnded(event);
  const cancelled = event.status === "cancelled";
  const full = eventIsFull(event);
  const fail = (message = "Não foi possível concluir a ação") => toast({ title: message, variant: "destructive" });

  const run = async (action: () => Promise<void>, errorMessage?: string) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (error) {
      fail(errorMessage ?? (error instanceof Error ? error.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  const link = eventLink(event.inviteCode);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copiado" });
    } catch {
      fail("Copie o link manualmente");
    }
  };
  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url: link });
      } catch {
        /* cancelado */
      }
    } else {
      await copyLink();
    }
  };

  const sendInvites = async () => {
    if (selectedStudents.length === 0) return;
    setBusy(true);
    try {
      const sent = await inviteStudentsToEvent(event.id, selectedStudents);
      toast({ title: sent > 0 ? `${sent} convite(s) enviado(s)` : "Esses alunos já foram convidados" });
      setSelectedStudents([]);
    } catch {
      fail("Não foi possível enviar os convites");
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () => {
    if (!window.confirm("Cancelar este evento? Os inscritos serão avisados.")) return;
    run(() => cancelEvent(event.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-4">
        <Button variant="ghost" onClick={back} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Eventos
        </Button>

        <Card className="overflow-hidden">
          <div className="h-44 sm:h-60 bg-muted">
            {event.coverUrl ? (
              <img src={event.coverUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{event.title}</h1>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                {cancelled && <Badge variant="destructive">Cancelado</Badge>}
                {!cancelled && ended && <Badge variant="secondary">Encerrado</Badge>}
                {!cancelled && !ended && full && <Badge variant="secondary">Lotado</Badge>}
                {event.visibility === "private" && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Privado
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary shrink-0" />{formatEventWhen(event)}</p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                {[event.location, event.city && `${event.city}/${event.state}`].filter(Boolean).join(" · ")}
              </p>
              <p className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-primary shrink-0" />
                Organizado por {event.creatorName || "professor"}
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                {event.maxParticipants !== null
                  ? `${event.participantCount} de ${event.maxParticipants} vagas preenchidas`
                  : `${event.participantCount} inscritos · sem limite de vagas`}
              </p>
              <p className="text-xs text-muted-foreground">Criado em {new Date(event.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>

            {event.description && <p className="text-sm whitespace-pre-wrap">{event.description}</p>}

            {!isCreator && (
              <div>
                {joined ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Você está inscrito neste evento.</p>
                    {!ended && !cancelled && (
                      <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(() => leaveEvent(event.id, uid))}>
                        Cancelar minha inscrição
                      </Button>
                    )}
                  </div>
                ) : cancelled ? (
                  <Button className="w-full" disabled>Evento cancelado</Button>
                ) : ended ? (
                  <Button className="w-full" disabled>Evento encerrado</Button>
                ) : full ? (
                  <Button className="w-full" disabled>Evento lotado</Button>
                ) : (
                  <Button variant="hero" size="lg" className="w-full" disabled={busy} onClick={() => run(() => joinEvent(event.id))}>
                    Participar
                  </Button>
                )}
              </div>
            )}

            {isCreator && !cancelled && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Editar evento</Button>
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Convidar
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={confirmCancel}>
                  Cancelar evento
                </Button>
              </div>
            )}
          </div>
        </Card>

        {isCreator && (
          <Card className="p-4 sm:p-6">
            <h2 className="font-semibold mb-3">Inscritos ({participants.length})</h2>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém se inscreveu ainda.</p>
            ) : (
              <ul className="divide-y">
                {participants.map((p) => (
                  <li key={p.userId} className="py-2 flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      inscrito em {new Date(p.joinedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
        onSubmit={async (input) => {
          try {
            await updateEvent(event.id, uid, input);
            await load();
          } catch (error) {
            fail("Não foi possível salvar o evento");
            throw error;
          }
        }}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar para o evento</DialogTitle>
            <DialogDescription>Compartilhe o link ou convide alunos da sua carteira.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Link de convite</p>
              <div className="flex gap-2">
                <Input readOnly value={link} className={event.inviteActive ? "" : "opacity-50"} onFocus={(e) => e.target.select()} />
                <Button variant="outline" size="icon" onClick={copyLink} disabled={!event.inviteActive} aria-label="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={shareLink} disabled={!event.inviteActive}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Compartilhar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => run(() => setEventInviteActive(event.id, !event.inviteActive))}>
                  {event.inviteActive ? "Desativar link" : "Ativar link"}
                </Button>
              </div>
            </div>

            {user.userType === "trainer" && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-sm font-medium">Convidar alunos</p>
                <StudentPicker trainerId={user.id} selected={selectedStudents} onChange={setSelectedStudents} />
                <Button variant="hero" className="w-full" disabled={busy || selectedStudents.length === 0} onClick={sendInvites}>
                  Enviar convites
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
