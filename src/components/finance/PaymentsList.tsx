import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Payment, formatBRL, methodLabel } from "@/lib/financeStore";

interface Props {
  payments: Payment[];
  /** Mostra o nome de quem pagou (histórico do professor). */
  showPayer?: boolean;
  /** Mostra o nome do professor (visão do aluno). */
  showTrainer?: boolean;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

export const PaymentsList = ({ payments, showPayer = true, showTrainer = false, onEdit, onDelete }: Props) => (
  <ul className="divide-y">
    {payments.map((p) => (
      <li key={p.id} className="py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium truncate">
            {showPayer ? p.payerName : showTrainer ? p.trainerName ?? "Professor" : formatBRL(p.amount)}
            {showPayer && !p.studentId && (
              <Badge variant="outline" className="ml-2 text-[10px]">fora da plataforma</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(p.paymentDate)}
            {p.method ? ` · ${methodLabel(p.method)}` : ""}
            {p.offerName ? ` · ${p.offerName}` : ""}
          </p>
          {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-semibold text-primary mr-1">{formatBRL(p.amount)}</span>
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p)} aria-label="Editar lançamento">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(p)} aria-label="Excluir lançamento">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </li>
    ))}
  </ul>
);
