import { useState } from "react";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, DollarSign, Instagram, Facebook, Linkedin, ArrowLeft, Trophy } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookingRequestDialog } from "@/components/agenda/BookingRequestDialog";
import { createProposal } from "@/lib/agendaStore";

// Demonstração local: este perfil (id "1") representa o mesmo profissional
// "trainer-1" usado pela agendaStore, e o aluno autenticado (mock)
// representa sempre o cliente "1" (Maria Fernanda).
const TRAINER_ID = "trainer-1";
const CURRENT_CLIENT_ID = "1";

const TrainerProfile = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Mock data - In real app, this would come from API
  const trainer = {
    id: 1,
    name: "Carlos Silva",
    photo: "",
    rating: 4.8,
    reviews: 124,
    price: 150,
    experience: 8,
    specialties: ["Musculação", "Hipertrofia", "Emagrecimento"],
    location: "São Paulo - Zona Sul",
    cref: "123456-G/SP",
    description: "Personal trainer com 8 anos de experiência focado em resultados reais. Metodologia personalizada baseada em ciência e acompanhamento próximo.",
    objectives: "Ajudar pessoas a alcançarem seus objetivos de forma saudável e sustentável, promovendo mudanças reais no estilo de vida.",
    instagram: "@carlossilvafit",
    facebook: "carlos.silva.fit",
    linkedin: "carlos-silva-personal",
    available: true,
    weekSchedule: {
      "Segunda": [{ start: "08:00", end: "09:00", available: true }, { start: "09:00", end: "10:00", available: true }, { start: "14:00", end: "15:00", available: true }, { start: "15:00", end: "16:00", available: true }],
      "Terça": [{ start: "08:00", end: "09:00", available: true }, { start: "10:00", end: "11:00", available: false }, { start: "14:00", end: "15:00", available: true }],
      "Quarta": [{ start: "08:00", end: "09:00", available: true }, { start: "09:00", end: "10:00", available: true }, { start: "16:00", end: "17:00", available: true }],
      "Quinta": [{ start: "08:00", end: "09:00", available: true }, { start: "14:00", end: "15:00", available: true }, { start: "15:00", end: "16:00", available: true }],
      "Sexta": [{ start: "08:00", end: "09:00", available: true }, { start: "09:00", end: "10:00", available: true }],
      "Sábado": [{ start: "09:00", end: "10:00", available: true }, { start: "10:00", end: "11:00", available: true }],
      "Domingo": []
    }
  };

  const testimonials = [
    {
      name: "Maria Oliveira",
      rating: 5,
      comment: "Excelente profissional! Perdi 15kg em 6 meses com os treinos personalizados.",
      date: "Há 2 semanas"
    },
    {
      name: "João Pedro",
      rating: 5,
      comment: "Muito atencioso e comprometido. Recomendo!",
      date: "Há 1 mês"
    },
    {
      name: "Ana Costa",
      rating: 4,
      comment: "Ótima metodologia, resultados apareceram rápido.",
      date: "Há 2 meses"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/trainers")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para busca
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={trainer.photo} />
                  <AvatarFallback className="text-4xl bg-gradient-primary text-primary-foreground">
                    {trainer.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{trainer.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {trainer.location}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-accent text-accent" />
                      <span className="font-bold text-lg">{trainer.rating}</span>
                      <span className="text-sm text-muted-foreground">({trainer.reviews} avaliações)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>{trainer.experience} anos de experiência</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    <span className="font-semibold">CREF: {trainer.cref}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {trainer.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {/* Social Links */}
                  <div className="flex items-center gap-3 pt-2">
                    {trainer.instagram && (
                      <a href={`https://instagram.com/${trainer.instagram}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Instagram className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {trainer.facebook && (
                      <a href={`https://facebook.com/${trainer.facebook}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Facebook className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {trainer.linkedin && (
                      <a href={`https://linkedin.com/in/${trainer.linkedin}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <Linkedin className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">Sobre</h2>
              <p className="text-muted-foreground leading-relaxed">{trainer.description}</p>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">Objetivos Profissionais</h2>
              <p className="text-muted-foreground leading-relaxed">{trainer.objectives}</p>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Agenda Semanal</h2>
              <div className="space-y-6">
                {Object.entries(trainer.weekSchedule).map(([day, slots]) => (
                  <div key={day} className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {day}
                    </h3>
                    {slots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.map((slot, index) => (
                          <div
                            key={index}
                            className={`text-sm px-3 py-2 rounded-md text-center ${
                              slot.available
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-muted text-muted-foreground line-through'
                            }`}
                          >
                            {slot.start} - {slot.end}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-7">Sem horários disponíveis</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Testimonials */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Avaliações</h2>
              <div className="space-y-6">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="border-b last:border-0 pb-6 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.date}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{testimonial.comment}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24 shadow-medium">
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="text-4xl font-bold text-primary mb-1">R$ {trainer.price}</div>
                  <div className="text-sm text-muted-foreground">por aula</div>
                </div>

                {trainer.available ? (
                  <Badge className="w-full justify-center bg-primary/10 text-primary hover:bg-primary/20 py-2">
                    Disponível para novas aulas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    Agenda completa
                  </Badge>
                )}

                <div className="space-y-3">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={() => (isAuthenticated ? setBookingOpen(true) : setLoginOpen(true))}
                  >
                    Agendar Aula
                  </Button>
                  <Button variant="outline" size="lg" className="w-full">
                    Enviar Mensagem
                  </Button>
                </div>

                <div className="pt-6 border-t space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Responde em até 24h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Primeira aula experimental disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Avaliação física gratuita</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <BookingRequestDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        trainerName={trainer.name}
        onSubmit={(date, startTime, endTime) => {
          createProposal(TRAINER_ID, CURRENT_CLIENT_ID, user?.profile.fullName ?? "Aluno", date, startTime, endTime);
          toast({ title: "Proposta enviada!", description: `Aguardando resposta de ${trainer.name}.` });
        }}
      />
    </div>
  );
};

export default TrainerProfile;
