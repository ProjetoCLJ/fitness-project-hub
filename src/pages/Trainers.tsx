import { useState } from "react";
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
import { Star, MapPin, Calendar, DollarSign, Filter, ChevronDown, ChevronUp, History } from "lucide-react";
import MapView from "@/components/MapView";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SchedulePreview } from "@/components/SchedulePreview";
import { useAuth } from "@/contexts/AuthContext";
import StudentHistory from "@/components/dashboard/student/StudentHistory";

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

  // Mock data - In real app, this would come from API
  const trainers = [
    {
      id: 1,
      name: "Carlos Silva",
      photo: "",
      rating: 4.8,
      reviews: 124,
      coords: [-23.5629, -46.6544],
      price: 150,
      experience: 8,
      specialties: ["Musculação", "Hipertrofia"],
      location: "Academia Gaviões - João Moura",
      address: "Rua João Moura, 375",
      available: true,
      schedule: [
        { start: "08:00", end: "09:00", available: true },
        { start: "09:00", end: "10:00", available: true },
        { start: "10:00", end: "11:00", available: false },
        { start: "14:00", end: "15:00", available: true },
        { start: "15:00", end: "16:00", available: true },
        { start: "16:00", end: "17:00", available: true }
      ]
    },
    {
      id: 2,
      name: "Ana Santos",
      photo: "",
      rating: 4.9,
      reviews: 98,
      coords: [-23.5710, -46.6470],
      price: 180,
      experience: 10,
      specialties: ["Yoga", "Pilates"],
      location: "CEPE - Cidade Universitária",
      address: "Av. Prof. Luciano Gualberto, 380",
      available: true,
      schedule: [
        { start: "07:00", end: "08:00", available: true },
        { start: "08:00", end: "09:00", available: true },
        { start: "17:00", end: "18:00", available: true },
        { start: "18:00", end: "19:00", available: true }
      ]
    },
    {
      id: 3,
      name: "Roberto Costa",
      photo: "",
      rating: 4.7,
      reviews: 156,
      coords: [-23.5580, -46.6330],
      price: 140,
      experience: 6,
      specialties: ["CrossFit", "Funcional"],
      location: "São Paulo - Centro",
      available: false,
      schedule: []
    }
  ];

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
            <span>{trainers.length} profissionais encontrados</span>
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

          {/* Map */}
          <div className="lg:col-span-5">
            <Card className="h-[600px] sticky top-24 overflow-hidden">
              <div className="w-full h-full">
                <MapView
                  center={[trainers[0].coords[0], trainers[0].coords[1]]}
                  zoom={12}
                  markers={trainers.map((t) => ({
                    ...(t.address ? {} : { position: [t.coords[0], t.coords[1]] as [number, number] }),
                    label: t.name,
                    address: t.address,
                  }))}
                />
              </div>
            </Card>
          </div>

          {/* Trainers List */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4" />
                            {trainer.location}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">R$ {trainer.price}</div>
                          <div className="text-xs text-muted-foreground">por aula</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-accent text-accent" />
                          <span className="font-semibold">{trainer.rating}</span>
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
                        {trainer.available ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                            Disponível
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Indisponível
                          </Badge>
                        )}
                      </div>

                      {date && trainer.schedule && trainer.schedule.length > 0 && (
                        <SchedulePreview date={date} slots={trainer.schedule} />
                      )}
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
