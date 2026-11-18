import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Login em modal (única forma de entrar). Recuperação de senha e atalho para o cadastro ficam aqui; o cadastro é uma tela à parte. */
export const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const navigate = useNavigate();
  const [forgot, setForgot] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setForgot(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {forgot ? "Recuperação de senha" : "Bem-vindo ao MyJourn"}
          </DialogTitle>
          {forgot ? (
            <DialogDescription className="sr-only">Informe seu e-mail para receber o link de recuperação de senha.</DialogDescription>
          ) : (
            <DialogDescription>Entre com sua conta para continuar</DialogDescription>
          )}
        </DialogHeader>
        <LoginForm
          forgot={forgot}
          onForgotChange={setForgot}
          onSuccess={() => handleOpenChange(false)}
          onSignup={() => {
            handleOpenChange(false);
            navigate("/cadastro");
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
