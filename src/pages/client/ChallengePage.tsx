import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChallengeFormDialog } from "@/components/challenge/ChallengeFormDialog";
import { LogActivityDialog } from "@/components/challenge/LogActivityDialog";
import { ActivityFeed } from "@/components/challenge/ActivityFeed";
import { ChallengeProgressBar } from "@/components/challenge/ChallengeProgressBar";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, MoreVertical, Plus, Share2, Trophy, UserMinus, Users } from "lucide-react";
import {
  Challenge,
  ChallengePost,
  RankingRow,
  createPost,
  fetchChallenge,
  fetchPosts,
  fetchRanking,
  inviteLink,
  leaveChallenge,
  removeParticipant,
  setChallengeStatus,
  setInviteActive,
  updateChallenge,
  updatePost,
} from "@/lib/challengeStore";

const MEDALS = ["🥇", "🥈", "🥉"];

const ChallengePage = () => {
  const { user } = useAuth();
  const uid = useAuthUid();
  const { id = "" } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [posts, setPosts] = useState<ChallengePost[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ChallengePost | undefined>();

  const backPath = user?.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student/challenges";

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const c = await fetchChallenge(id);
      setChallenge(c);
      if (!c) return;
      const [r, p] = await Promise.all([fetchRanking(id), fetchPosts(id, uid)]);
      setRanking(r);
      setPosts(p);
    } catch {
      setChallenge(null);
      toast({ title: "Não foi possível carregar o desafio", variant: "destructive" });
    }
  }, [id, uid, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || !uid || challenge === undefined) return null;

  if (challenge === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLoginClick={() => {}} />
        <div className="container mx-auto px-4 pt-24 max-w-3xl">
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Desafio não encontrado, ou você não participa dele.
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate(backPath)}>Voltar</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isCreator = challenge.creatorId === uid;
  const ended = challenge.status === "ended";
  const fail = () => toast({ title: "Não foi possível concluir a ação", variant: "destructive" });
  const link = inviteLink(challenge.inviteCode);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Copie o link manualmente", variant: "destructive" });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: challenge.title, text: `Participe do desafio "${challenge.title}"`, url: link });
      } catch {
        /* cancelado */
      }
    } else {
      await copyLink();
    }
  };

  const toggleInvite = async () => {
    try {
      await setInviteActive(challenge.id, !challenge.inviteActive);
      await load();
    } catch {
      fail();
    }
  };

  const toggleEnded = async () => {
    try {
      await setChallengeStatus(challenge.id, ended ? "active" : "ended");
      await load();
    } catch {
      fail();
    }
  };

  const leave = async () => {
    if (!window.confirm("Sair deste desafio? Suas atividades continuam no histórico dele.")) return;
    try {
      await leaveChallenge(challenge.id, uid);
      navigate(backPath);
    } catch {
      fail();
    }
  };

  const remove = async (row: RankingRow) => {
    if (!window.confirm(`Remover ${row.name} do desafio?`)) return;
    try {
      await removeParticipant(challenge.id, row.userId);
      await load();
    } catch {
      fail();
    }
  };

  const openLog = () => {
    setEditingPost(undefined);
    setLogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-32 sm:pt-24 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate(backPath)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Desafios
          </Button>
          <div className="flex items-center gap-1">
            {isCreator && (
              <Button variant="hero" size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Convidar
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais opções">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCreator ? (
                  <>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar desafio</DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleEnded}>{ended ? "Reabrir desafio" : "Encerrar desafio"}</DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={leave}>Sair do desafio</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="p-4 sm:p-6 mb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">{challenge.title}</h1>
            {ended && <Badge variant="secondary">Encerrado</Badge>}
          </div>
          {challenge.description && <p className="text-sm whitespace-pre-wrap">{challenge.description}</p>}
          {challenge.rules && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Regras</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{challenge.rules}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(`${challenge.startDate}T00:00:00`).toLocaleDateString("pt-BR")}
            {challenge.endDate ? ` — ${new Date(`${challenge.endDate}T00:00:00`).toLocaleDateString("pt-BR")}` : " — sem data de fim"}
            {" · "}
            {ranking.length} {ranking.length === 1 ? "participante" : "participantes"}
          </p>
        </Card>

        <Tabs defaultValue="ranking">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="ranking" className="flex-1">Ranking</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <ChallengeProgressBar challenge={challenge} />
            {ranking.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3" />
                Ainda não há participantes.
              </Card>
            ) : (
              <div className="space-y-2">
                {ranking.map((row, index) => (
                  <Card key={row.userId} className={`p-3 flex items-center gap-3 ${row.userId === uid ? "border-primary/50" : ""}`}>
                    <span className="w-8 text-center font-semibold">{MEDALS[index] ?? `${index + 1}º`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {row.name}
                        {row.userId === uid && <span className="text-xs text-muted-foreground"> (você)</span>}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Trophy className="h-4 w-4 text-primary" />
                      {row.points}
                    </span>
                    {isCreator && row.userId !== uid && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(row)} aria-label={`Remover ${row.name}`}>
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <ChallengeProgressBar challenge={challenge} />
            <ActivityFeed
              posts={posts}
              userId={uid}
              isCreator={isCreator}
              onChanged={load}
              onEdit={(post) => {
                setEditingPost(post);
                setLogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {!ended && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="container mx-auto max-w-3xl pointer-events-auto">
            <Button variant="hero" size="lg" className="w-full shadow-strong" onClick={openLog}>
              <Plus className="h-5 w-5 mr-2" />
              Registrar treino
            </Button>
          </div>
        </div>
      )}

      <LogActivityDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        post={editingPost}
        onSubmit={async (input) => {
          try {
            if (editingPost) await updatePost(editingPost.id, uid, input);
            else await createPost(challenge.id, uid, input);
            await load();
          } catch (error) {
            fail();
            throw error;
          }
        }}
      />

      <ChallengeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        challenge={challenge}
        onSubmit={async (input) => {
          try {
            await updateChallenge(challenge.id, input);
            await load();
          } catch (error) {
            fail();
            throw error;
          }
        }}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar para o desafio</DialogTitle>
            <DialogDescription>
              Quem abrir o link vê o desafio e, ao participar, cria a conta (ou entra) na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className={challenge.inviteActive ? "" : "opacity-50"} onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={copyLink} disabled={!challenge.inviteActive} aria-label="Copiar link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="hero" className="w-full" onClick={shareLink} disabled={!challenge.inviteActive}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">
                {challenge.inviteActive ? "O link está ativo." : "O link está desativado: ninguém novo consegue entrar."}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleInvite}>
                {challenge.inviteActive ? "Desativar link" : "Ativar link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChallengePage;
