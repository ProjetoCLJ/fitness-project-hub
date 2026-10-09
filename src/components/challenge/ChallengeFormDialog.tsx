import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Challenge, ChallengeInput } from "@/lib/challengeStore";
import { toLocalISO } from "@/lib/agendaStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o diálogo edita este desafio. */
  challenge?: Challenge;
  onSubmit: (input: ChallengeInput) => Promise<void>;
}

export const ChallengeFormDialog = ({ open, onOpenChange, challenge, onSubmit }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [startDate, setStartDate] = useState(toLocalISO(new Date()));
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(challenge?.title ?? "");
    setDescription(challenge?.description ?? "");
    setRules(challenge?.rules ?? "");
    setStartDate(challenge?.startDate ?? toLocalISO(new Date()));
    setEndDate(challenge?.endDate ?? "");
  }, [open, challenge]);

  const invalidRange = !!endDate && endDate < startDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || invalidRange) return;
    setSaving(true);
    try {
      await onSubmit({ title, description, rules, startDate, endDate: endDate || null });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{challenge ? "Editar desafio" : "Criar desafio"}</DialogTitle>
          <DialogDescription>Defina o desafio e depois convide as pessoas por link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-title">Título</Label>
            <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: 30 dias de treino" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Descrição</Label>
            <Textarea id="ch-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-rules">Regras</Label>
            <Textarea
              id="ch-rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              placeholder="Ex.: 1 treino por dia, mínimo de 30 minutos"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ch-start">Data de início</Label>
              <Input id="ch-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-end">Data de fim (opcional)</Label>
              <Input id="ch-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {invalidRange && <p className="text-xs text-destructive">A data de fim não pode ser antes do início.</p>}
          <Button type="submit" variant="hero" className="w-full" disabled={saving || !title.trim() || invalidRange}>
            {saving ? "Salvando..." : challenge ? "Salvar alterações" : "Criar desafio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
