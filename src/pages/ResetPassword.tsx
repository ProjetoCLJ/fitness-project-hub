import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Destino do link "Esqueci minha senha": a pessoa chega com uma sessão de recuperação e define a nova senha. */
const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady((prev) => prev ?? !!data.session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use ao menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível alterar a senha", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.auth.signOut();
    toast({ title: "Senha alterada", description: "Entre com a sua nova senha." });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <Card className="p-6 sm:p-8 space-y-4">
          {ready === null ? null : !ready ? (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">Peça um novo link em "Esqueci minha senha", na tela de entrada.</p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/")}>
                Ir para o início
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-xl font-bold">Definir nova senha</h1>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
