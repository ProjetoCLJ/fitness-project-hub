import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Tela exibida depois do cadastro quando o e-mail precisa ser confirmado. */
const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmado` },
    });
    setSending(false);
    toast(
      error
        ? { title: "Não foi possível reenviar", description: "Aguarde um minuto e tente de novo.", variant: "destructive" }
        : { title: "E-mail reenviado", description: "Confira sua caixa de entrada e o spam." }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          <MailCheck className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para {email ? <strong>{email}</strong> : "o seu e-mail"}. Clique nele para ativar sua conta e entrar.
          </p>
          <Button variant="outline" className="w-full" onClick={resend} disabled={sending || !email}>
            {sending ? "Enviando..." : "Reenviar e-mail"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;
