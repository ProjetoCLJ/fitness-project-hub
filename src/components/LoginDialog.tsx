import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sending, setSending] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
    setSending(false);
    // Resposta neutra: não revela se o e-mail tem conta.
    toast({ title: "Verifique seu e-mail", description: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha." });
    setForgot(false);
  };

  const resendConfirmation = async () => {
    await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth/confirmado` } });
    toast({ title: "E-mail reenviado", description: "Confira sua caixa de entrada e o spam." });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      await login(email, password);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_NOT_CONFIRMED") {
        toast({
          title: "Confirme seu e-mail",
          description: "Clique no link que enviamos para ativar sua conta.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={resendConfirmation}>
              Reenviar
            </Button>
          ),
        });
        return;
      }
      toast({
        title: "Não foi possível entrar",
        description: "E-mail ou senha inválidos. Ainda não tem conta? Cadastre-se abaixo.",
        variant: "destructive"
      });
    }
  };

  const handleSignupRedirect = (userType: "student" | "trainer") => {
    onOpenChange(false);
    navigate(userType === "trainer" ? "/register/trainer" : "/register/student");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Bem-vindo ao FIT
          </DialogTitle>
          <DialogDescription>
            Entre com sua conta ou crie uma nova para começar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {forgot ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input id="forgot-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" variant="hero" size="lg" disabled={sending}>
                  {sending ? "Enviando..." : "Enviar link"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setForgot(false)}>
                  Voltar
                </Button>
              </form>
            ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" variant="hero" size="lg">
                Entrar
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setForgot(true)}>
                Esqueci minha senha
              </Button>
            </form>
            )}
          </TabsContent>

          <TabsContent value="signup" className="space-y-3">
            <p className="text-sm text-muted-foreground">Como você quer usar o FIT?</p>
            <Button onClick={() => handleSignupRedirect("student")} className="w-full" variant="hero" size="lg">
              Sou aluno — quero encontrar um profissional
            </Button>
            <Button onClick={() => handleSignupRedirect("trainer")} className="w-full" variant="outline" size="lg">
              Sou profissional — quero oferecer meus serviços
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
