import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
            </form>
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
