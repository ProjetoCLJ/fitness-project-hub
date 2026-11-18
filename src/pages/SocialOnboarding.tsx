import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Dumbbell, UserCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { takePendingInvitePath } from "@/lib/challengeStore";
import { takeSignupRole } from "@/lib/socialAuth";

type Role = "student" | "trainer";
type Step = "checking" | "role" | "cref" | "saving";

const OPTIONS: { role: Role; icon: typeof Dumbbell; title: string; text: string }[] = [
  { role: "trainer", icon: UserCheck, title: "Sou professor", text: "Quero dar aulas, montar planos e acompanhar meus alunos." },
  { role: "student", icon: Dumbbell, title: "Vou usar para os meus treinos", text: "Quero treinar, evoluir e, se quiser, encontrar um profissional." },
];

const ERRORS: Record<string, string> = {
  CREF_REQUIRED: "Informe o seu CREF.",
  NOT_ALLOWED: "Seu cadastro já foi concluído.",
};

/**
 * Volta do login com Google/Apple. Quem já tinha conta vai direto ao painel; quem acabou de criar a conta escolhe
 * se é professor (e informa o CREF) ou se vai usar para os próprios treinos.
 */
const SocialOnboarding = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("checking");
  const [cref, setCref] = useState("");

  const finish = async (role: Role, crefValue?: string) => {
    setStep("saving");
    try {
      const { error } = await (supabase as unknown as SupabaseClient).rpc("complete_social_signup", { p_role: role, p_cref: crefValue ?? null });
      if (error) {
        const code = Object.keys(ERRORS).find((c) => error.message?.includes(c));
        throw new Error(code ? ERRORS[code] : "Não foi possível concluir o cadastro.");
      }
      await supabase.auth.refreshSession();
      // Recarrega para o app reconhecer o papel novo (menu, painel e demais telas).
      window.location.assign(takePendingInvitePath() ?? (role === "trainer" ? "/dashboard/trainer" : "/dashboard/student"));
    } catch (error) {
      setStep(role === "trainer" ? "cref" : "role");
      toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const savedRole = takeSignupRole();
    if (!user) {
      navigate("/?login=1", { replace: true });
      return;
    }
    const home = user.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student";
    supabase.auth.getSession().then(({ data }) => {
      const authUser = data.session?.user;
      const provider = authUser?.app_metadata?.provider;
      const needsOnboarding = !!authUser && !!provider && provider !== "email" && authUser.user_metadata?.onboarded !== true;
      if (!needsOnboarding) {
        navigate(takePendingInvitePath() ?? home, { replace: true });
      } else if (savedRole === "student") {
        finish("student");
      } else if (savedRole === "trainer") {
        setStep("cref");
      } else {
        setStep("role");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} minimal />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-xl">
        {step === "checking" || step === "saving" ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{step === "saving" ? "Concluindo seu cadastro..." : "Entrando..."}</Card>
        ) : step === "role" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Como você vai usar o MyJourn?</h1>
              <p className="text-muted-foreground">Escolha uma opção para concluir o seu cadastro.</p>
            </div>
            <div className="grid gap-3">
              {OPTIONS.map(({ role, icon: Icon, title, text }) => (
                <Card
                  key={role}
                  className="p-5 flex items-center gap-4 cursor-pointer hover:shadow-medium hover:border-primary/50 transition-smooth"
                  onClick={() => (role === "student" ? finish("student") : setStep("cref"))}
                >
                  <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6 sm:p-8">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                finish("trainer", cref);
              }}
            >
              <div>
                <h1 className="text-2xl font-bold">Conclua seu cadastro</h1>
                <p className="text-sm text-muted-foreground">Para criar sua conta de professor, informe o seu CREF.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cref">CREF *</Label>
                <Input id="cref" placeholder="000000-G/UF" value={cref} onChange={(e) => setCref(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!cref.trim()}>
                Concluir cadastro
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("role")}>
                Voltar
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SocialOnboarding;
