import { useState } from "react";
import { Header } from "@/components/Header";
import { ModalityCard } from "@/components/ModalityCard";
import { LoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-fitness.jpg";

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [searchCity, setSearchCity] = useState("");
  const navigate = useNavigate();

  const modalities = [
    {
      image: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Musculação",
      description: "Treinos personalizados com foco em hipertrofia e força"
    },
    {
      image: "https://images.pexels.com/photos/3822356/pexels-photo-3822356.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Yoga",
      description: "Equilíbrio entre corpo e mente com instrutores certificados"
    },
    {
      image: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "CrossFit",
      description: "Treinos de alta intensidade e funcionalidade"
    },
    {
      image: "https://images.pexels.com/photos/4162449/pexels-photo-4162449.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Calistenia",
      description: "Domine o peso corporal com treinos progressivos"
    },
    {
      image: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Artes Marciais",
      description: "Disciplina, técnica e condicionamento físico"
    },
    {
      image: "https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Natação",
      description: "Técnica, resistência e bem-estar na água"
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity) {
      navigate(`/search?city=${encodeURIComponent(searchCity)}`);
    }
  };

  const handleModalityClick = (modality: string) => {
    navigate(`/trainers?modality=${encodeURIComponent(modality)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 sm:pt-24 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Personal trainers e alunos treinando"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-8">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Encontre um{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Personal Trainer
              </span>
              {" "}adequado para seu plano!
            </h1>

            <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Conecte-se com profissionais certificados em sua cidade.
              Alcance seus objetivos com acompanhamento personalizado.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-smooth"></div>
                <div className="relative flex flex-col sm:flex-row gap-2 p-2 bg-card border-2 border-border rounded-2xl shadow-strong">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Digite sua cidade..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="pl-12 h-12 sm:h-14 text-base sm:text-lg border-0 focus-visible:ring-0 bg-transparent"
                    />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="h-12 sm:h-14 px-8">
                    Buscar
                  </Button>
                </div>
              </div>
            </form>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-8 max-w-2xl mx-auto pt-4 sm:pt-8">
              <div className="text-center">
                <div className="text-xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">500+</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Professores</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">50+</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Cidades</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">15k+</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Alunos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modalities Section */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-2 sm:space-y-4 mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold">Explore as Modalidades</h2>
            <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Encontre profissionais especializados na atividade física ideal para seus objetivos
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 max-w-6xl mx-auto">
            {modalities.map((modality, index) => (
              <ModalityCard
                key={index}
                image={modality.image}
                title={modality.title}
                description={modality.description}
                onClick={() => handleModalityClick(modality.title)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-8 p-6 sm:p-12 rounded-3xl bg-gradient-hero shadow-strong">
            <h2 className="text-2xl sm:text-4xl font-bold text-primary-foreground">
              É um Personal Trainer?
            </h2>
            <p className="text-sm sm:text-xl text-primary-foreground/90">
              Cadastre-se gratuitamente e conecte-se com alunos em sua região
            </p>
            <Button
              onClick={() => {
                setLoginOpen(true);
              }}
              variant="secondary"
              size="lg"
              className="text-base sm:text-lg px-8"
            >
              Cadastrar como Professor
            </Button>
          </div>
        </div>
      </section>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Index;
