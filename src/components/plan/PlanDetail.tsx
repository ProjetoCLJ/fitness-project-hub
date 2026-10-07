import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Plan, Workout, WEEKDAY_SHORT, deleteWorkout, saveWorkout, setPlanStatus, updatePlan, workoutPositionLabel } from "@/lib/planStore";
import { toLocalISO } from "@/lib/agendaStore";
import { WorkoutDraft, WorkoutEditorDialog } from "@/components/plan/WorkoutEditorDialog";

interface PlanDetailProps {
  plan: Plan;
  onBack: () => void;
  onChanged: () => void | Promise<void>;
}

const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const statusBadge: Record<Plan["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Excluído", variant: "outline" },
};

interface EditorTarget {
  workout: Workout | null;
  weekIndex: number | null;
  weekday: number | null;
  workoutDate: string | null;
}

export const PlanDetail = ({ plan, onBack, onChanged }: PlanDetailProps) => {
  const { toast } = useToast();
  const readOnly = plan.status !== "active";
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<"completed" | "cancelled" | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date(`${plan.startDate}T00:00:00`));
  const [isBusy, setIsBusy] = useState(false);

  const run = async (action: () => Promise<void>, success: string) => {
    setIsBusy(true);
    try {
      await action();
      toast({ title: success });
      await onChanged();
    } catch {
      toast({ title: "Não foi possível concluir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveWorkout = async (draft: WorkoutDraft) => {
    if (!editor) return;
    await run(
      () =>
        saveWorkout(plan.id, {
          id: editor.workout?.id,
          name: draft.name,
          description: draft.description,
          weekIndex: editor.weekIndex,
          weekday: editor.weekday,
          workoutDate: editor.workoutDate,
          exercises: draft.exercises,
        }),
      editor.workout ? "Treino atualizado" : "Treino criado"
    );
    setEditor(null);
  };

  const handleDeleteWorkout = async () => {
    if (!editor?.workout) return;
    const id = editor.workout.id;
    await run(() => deleteWorkout(id), "Treino excluído");
    setEditor(null);
  };

  const cycleCell = (week: number, weekday: number) => {
    const workouts = plan.workouts.filter((w) => w.weekIndex === week && w.weekday === weekday);
    return (
      <div key={weekday} className="rounded-md border p-1 min-h-[72px] flex flex-col gap-1">
        <span className="text-[10px] font-medium text-muted-foreground text-center">{WEEKDAY_SHORT[weekday]}</span>
        {workouts.map((w) => (
          <button
            key={w.id}
            type="button"
            title={w.name}
            onClick={() => setEditor({ workout: w, weekIndex: week, weekday, workoutDate: null })}
            className="rounded bg-primary/15 text-primary text-[10px] leading-tight px-1 py-1 text-left truncate hover:bg-primary/25"
          >
            {w.name}
          </button>
        ))}
        {!readOnly && (
          <button
            type="button"
            aria-label="Adicionar treino"
            onClick={() => setEditor({ workout: null, weekIndex: week, weekday, workoutDate: null })}
            className="mt-auto flex items-center justify-center rounded border border-dashed py-1 text-muted-foreground hover:bg-muted/50"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const selectedISO = toLocalISO(selectedDay);
  const dayWorkouts = plan.workouts.filter((w) => w.workoutDate === selectedISO);
  const datesWithWorkouts = plan.workouts.filter((w) => w.workoutDate).map((w) => new Date(`${w.workoutDate}T00:00:00`));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Planos
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold truncate">{plan.title}</h2>
          <Badge variant={statusBadge[plan.status].variant} className="mt-1">
            {statusBadge[plan.status].label}
          </Badge>
        </div>
        {!readOnly && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Descrição</TabsTrigger>
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <Card className="p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Título</p>
              <p className="font-medium">{plan.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Objetivo</p>
              <p className="font-medium whitespace-pre-wrap">{plan.objective || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="font-medium whitespace-pre-wrap">{plan.description || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t text-sm">
              <div>
                <p className="text-muted-foreground">Data de criação</p>
                <p className="font-medium">{plan.createdAt ? formatDate(plan.createdAt) : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prazo</p>
                <p className="font-medium">{plan.endDate ? formatDate(plan.endDate) : "Sem prazo"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Início</p>
                <p className="font-medium">{formatDate(plan.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ciclo</p>
                <p className="font-medium">
                  {plan.cycleWeeks ? `${plan.cycleWeeks} ${plan.cycleWeeks === 1 ? "semana" : "semanas"}` : "Sem ciclo"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado por</p>
                <p className="font-medium">{plan.trainerName}</p>
              </div>
            </div>
            {!readOnly && (
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setConfirm("completed")}>
                  Concluir plano
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setConfirm("cancelled")}>
                  Excluir plano
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="workouts" className="space-y-3">
          {plan.cycleWeeks ? (
            <>
              <p className="text-xs text-muted-foreground">
                Ciclo de {plan.cycleWeeks} {plan.cycleWeeks === 1 ? "semana" : "semanas"}: a rotina abaixo se repete a cada ciclo. Clique num dia para criar ou editar o treino.
              </p>
              {Array.from({ length: plan.cycleWeeks }, (_, week) => (
                <div key={week} className="space-y-1">
                  <p className="text-sm font-medium">Semana {week + 1}</p>
                  <div className="grid grid-cols-7 gap-1">{[0, 1, 2, 3, 4, 5, 6].map((weekday) => cycleCell(week, weekday))}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Selecione um dia no calendário para criar ou editar os treinos daquela data.</p>
              <div className="flex justify-center rounded-md border">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => d && setSelectedDay(d)}
                  locale={ptBR}
                  modifiers={{ hasWorkout: datesWithWorkouts }}
                  modifiersClassNames={{ hasWorkout: "font-bold underline decoration-primary decoration-2 underline-offset-4" }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{formatDate(selectedISO)}</p>
                {dayWorkouts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum treino neste dia.</p>}
                {dayWorkouts.map((w) => (
                  <Card
                    key={w.id}
                    className="p-3 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
                    onClick={() => setEditor({ workout: w, weekIndex: null, weekday: null, workoutDate: selectedISO })}
                  >
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground">{w.exercises.length} exercícios</span>
                  </Card>
                ))}
                {!readOnly && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEditor({ workout: null, weekIndex: null, weekday: null, workoutDate: selectedISO })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar treino neste dia
                  </Button>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <WorkoutEditorDialog
        workout={editor?.workout ?? null}
        positionLabel={editor ? workoutPositionLabel(editor) : ""}
        open={!!editor}
        onOpenChange={(open) => !open && setEditor(null)}
        onSave={handleSaveWorkout}
        onDelete={readOnly ? undefined : handleDeleteWorkout}
      />

      <EditPlanDialog key={`${plan.id}-${editOpen}`} plan={plan} open={editOpen} onOpenChange={setEditOpen} onSaved={onChanged} />

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "completed" ? "Concluir plano?" : "Excluir plano?"}</DialogTitle>
            <DialogDescription>
              {confirm === "completed"
                ? "O plano será encerrado e movido para o histórico do aluno."
                : "O plano será movido para o histórico como excluído. Os treinos já realizados continuam registrados."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button
              variant={confirm === "cancelled" ? "destructive" : "hero"}
              className="flex-1"
              disabled={isBusy}
              onClick={async () => {
                const status = confirm;
                setConfirm(null);
                if (status) {
                  await run(() => setPlanStatus(plan.id, status), status === "completed" ? "Plano concluído" : "Plano excluído");
                  onBack();
                }
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EditPlanDialog = ({
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(plan.title);
  const [objective, setObjective] = useState(plan.objective);
  const [description, setDescription] = useState(plan.description);
  const [endDate, setEndDate] = useState(plan.endDate ?? "");
  const [isBusy, setIsBusy] = useState(false);

  const save = async () => {
    setIsBusy(true);
    try {
      await updatePlan(plan.id, { title: title.trim(), objective: objective.trim(), description: description.trim(), endDate: endDate || null });
      toast({ title: "Plano atualizado" });
      onOpenChange(false);
      await onSaved();
    } catch {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar plano</DialogTitle>
          <DialogDescription>O início e o ciclo não podem ser alterados depois de criado o plano.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-plan-title">Título</Label>
            <Input id="edit-plan-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plan-objective">Objetivo</Label>
            <Textarea id="edit-plan-objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plan-description">Descrição</Label>
            <Textarea id="edit-plan-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plan-end">Data de fim (opcional)</Label>
            <Input id="edit-plan-end" type="date" value={endDate} min={plan.startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button variant="hero" className="w-full" onClick={save} disabled={!title.trim() || isBusy}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
