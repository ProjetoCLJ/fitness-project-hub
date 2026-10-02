import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  description: string;
  fitnessGoals: string;
}

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  description: "",
  fitnessGoals: "",
};

const StudentProfile = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("profile_id, description, fitness_goals, profiles(full_name, email, phone, birth_date)")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfileId(data.profile_id);
        const profile = data.profiles as { full_name: string; email: string; phone: string | null; birth_date: string | null } | null;
        setFormData({
          fullName: profile?.full_name ?? user.profile.fullName,
          email: profile?.email ?? user.email,
          phone: profile?.phone ?? user.profile.phone,
          birthDate: profile?.birth_date ?? "",
          description: data.description ?? "",
          fitnessGoals: data.fitness_goals ?? "",
        });
      }
      setIsLoading(false);
    })();
  }, [user]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user || !profileId) return;
    setIsSaving(true);
    try {
      await supabase
        .from("student_profiles")
        .update({ description: formData.description || null, fitness_goals: formData.fitnessGoals || null })
        .eq("id", user.id);

      await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone || null,
          birth_date: formData.birthDate || null,
        })
        .eq("id", profileId);

      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas com sucesso." });
    } catch {
      toast({ title: "Não foi possível salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Informações Pessoais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={formData.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange("birthDate", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Sobre Você</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fitnessGoals">Objetivos de Fitness</Label>
            <Textarea
              id="fitnessGoals"
              value={formData.fitnessGoals}
              onChange={(e) => handleChange("fitnessGoals", e.target.value)}
              rows={4}
              placeholder="Descreva seus objetivos e o que espera alcançar..."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="hero" size="lg" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default StudentProfile;
