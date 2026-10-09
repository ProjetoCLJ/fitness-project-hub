import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChallengeFormDialog } from "@/components/challenge/ChallengeFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Swords, Trophy } from "lucide-react";
import { Challenge, challengeProgress, createChallenge, fetchMyChallenges } from "@/lib/challengeStore";

const Challenges = () => {
  const { user } = useAuth();
  const uid = useAuthUid();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setChallenges(await fetchMyChallenges());
    } catch {
      setChallenges([]);
      toast({ title: "Não foi possível carregar seus desafios", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || user.userType !== "student") return null;

  // Pontuação geral ainda não tem backend — fica zerada até existir.
  const fitScore = 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Desafios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Consistência gera resultado — acompanhe sua jornada
          </p>
        </div>

        <section className="mb-8">
          <h2 className="font-semibold text-base sm:text-lg mb-3">FIT Score</h2>
          <Card className="p-4 sm:p-6 bg-gradient-hero text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">Seu FIT Score</span>
              </div>
              <span className="text-2xl font-bold">{fitScore}</span>
            </div>
            <p className="text-sm opacity-90 mt-1">Você ainda não aparece no ranking geral</p>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base sm:text-lg">Meus desafios</h2>
            <Button variant="hero" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar desafio
            </Button>
          </div>

          {challenges === null ? null : challenges.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <Swords className="h-8 w-8 mx-auto mb-3" />
              Você ainda não participa de nenhum desafio. Crie um e convide seus amigos, ou entre por um link de convite.
            </Card>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => {
                const p = challengeProgress(c);
                return (
                  <Card
                    key={c.id}
                    className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-medium transition-smooth"
                    onClick={() => navigate(`/desafios/${c.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{c.title}</p>
                        {c.status === "ended" && <Badge variant="secondary">Encerrado</Badge>}
                        {uid === c.creatorId && <Badge variant="outline">Organizador</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.participantCount ?? 0} {(c.participantCount ?? 0) === 1 ? "participante" : "participantes"}
                        {" · "}
                        {!p.started
                          ? `começa em ${p.daysToStart} ${p.daysToStart === 1 ? "dia" : "dias"}`
                          : p.total !== null
                            ? `${p.remaining} ${p.remaining === 1 ? "dia restante" : "dias restantes"}`
                            : `${p.elapsed} ${p.elapsed === 1 ? "dia" : "dias"} de desafio`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ChallengeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (input) => {
          if (!uid) return;
          try {
            const id = await createChallenge(uid, input);
            navigate(`/desafios/${id}`);
          } catch (error) {
            toast({ title: "Não foi possível criar o desafio", variant: "destructive" });
            throw error;
          }
        }}
      />
    </div>
  );
};

export default Challenges;
