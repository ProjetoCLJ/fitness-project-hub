import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { accountExists, registerAccount } from "@/lib/accountStore";

const RegisterTrainer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    email: "",
    phone: "",
    gender: "",
    cref: "",
    startDate: "",
    description: "",
    objectives: "",
    classValue: "",
    locations: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (accountExists(formData.email)) {
      toast({
        title: "E-mail já cadastrado",
        description: "Já existe uma conta com esse e-mail. Tente entrar em vez de cadastrar.",
        variant: "destructive"
      });
      return;
    }

    registerAccount({
      email: formData.email,
      password: formData.password,
      userType: "trainer",
      fullName: formData.fullName,
      phone: formData.phone,
    });

    toast({
      title: "Cadastro realizado!",
      description: "Bem-vindo ao FIT",
    });

    await login(formData.email, formData.password);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">
              Cadastro de <span className="bg-gradient-hero bg-clip-text text-transparent">Professor</span>
            </h1>
            <p className="text-muted-foreground">Preencha seus dados profissionais para começar</p>
          </div>

          <Card className="p-8 shadow-medium">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange("birthDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>

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
                  <Label>Sexo *</Label>
                  <RadioGroup value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="cursor-pointer font-normal">Masculino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="cursor-pointer font-normal">Feminino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="cursor-pointer font-normal">Outro</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cref">CREF *</Label>
                  <Input
                    id="cref"
                    placeholder="000000-G/UF"
                    value={formData.cref}
                    onChange={(e) => handleChange("cref", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início dos Atendimentos *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classValue">Valor da Aula (R$) *</Label>
                  <Input
                    id="classValue"
                    type="number"
                    placeholder="150.00"
                    value={formData.classValue}
                    onChange={(e) => handleChange("classValue", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locations">Locais de Atendimento *</Label>
                <Input
                  id="locations"
                  placeholder="Ex: São Paulo - Zona Sul, Zona Oeste"
                  value={formData.locations}
                  onChange={(e) => handleChange("locations", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição de Perfil *</Label>
                <Textarea
                  id="description"
                  placeholder="Conte um pouco sobre sua experiência e metodologia de trabalho..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">Objetivos como Profissional *</Label>
                <Textarea
                  id="objectives"
                  placeholder="Quais são seus objetivos e metas profissionais?"
                  value={formData.objectives}
                  onChange={(e) => handleChange("objectives", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Redes Sociais (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      placeholder="@seuinstagram"
                      value={formData.instagram}
                      onChange={(e) => handleChange("instagram", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      placeholder="facebook.com/seuperfil"
                      value={formData.facebook}
                      onChange={(e) => handleChange("facebook", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      placeholder="linkedin.com/in/seuperfil"
                      value={formData.linkedin}
                      onChange={(e) => handleChange("linkedin", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Segurança</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full">
                Cadastrar
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterTrainer;
