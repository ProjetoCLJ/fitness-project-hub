import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem como fechar (tela de login do app instalado): esconde o X e ignora clique fora e Esc. */
  locked?: boolean;
}

export const LoginDialog = ({ open, onOpenChange, locked = false }: LoginDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-md ${locked ? "[&>button]:hidden" : ""}`}
        onInteractOutside={locked ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={locked ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">Bem-vindo ao MyJourn</DialogTitle>
          <DialogDescription>Entre com sua conta para continuar</DialogDescription>
        </DialogHeader>
        <LoginForm
          onSuccess={() => onOpenChange(false)}
          onSignup={() => {
            onOpenChange(false);
            navigate("/cadastro");
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
