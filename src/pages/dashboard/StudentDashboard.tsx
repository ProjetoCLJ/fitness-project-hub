import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Calendar, History, User } from "lucide-react";
import StudentProfile from "@/components/dashboard/student/StudentProfile";
import StudentBookings from "@/components/dashboard/student/StudentBookings";
import StudentHistory from "@/components/dashboard/student/StudentHistory";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "bookings");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  if (!user || user.userType !== "student") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Painel do Aluno</h1>
          <p className="text-muted-foreground">Bem-vindo, {user.profile.fullName}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid mb-8">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <StudentBookings />
          </TabsContent>

          <TabsContent value="history">
            <StudentHistory />
          </TabsContent>

          <TabsContent value="profile">
            <StudentProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
