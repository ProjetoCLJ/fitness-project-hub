import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { User, Calendar, DollarSign, BookOpen, TrendingUp } from "lucide-react";
import TrainerProfile from "@/components/dashboard/trainer/TrainerProfile";
import TrainerSchedule from "@/components/dashboard/trainer/TrainerSchedule";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";
import TrainerClasses from "@/components/dashboard/trainer/TrainerClasses";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";

const TrainerDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "classes");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  if (!user || user.userType !== "trainer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Painel do Professor</h1>
          <p className="text-muted-foreground">Bem-vindo, {user.profile.fullName}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid mb-8">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Preços</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Aulas</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Faturamento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <TrainerProfile />
          </TabsContent>

          <TabsContent value="schedule">
            <TrainerSchedule />
          </TabsContent>

          <TabsContent value="pricing">
            <TrainerPricing />
          </TabsContent>

          <TabsContent value="classes">
            <TrainerClasses />
          </TabsContent>

          <TabsContent value="earnings">
            <TrainerEarnings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainerDashboard;
