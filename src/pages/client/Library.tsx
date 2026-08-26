import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Dumbbell, HeartPulse, PersonStanding, Bone, Hand, CircleDot, Activity } from "lucide-react";
import { EQUIPMENT_TYPES, Equipment, MUSCLE_GROUPS, MuscleGroup, exerciseLibrary } from "@/data/exerciseLibrary";

const GROUP_STYLE: Record<MuscleGroup, { icon: typeof Dumbbell; className: string }> = {
  Peito: { icon: Dumbbell, className: "bg-red-500/10 text-red-600" },
  Costas: { icon: Bone, className: "bg-blue-500/10 text-blue-600" },
  Pernas: { icon: PersonStanding, className: "bg-green-500/10 text-green-600" },
  Ombros: { icon: CircleDot, className: "bg-amber-500/10 text-amber-600" },
  Braços: { icon: Hand, className: "bg-purple-500/10 text-purple-600" },
  Core: { icon: Activity, className: "bg-orange-500/10 text-orange-600" },
  Cardio: { icon: HeartPulse, className: "bg-pink-500/10 text-pink-600" },
};

const Library = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseLibrary.filter((ex) => {
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q);
      const matchesMuscle = muscleFilter === "all" || ex.muscleGroup === muscleFilter;
      const matchesEquipment = equipmentFilter === "all" || ex.equipment === equipmentFilter;
      return matchesQuery && matchesMuscle && matchesEquipment;
    });
  }, [query, muscleFilter, equipmentFilter]);

  if (!user || user.userType !== "student") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-4">
          <h1 className="text-xl sm:text-3xl font-bold">Biblioteca de exercícios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{exerciseLibrary.length} exercícios catalogados</p>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, músculo ou equipamento..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-4 px-4">
          <button
            onClick={() => setMuscleFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border ${
              muscleFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setMuscleFilter(g)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm border ${
                muscleFilter === g ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
          <button
            onClick={() => setEquipmentFilter("all")}
            className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
              equipmentFilter === "all" ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground"
            }`}
          >
            Qualquer equipamento
          </button>
          {EQUIPMENT_TYPES.map((e) => (
            <button
              key={e}
              onClick={() => setEquipmentFilter(e)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border ${
                equipmentFilter === e ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            Nenhum exercício encontrado.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((ex) => {
              const style = GROUP_STYLE[ex.muscleGroup];
              const Icon = style.icon;
              return (
                <Card key={ex.id} className="p-4 flex items-center gap-3 hover:shadow-medium hover:border-primary/30 transition-smooth">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${style.className}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground truncate mb-1.5">{ex.equipment}</p>
                    <Badge variant="outline" className="text-xs">{ex.muscleGroup}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
