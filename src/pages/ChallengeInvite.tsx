import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Trophy, Users } from "lucide-react";
import { ChallengePreview, getChallengePreview, joinChallenge, savePendingInvite } from "@/lib/challengeStore";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

/** Página pública do convite: mostra uma prévia do desafio e leva a pessoa a se cadastrar / entrar. */
const ChallengeInvite = () => {
  const { code = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ChallengePreview | null | undefined>(undefined);
  const [loginOpen, setLoginOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getChallengePreview(code)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [code]);

  const join = async () => {
    setJoining(true);
    try {
      const id = await joinChallenge(code);
      navigate(`/desafios/${id}`);
    } catch {
      toast({ title: "Não foi possível entrar no desafio", description: "O convite pode ter sido desativado.", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const signUp = () => {
    savePendingInvite(code);
    navigate("/register/student");
  };

  const signIn = () => {
    savePendingInvite(code);
    setLoginOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={signIn} />

      <div className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
        {preview === undefined ? null : preview === null ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Este convite não existe ou foi desativado pelo organizador.
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              <span className="text-sm font-semibold">Convite para desafio</span>
            </div>
            <h1 className="text-2xl font-bold">{preview.title}</h1>
            {preview.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{preview.description}</p>}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {fmt(preview.startDate)}
                {preview.endDate ? ` — ${fmt(preview.endDate)}` : " — sem data de fim"}
              </p>
              <p className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {preview.participantCount} {preview.participantCount === 1 ? "participante" : "participantes"}
                {preview.creatorName && ` · criado por ${preview.creatorName}`}
              </p>
            </div>

            {isAuthenticated ? (
              <Button variant="hero" size="lg" className="w-full" onClick={join} disabled={joining}>
                {preview.isMember ? "Abrir desafio" : "Participar do desafio"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button variant="hero" size="lg" className="w-full" onClick={signUp}>
                  Criar conta e participar
                </Button>
                <Button variant="outline" className="w-full" onClick={signIn}>
                  Já tenho conta
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default ChallengeInvite;
