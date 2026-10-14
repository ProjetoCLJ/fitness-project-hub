import { Card } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { PaymentsList } from "@/components/finance/PaymentsList";
import { Payment, formatBRL } from "@/lib/financeStore";

interface Props {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}

/** Histórico de pagamentos lançados pelo profissional (mais recentes primeiro). */
const TrainerEarnings = ({ payments, onEdit, onDelete }: Props) => {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Histórico de pagamentos
        </h2>
        {payments.length > 0 && <span className="text-sm text-muted-foreground">Total: {formatBRL(total)}</span>}
      </div>
      {payments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum pagamento lançado ainda. Use o botão "+ Novo" para registrar o pagamento de um aluno.
        </div>
      ) : (
        <PaymentsList payments={payments} onEdit={onEdit} onDelete={onDelete} />
      )}
    </Card>
  );
};

export default TrainerEarnings;
