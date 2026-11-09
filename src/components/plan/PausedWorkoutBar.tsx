import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pause } from "lucide-react";
import { useActiveWorkout } from "@/lib/activeWorkout";

/** "Segundo header" com o treino pausado: aparece abaixo do header em qualquer página, exceto na própria tela do treino. */
export const PausedWorkoutBar = () => {
  const active = useActiveWorkout();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const visible = !!active && active.pausedAt !== null && !pathname.endsWith(`/session/${active.workoutId}`);

  // A barra é fixa logo abaixo do header; o corpo da página desce a altura dela.
  useEffect(() => {
    if (!visible) return;
    document.body.style.paddingTop = "2.25rem";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [visible]);

  if (!visible || !active) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/student/workouts/session/${active.workoutId}`)}
      className="w-full h-9 bg-amber-500 text-white text-sm font-medium flex items-center justify-center gap-2 px-4"
    >
      <Pause className="h-4 w-4 shrink-0" />
      <span className="truncate">Treino pausado: {active.workoutName} · toque para voltar</span>
    </button>
  );
};
