import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toLocalISO } from "@/lib/agendaStore";
import { GmOverview, chooseFocoGoal, goalMenuTitle } from "@/lib/gamification";
import { useRefreshGamification } from "@/hooks/useGamification";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overview: GmOverview;
}

/** Menu de metas do Foco: a pessoa sempre escolhe entre 3 opções. */
export const GoalDialog = ({ open, onOpenChange, overview }: GoalDialogProps) => {
  const { toast } = useToast();
  const refresh = useRefreshGamification();
  const [busy, setBusy] = useState<number | null>(null);
  const title = goalMenuTitle(overview.foco, toLocalISO(new Date()));

  const choose = async (days: number) => {
    setBusy(days);
    try {
      await chooseFocoGoal(days);
      refresh();
      onOpenChange(false);
      toast({ title: `Meta de ${days} dias definida`, description: "Bora! Cada treino conta." });
    } catch {
      toast({ title: "Não foi possível definir a meta", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Foco é o número de dias seguidos cumprindo seus treinos. Ao bater a meta, você ganha XP e uma medalha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {overview.foco.options.map((option) => (
            <Button
              key={option.days}
              variant="outline"
              className="w-full h-auto py-3 justify-between"
              disabled={busy !== null}
              onClick={() => choose(option.days)}
            >
              <span className="flex items-center gap-2 text-base font-semibold">
                <Flame className="h-4 w-4 text-primary" />
                {option.days} dias
              </span>
              <span className="text-sm text-primary font-medium">+{option.xp} XP</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
