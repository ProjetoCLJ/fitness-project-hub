import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, UserCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignupProgress } from "@/components/auth/SignupProgress";

const OPTIONS = [
  {
    to: "/register/trainer",
    icon: UserCheck,
    title: "Sou professor",
    text: "Quero dar aulas, montar planos e acompanhar meus alunos.",
  },
  {
    to: "/register/student",
    icon: Dumbbell,
    title: "Vou usar para os meus treinos",
    text: "Quero treinar, evoluir e, se quiser, encontrar um profissional.",
  },
];

/** Cadastro, etapa 1 de 2: a pessoa escolhe se é professor ou se vai usar para os próprios treinos. */
const Cadastro = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/login")} />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Button variant="ghost" onClick={() => navigate("/login")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="max-w-xl mx-auto space-y-6">
          <SignupProgress step={1} />
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Como você vai usar o MyJourn?</h1>
            <p className="text-muted-foreground">Escolha uma opção para continuar o cadastro.</p>
          </div>
          <div className="grid gap-3">
            {OPTIONS.map(({ to, icon: Icon, title, text }) => (
              <Card key={to} className="p-5 flex items-center gap-4 cursor-pointer hover:shadow-medium hover:border-primary/50 transition-smooth" onClick={() => navigate(to)}>
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
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-primary hover:underline">
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
