import { Card } from "@/components/ui/card";
import { Receipt } from "lucide-react";

/**
 * Histórico de pagamentos lançados pelo profissional. Ainda não há uma tela
 * para registrar esses lançamentos nem uma store (local ou no banco) para
 * eles — por isso a lista começa sempre vazia, em vez de dados inventados.
 */
const TrainerEarnings = () => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" />
        Histórico de pagamentos
      </h2>
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum pagamento lançado ainda. Quando você registrar o pagamento de um aluno, ele aparece aqui.
      </div>
    </Card>
  );
};

export default TrainerEarnings;
