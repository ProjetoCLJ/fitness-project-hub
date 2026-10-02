import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Calendar, Instagram, Facebook, Linkedin, ArrowLeft, Trophy } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookingRequestDialog } from "@/components/agenda/BookingRequestDialog";
import { createProposal } from "@/lib/agendaStore";
import { supabase } from "@/integrations/supabase/client";

interface TrainerData {
  id: string;
  name: string;
  photo: string;
  rating: number;
  reviews: number;
  price: number;
  experience: number;
  specialties: string[];
  cref: string;
  description: string;
  objectives: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  available: boolean;
}

interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  date: string;
}

const TrainerProfile = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [trainer, setTrainer] = useState<TrainerData | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("trainer_profiles")
        .select("id, cref, experience_years, description, objectives, base_price, instagram, facebook, linkedin, rating, total_reviews, is_active, profiles(full_name, profile_image_url), trainer_specialties(specialties(name))")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        const profile = data.profiles as { full_name: string; profile_image_url: string | null } | null;
        const specs = (data.trainer_specialties as { specialties: { name: string } | null }[] | null) ?? [];
        setTrainer({
          id: data.id,
          name: profile?.full_name ?? "Profissional",
          photo: profile?.profile_image_url ?? "",
          rating: Number(data.rating ?? 0),
          reviews: data.total_reviews ?? 0,
          price: Number(data.base_price ?? 0),
          experience: data.experience_years ?? 0,
          specialties: specs.map((sp) => sp.specialties?.name).filter((n): n is string => !!n),
          cref: data.cref ?? "",
          description: data.description ?? "",
          objectives: data.objectives ?? "",
          instagram: data.instagram ?? "",
          facebook: data.facebook ?? "",
          linkedin: data.linkedin ?? "",
          available: data.is_active ?? true,
        });

        const { data: reviewRows } = await supabase
          .from("reviews")
          .select("id, rating, comment, created_at")
          .eq("trainer_id", data.id)
          .order("created_at", { ascending: false });
        setTestimonials(
          (reviewRows ?? []).map((r) => ({
            id: r.id,
            rating: r.rating ?? 0,
            comment: r.comment ?? "",
            date: new Date(r.created_at ?? "").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          }))
        );
      }
      setIsLoading(false);
    })();
  }, [id]);

  if (isLoading) return null;

  if (!trainer) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLoginClick={() => setLoginOpen(true)} />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <Button variant="ghost" onClick={() => navigate("/trainers")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para busca
          </Button>
          <Card className="p-8 text-center text-sm text-muted-foreground">Profissional não encontrado.</Card>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

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
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-accent text-accent" />
                      <span className="font-bold text-lg">{trainer.reviews > 0 ? trainer.rating.toFixed(1) : "Novo"}</span>
                      <span className="text-sm text-muted-foreground">({trainer.reviews} avaliações)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>{trainer.experience} anos de experiência</span>
                    </div>
                  </div>

                  {trainer.cref && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-accent" />
                      <span className="font-semibold">CREF: {trainer.cref}</span>
                    </div>
                  )}

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
              <p className="text-muted-foreground leading-relaxed">{trainer.description || "Este profissional ainda não adicionou uma descrição."}</p>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">Objetivos Profissionais</h2>
              <p className="text-muted-foreground leading-relaxed">{trainer.objectives || "Este profissional ainda não adicionou seus objetivos."}</p>
            </Card>

            {/* Testimonials */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Avaliações</h2>
              {testimonials.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
              ) : (
                <div className="space-y-6">
                  {testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="border-b last:border-0 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm text-muted-foreground">{testimonial.date}</div>
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
              )}
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24 shadow-medium">
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="text-4xl font-bold text-primary mb-1">R$ {trainer.price.toFixed(2)}</div>
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
        trainerId={trainer.id}
        onSubmit={(date, startTime, endTime) => {
          createProposal(trainer.id, user?.id ?? "", user?.profile.fullName ?? "Aluno", date, startTime, endTime);
          toast({ title: "Proposta enviada!", description: `Aguardando resposta de ${trainer.name}.` });
        }}
      />
    </div>
  );
};

export default TrainerProfile;
