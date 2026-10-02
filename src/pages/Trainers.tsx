import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Calendar, DollarSign, Filter, ChevronDown, ChevronUp, History } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StudentHistory from "@/components/dashboard/student/StudentHistory";

interface TrainerCard {
  id: string;
  name: string;
  photo: string;
  rating: number;
  reviews: number;
  price: number;
  experience: number;
  specialties: string[];
}

const Trainers = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const city = searchParams.get("city") || "";
  const modality = searchParams.get("modality") || "";
  const date = searchParams.get("date") || "";
  const gym = searchParams.get("gym") || "";

  const [trainers, setTrainers] = useState<TrainerCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("trainer_profiles")
        .select("id, experience_years, base_price, rating, total_reviews, is_active, profiles(full_name, profile_image_url), trainer_specialties(specialties(name))")
        .eq("is_active", true);

      const rows = (data ?? []).map((row) => {
        const profile = row.profiles as { full_name: string; profile_image_url: string | null } | null;
        const specs = (row.trainer_specialties as { specialties: { name: string } | null }[] | null) ?? [];
        return {
          id: row.id,
          name: profile?.full_name ?? "Profissional",
          photo: profile?.profile_image_url ?? "",
          rating: Number(row.rating ?? 0),
          reviews: row.total_reviews ?? 0,
          price: Number(row.base_price ?? 0),
          experience: row.experience_years ?? 0,
          specialties: specs.map((sp) => sp.specialties?.name).filter((n): n is string => !!n),
        };
      });
      setTrainers(rows);
      setIsLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Search Summary */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
              Voltar
            </Button>
            {user?.userType === "student" && (
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4 mr-2" />
                Histórico de aulas
              </Button>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Professores disponíveis
            {city && <span className="text-primary"> em {city}</span>}
          </h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{isLoading ? "Buscando..." : `${trainers.length} ${trainers.length === 1 ? "profissional encontrado" : "profissionais encontrados"}`}</span>
            {modality && <span>• Modalidade: <strong className="text-foreground">{modality}</strong></span>}
            {gym && gym !== "nenhuma" && <span>• Academia: <strong className="text-foreground">{gym}</strong></span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-3">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <Card className="p-6 sticky top-24">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-0 hover:bg-transparent mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold text-lg">Filtros</h2>
                    </div>
                    {filtersOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="city-filter">Cidade</Label>
                      <Input id="city-filter" placeholder="Digite a cidade" defaultValue={city} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-filter">Data</Label>
                      <Input id="date-filter" type="date" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="modality-filter">Modalidade</Label>
                      <Select defaultValue={modality || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as modalidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="musculacao">Musculação</SelectItem>
                          <SelectItem value="yoga">Yoga</SelectItem>
                          <SelectItem value="crossfit">CrossFit</SelectItem>
                          <SelectItem value="calistenia">Calistenia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price-filter">Preço Máximo (R$)</Label>
                      <Input id="price-filter" type="number" placeholder="Sem limite" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rating-filter">Avaliação Mínima</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer avaliação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.5">4.5+ estrelas</SelectItem>
                          <SelectItem value="4.0">4.0+ estrelas</SelectItem>
                          <SelectItem value="3.5">3.5+ estrelas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="available-only" className="rounded" />
                      <Label htmlFor="available-only" className="cursor-pointer font-normal">
                        Apenas disponíveis
                      </Label>
                    </div>

                    <Button variant="hero" className="w-full">
                      Aplicar Filtros
                    </Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Trainers List */}
          <div className="lg:col-span-9">
            <div className="space-y-4">
              {!isLoading && trainers.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum profissional encontrado.</Card>
              )}
              {trainers.map((trainer) => (
                <Card 
                  key={trainer.id}
                  className="p-6 hover:shadow-medium transition-smooth cursor-pointer"
                  onClick={() => navigate(`/trainer/${trainer.id}`)}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={trainer.photo} />
                      <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                        {trainer.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold">{trainer.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">R$ {trainer.price}</div>
                          <div className="text-xs text-muted-foreground">por aula</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-accent text-accent" />
                          <span className="font-semibold">{trainer.reviews > 0 ? trainer.rating.toFixed(1) : "Novo"}</span>
                          <span className="text-sm text-muted-foreground">({trainer.reviews} avaliações)</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{trainer.experience} anos de experiência</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {trainer.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de aulas</DialogTitle>
          </DialogHeader>
          <StudentHistory />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trainers;
