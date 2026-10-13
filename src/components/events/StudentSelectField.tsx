import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, UserPlus } from "lucide-react";
import { StudentPicker } from "@/components/events/StudentPicker";

interface Props {
  trainerId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

/** Campo "Convidar alunos": ao tocar, abre um modal com a lista para marcar vários alunos. */
export const StudentSelectField = ({ trainerId, selected, onChange, label = "Convidar alunos (opcional)" }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const openModal = () => {
    setDraft(selected);
    setOpen(true);
  };

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-between" onClick={openModal}>
        <span className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {selected.length > 0 ? `${selected.length} selecionado(s)` : "Nenhum"}
          <ChevronRight className="h-4 w-4" />
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar alunos</DialogTitle>
            <DialogDescription>Marque quantos alunos quiser.</DialogDescription>
          </DialogHeader>
          <StudentPicker trainerId={trainerId} selected={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="hero"
              className="flex-1"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Confirmar ({draft.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
