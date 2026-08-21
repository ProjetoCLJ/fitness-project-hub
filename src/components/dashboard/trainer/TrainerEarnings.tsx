import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Target } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

const TrainerEarnings = () => {
  const currentMonth = {
    earnings: 4800,
    classes: 32,
    students: 12,
    avgPerClass: 150
  };

  const previousMonth = {
    earnings: 4200,
    classes: 28
  };

  const projectedEarnings = 5400;

  const earningsChange = ((currentMonth.earnings - previousMonth.earnings) / previousMonth.earnings) * 100;
  const classesChange = ((currentMonth.classes - previousMonth.classes) / previousMonth.classes) * 100;

  const monthlyData = [
    { month: "Jul", value: 3600 },
    { month: "Ago", value: 3900 },
    { month: "Set", value: 4200 },
    { month: "Out", value: 4200 },
    { month: "Nov", value: 4800 },
    { month: "Dez", value: projectedEarnings }
  ];

  const transactions = [
    { id: 1, student: "Maria Fernanda", date: "02/12/2024", amount: 150, status: "paid" },
    { id: 2, student: "João Pedro", date: "02/12/2024", amount: 150, status: "paid" },
    { id: 3, student: "Beatriz Lima", date: "01/12/2024", amount: 150, status: "pending" },
    { id: 4, student: "Lucas Rodrigues", date: "28/11/2024", amount: 150, status: "paid" },
    { id: 5, student: "Ana Costa", date: "25/11/2024", amount: 150, status: "paid" }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600">Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pendente</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            {earningsChange > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="text-3xl font-bold mb-1">R$ {currentMonth.earnings.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Faturamento do Mês</div>
          <div className={`text-xs mt-2 ${earningsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {earningsChange > 0 ? '+' : ''}{earningsChange.toFixed(1)}% vs mês anterior
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            {classesChange > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div className="text-3xl font-bold mb-1">{currentMonth.classes}</div>
          <div className="text-sm text-muted-foreground">Aulas no Mês</div>
          <div className={`text-xs mt-2 ${classesChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {classesChange > 0 ? '+' : ''}{classesChange.toFixed(1)}% vs mês anterior
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Users className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{currentMonth.students}</div>
          <div className="text-sm text-muted-foreground">Alunos Ativos</div>
          <div className="text-xs mt-2 text-muted-foreground">
            No mês atual
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">R$ {projectedEarnings.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Faturamento Projetado</div>
          <div className="text-xs mt-2 text-primary">
            Baseado em agendamentos confirmados
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Tendência de Faturamento (Últimos 6 meses)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Histórico de Transações</h2>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-soft transition-smooth"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{transaction.student}</div>
                  <div className="text-sm text-muted-foreground">{transaction.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-lg">R$ {transaction.amount.toFixed(2)}</div>
                </div>
                {getStatusBadge(transaction.status)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TrainerEarnings;
