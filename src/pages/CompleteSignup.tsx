import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { takePendingInvitePath } from "@/lib/challengeStore";

/** Segunda etapa do cadastro: a pessoa chega pelo link do e-mail, cria a senha e preenche o restante. */
const CompleteSignup = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [cref, setCref] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const home = user?.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student";

  useEffect(() => {
    if (!user) return;
    supabase.auth.getSession().then(({ data }) => {
      const pending = data.session?.user.user_metadata?.needs_setup === true;
      setNeedsSetup(pending);
      if (!pending) navigate(takePendingInvitePath() ?? home, { replace: true });
    });
  }, [user, home, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use ao menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authId = sessionData.session?.user.id;
      if (!authId) throw new Error("Sessão expirada. Abra o link do e-mail novamente.");

      const { error: pwError } = await supabase.auth.updateUser({ password, data: { needs_setup: false } });
      if (pwError) throw pwError;

      const { data: profileRow } = await supabase.from("profiles").select("id").eq("user_id", authId).maybeSingle();
      if (profileRow) {
        if (user.userType === "trainer") {
          await supabase.from("trainer_profiles").update({ cref: cref.trim() || null }).eq("profile_id", profileRow.id);
        }
      }

      // Recarrega para o app reconhecer a conta como ativa (libera o menu e as demais telas).
      window.location.assign(takePendingInvitePath() ?? home);
    } catch (error) {
      toast({
        title: "Não foi possível concluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} minimal />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
        <Card className="p-6 sm:p-8">
          {isLoading || (user && needsSetup === null) ? (
            <p className="text-sm text-center text-muted-foreground">Confirmando seu e-mail...</p>
          ) : !user ? (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">Faça o cadastro novamente para receber um novo e-mail.</p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/")}>
                Ir para o início
              </Button>
            </div>
          ) : needsSetup ? (
            <form onSubmit={submit} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Conclua seu cadastro</h1>
                <p className="text-sm text-muted-foreground">E-mail confirmado! Crie sua senha para entrar na plataforma.</p>
              </div>

              {user.userType === "trainer" && (
                <div className="space-y-2">
                  <Label htmlFor="cref">CREF *</Label>
                  <Input id="cref" placeholder="000000-G/UF" value={cref} onChange={(e) => setCref(e.target.value)} required />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar Senha *</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Concluir cadastro"}
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
};

export default CompleteSignup;
