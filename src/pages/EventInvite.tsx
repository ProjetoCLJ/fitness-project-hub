import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Lock, MapPin, UserCircle, Users } from "lucide-react";
import { formatEventWhen } from "@/components/events/EventCard";
import { EventPreview, getEventPreview, joinEvent } from "@/lib/eventStore";
import { savePendingPath } from "@/lib/challengeStore";

/** Página pública do link do evento: qualquer pessoa vê os detalhes; para participar é preciso ter conta. */
const EventInvite = () => {
  const { code = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<EventPreview | null | undefined>(undefined);
  const [loginOpen, setLoginOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEventPreview(code)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [code]);

  const join = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await joinEvent(preview.id, code);
      navigate(`/eventos/${preview.id}`);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível se inscrever", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const signUp = () => {
    savePendingPath(`/evento/${code}`);
    navigate("/register/student");
  };
  const signIn = () => {
    savePendingPath(`/evento/${code}`);
    setLoginOpen(true);
  };

  const ended = preview ? new Date(preview.endsAt ?? preview.startsAt).getTime() < Date.now() : false;
  const full = preview ? preview.maxParticipants !== null && preview.participantCount >= preview.maxParticipants : false;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={signIn} />

      <div className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
        {preview === undefined ? null : preview === null ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Este convite não existe ou foi desativado pelo organizador.</Card>
        ) : (
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold">{preview.title}</h1>
              {preview.visibility === "private" && (
                <Badge variant="outline" className="gap-1 shrink-0">
                  <Lock className="h-3 w-3" />
                  Privado
                </Badge>
              )}
            </div>
            {preview.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{preview.description}</p>}

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary shrink-0" />{formatEventWhen(preview)}</p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                {[preview.location, preview.city && `${preview.city}/${preview.state}`].filter(Boolean).join(" · ")}
              </p>
              <p className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary shrink-0" />Organizado por {preview.creatorName || "professor"}</p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                {preview.maxParticipants !== null ? `${preview.participantCount} de ${preview.maxParticipants} vagas preenchidas` : `${preview.participantCount} inscritos · sem limite`}
              </p>
            </div>

            {preview.status === "cancelled" ? (
              <Button className="w-full" disabled>Evento cancelado</Button>
            ) : ended ? (
              <Button className="w-full" disabled>Evento encerrado</Button>
            ) : isAuthenticated ? (
              preview.isMember ? (
                <Button variant="hero" size="lg" className="w-full" onClick={() => navigate(`/eventos/${preview.id}`)}>Abrir evento</Button>
              ) : full ? (
                <Button className="w-full" disabled>Evento lotado</Button>
              ) : (
                <Button variant="hero" size="lg" className="w-full" onClick={join} disabled={busy}>Participar</Button>
              )
            ) : (
              <div className="space-y-2">
                <Button variant="hero" size="lg" className="w-full" onClick={signUp}>Criar conta e participar</Button>
                <Button variant="outline" className="w-full" onClick={signIn}>Já tenho conta</Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default EventInvite;
