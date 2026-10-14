import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LinkedStudent, fetchLinkedStudents, toLocalISO } from "@/lib/agendaStore";
import {
  Offer,
  PAYMENT_METHODS,
  Payment,
  PaymentMethod,
  createOffer,
  createPayment,
  fetchOffers,
  updatePayment,
} from "@/lib/financeStore";

const OTHER = "__other__";
const NEW_OFFER = "__new__";
const NO_OFFER = "__none__";
const NO_METHOD = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  /** Quando informado, edita este lançamento. */
  payment?: Payment;
  /** Abre já com este aluno selecionado (ex.: aba Financeiro do aluno). */
  presetStudentId?: string;
  onSaved: () => void;
}

export const PaymentDialog = ({ open, onOpenChange, trainerId, payment, presetStudentId, onSaved }: Props) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payer, setPayer] = useState<string>(OTHER);
  const [otherName, setOtherName] = useState("");
  const [amount, setAmount] = useState("");
  const [offerId, setOfferId] = useState<string>(NO_OFFER);
  const [newOffer, setNewOffer] = useState({ name: "", classes: "", total: "" });
  const [date, setDate] = useState(toLocalISO(new Date()));
  const [method, setMethod] = useState<string>("pix");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([fetchLinkedStudents(trainerId), fetchOffers(trainerId)])
      .then(([s, o]) => {
        setStudents(s);
        setOffers(o);
      })
      .catch(() => toast({ title: "Não foi possível carregar alunos e ofertas", variant: "destructive" }));

    setPayer(payment ? (payment.studentId ?? OTHER) : (presetStudentId ?? OTHER));
    setOtherName(payment && !payment.studentId ? payment.payerName : "");
    setAmount(payment ? String(payment.amount) : "");
    setOfferId(payment?.offerId ?? NO_OFFER);
    setNewOffer({ name: "", classes: "", total: "" });
    setDate(payment?.paymentDate ?? toLocalISO(new Date()));
    setMethod(payment ? (payment.method ?? NO_METHOD) : "pix");
    setNotes(payment?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment, presetStudentId, trainerId]);

  const amountNumber = Number(amount.replace(",", "."));
  const newOfferValid = !!newOffer.name.trim() && Number(newOffer.classes) > 0 && newOffer.total !== "" && Number(newOffer.total) >= 0;
  const canSubmit =
    amount !== "" && Number.isFinite(amountNumber) && amountNumber >= 0 && !!date && (payer !== OTHER || !!otherName.trim()) && (offerId !== NEW_OFFER || newOfferValid);

  const pickOffer = (id: string) => {
    setOfferId(id);
    const offer = offers.find((o) => o.id === id);
    if (offer) setAmount(String(offer.totalPrice));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      let finalOfferId: string | null = offerId === NO_OFFER || offerId === NEW_OFFER ? null : offerId;
      let offerName = finalOfferId ? (offers.find((o) => o.id === finalOfferId)?.name ?? payment?.offerName ?? "") : "";
      if (offerId === NEW_OFFER) {
        const created = await createOffer(trainerId, {
          name: newOffer.name,
          classesCount: Number(newOffer.classes),
          totalPrice: Number(newOffer.total),
        });
        finalOfferId = created.id;
        offerName = created.name;
      }

      const input = {
        studentId: payer === OTHER ? null : payer,
        payerName: payer === OTHER ? otherName : "",
        amount: amountNumber,
        paymentDate: date,
        method: method === NO_METHOD ? null : (method as PaymentMethod),
        offerId: finalOfferId,
        offerName,
        notes,
      };
      if (payment) await updatePayment(payment.id, input);
      else await createPayment(trainerId, input);

      toast({ title: payment ? "Lançamento atualizado" : "Pagamento lançado" });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "Não foi possível salvar o pagamento", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{payment ? "Editar lançamento" : "Lançar pagamento"}</DialogTitle>
          <DialogDescription>Registre um pagamento recebido (pix, dinheiro, cartão ou boleto).</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quem pagou *</Label>
            <Select value={payer} onValueChange={setPayer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.studentId} value={s.studentId}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER}>Outro (digitar o nome)</SelectItem>
              </SelectContent>
            </Select>
            {payer === OTHER && (
              <Input placeholder="Nome de quem pagou (ex.: aula experimental)" value={otherName} onChange={(e) => setOtherName(e.target.value)} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Oferta (opcional)</Label>
            <Select value={offerId} onValueChange={pickOffer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OFFER}>Sem oferta</SelectItem>
                {offers
                  .filter((o) => o.isActive || o.id === payment?.offerId)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} — {o.classesCount} aula(s) · R$ {o.totalPrice.toFixed(2)}
                    </SelectItem>
                  ))}
                <SelectItem value={NEW_OFFER}>+ Criar nova oferta</SelectItem>
              </SelectContent>
            </Select>
            {payment && offerId === payment.offerId && !offers.some((o) => o.id === offerId) && payment.offerName && (
              <p className="text-xs text-muted-foreground">Oferta lançada: {payment.offerName}</p>
            )}

            {offerId === NEW_OFFER && (
              <div className="rounded-md border p-3 space-y-3">
                <Input placeholder="Nome (ex.: Pacote 5 aulas)" value={newOffer.name} onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" min={1} placeholder="Nº de aulas" value={newOffer.classes} onChange={(e) => setNewOffer({ ...newOffer, classes: e.target.value })} />
                  <Input type="number" min={0} step="0.01" placeholder="Valor total (R$)" value={newOffer.total} onChange={(e) => { setNewOffer({ ...newOffer, total: e.target.value }); setAmount(e.target.value); }} />
                </div>
                <p className="text-xs text-muted-foreground">A oferta fica salva em Financeiro &gt; Definir preços.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Valor pago (R$) *</Label>
              <Input id="pay-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Data *</Label>
              <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_METHOD}>Não informar</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-notes">Observação (opcional)</Label>
            <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex.: aula experimental" />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={saving || !canSubmit}>
            {saving ? "Salvando..." : payment ? "Salvar alterações" : "Lançar pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
