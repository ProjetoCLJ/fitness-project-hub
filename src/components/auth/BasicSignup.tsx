import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BasicSignupProps {
  userType: "student" | "trainer";
  roleLabel: string;
  subtitle: string;
}

/** Primeira etapa do cadastro: só dados básicos. Senha e demais dados vêm depois do e-mail de confirmação. */
export const BasicSignup = ({ userType, roleLabel, subtitle }: BasicSignupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", birthDate: "" });

  const handleChange = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await register({ ...formData, userType });
      navigate(`/confirme-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error) {
      toast({
        title: "Não foi possível cadastrar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">
              Cadastro de <span className="bg-gradient-hero bg-clip-text text-transparent">{roleLabel}</span>
            </h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          <Card className="p-8 shadow-medium">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input id="fullName" value={formData.fullName} onChange={(e) => handleChange("fullName", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => handleChange("birthDate", e.target.value)} required />
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sending}>
                {sending ? "Enviando..." : "Continuar"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
