import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, ShieldAlert, Sparkles } from "lucide-react";
import { mockClients } from "./Clients";

const ClientProfilePro = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  if (!user || user.userType !== "trainer") return null;

  const client = mockClients.find((c) => c.id === id) ?? mockClients[0];

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard/trainer/clients")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Clientes
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
              {client.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.objective}</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-6">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="plan">Meu Plano</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="permissions">Permissões</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo atual</p>
                  <p className="font-medium">{client.objective}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Restrições relevantes</p>
                  <p className="font-medium">Leve desconforto no joelho direito — evitar impacto</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Próximo atendimento</p>
                  <p className="font-medium">{client.nextAppointment}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{client.lastUpdate}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card className="p-6 sm:p-8 text-center border-dashed">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium mb-1">Editor de plano e treinos chega na próxima fase</p>
              <p className="text-sm text-muted-foreground">
                Aqui você poderá criar e editar o plano, treinos e nutrição autorizada deste cliente.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="evolution">
            <Card className="p-6 sm:p-8 text-center border-dashed">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium mb-1">Evolução do cliente em breve</p>
              <p className="text-sm text-muted-foreground">Gráficos de progresso e consistência.</p>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6 sm:p-8 text-center border-dashed">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium mb-1">Histórico de atendimentos em breve</p>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Dados de treino</span>
                <Badge>Autorizado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dados de nutrição</span>
                <Badge variant="outline">Não autorizado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Histórico de saúde</span>
                <Badge variant="outline">Não autorizado</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientProfilePro;
