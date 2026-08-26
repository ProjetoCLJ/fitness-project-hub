import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Dumbbell } from "lucide-react";
import { EQUIPMENT_TYPES, Equipment, MUSCLE_GROUPS, MuscleGroup, exerciseLibrary } from "@/data/exerciseLibrary";

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
          <div className="space-y-2">
            {filtered.map((ex) => (
              <Card key={ex.id} className="p-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ex.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ex.muscleGroup} · {ex.equipment}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">{ex.muscleGroup}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
