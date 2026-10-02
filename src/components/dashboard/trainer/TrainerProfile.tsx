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
  cref: string;
  experienceYears: string;
  description: string;
  objectives: string;
  instagram: string;
  facebook: string;
  linkedin: string;
}

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  cref: "",
  experienceYears: "",
  description: "",
  objectives: "",
  instagram: "",
  facebook: "",
  linkedin: "",
};

const TrainerProfile = () => {
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
        .from("trainer_profiles")
        .select("profile_id, cref, experience_years, description, objectives, instagram, facebook, linkedin, profiles(full_name, email, phone)")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfileId(data.profile_id);
        const profile = data.profiles as { full_name: string; email: string; phone: string | null } | null;
        setFormData({
          fullName: profile?.full_name ?? user.profile.fullName,
          email: profile?.email ?? user.email,
          phone: profile?.phone ?? user.profile.phone,
          cref: data.cref ?? "",
          experienceYears: data.experience_years != null ? String(data.experience_years) : "",
          description: data.description ?? "",
          objectives: data.objectives ?? "",
          instagram: data.instagram ?? "",
          facebook: data.facebook ?? "",
          linkedin: data.linkedin ?? "",
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
        .from("trainer_profiles")
        .update({
          cref: formData.cref || null,
          experience_years: formData.experienceYears ? Number(formData.experienceYears) : null,
          description: formData.description || null,
          objectives: formData.objectives || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          linkedin: formData.linkedin || null,
        })
        .eq("id", user.id);

      await supabase
        .from("profiles")
        .update({ full_name: formData.fullName, phone: formData.phone || null })
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
            <Label htmlFor="cref">CREF</Label>
            <Input
              id="cref"
              value={formData.cref}
              onChange={(e) => handleChange("cref", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceYears">Anos de Experiência</Label>
            <Input
              id="experienceYears"
              type="number"
              value={formData.experienceYears}
              onChange={(e) => handleChange("experienceYears", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Informações Profissionais</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição Profissional</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objetivos</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => handleChange("objectives", e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Redes Sociais</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="hero" size="lg" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default TrainerProfile;
