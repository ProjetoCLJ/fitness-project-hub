import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RegisterTrainer from "./pages/RegisterTrainer";
import RegisterStudent from "./pages/RegisterStudent";
import Search from "./pages/Search";
import Trainers from "./pages/Trainers";
import TrainerProfile from "./pages/TrainerProfile";
import ClientHome from "./pages/client/ClientHome";
import MyPlan from "./pages/client/MyPlan";
import Workouts from "./pages/client/Workouts";
import Challenges from "./pages/client/Challenges";
import ClientProfilePage from "./pages/client/ClientProfilePage";
import ProHome from "./pages/pro/ProHome";
import Clients from "./pages/pro/Clients";
import ClientProfilePro from "./pages/pro/ClientProfilePro";
import Agenda from "./pages/pro/Agenda";
import Financial from "./pages/pro/Financial";
import ProfessionalProfilePage from "./pages/pro/ProfessionalProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register/trainer" element={<RegisterTrainer />} />
            <Route path="/register/student" element={<RegisterStudent />} />
            <Route path="/search" element={<Search />} />
            <Route path="/trainers" element={<Trainers />} />
            <Route path="/trainer/:id" element={<TrainerProfile />} />

            {/* Cliente */}
            <Route path="/dashboard/student" element={<ClientHome />} />
            <Route path="/dashboard/student/plan" element={<MyPlan />} />
            <Route path="/dashboard/student/workouts" element={<Workouts />} />
            <Route path="/dashboard/student/challenges" element={<Challenges />} />
            <Route path="/dashboard/student/profile" element={<ClientProfilePage />} />

            {/* Profissional */}
            <Route path="/dashboard/trainer" element={<ProHome />} />
            <Route path="/dashboard/trainer/clients" element={<Clients />} />
            <Route path="/dashboard/trainer/clients/:id" element={<ClientProfilePro />} />
            <Route path="/dashboard/trainer/agenda" element={<Agenda />} />
            <Route path="/dashboard/trainer/financial" element={<Financial />} />
            <Route path="/dashboard/trainer/profile" element={<ProfessionalProfilePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App ;
