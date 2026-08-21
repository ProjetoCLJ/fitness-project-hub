// Store local (localStorage) do plano de treino de um cliente.
// Simula a camada de dados até termos um backend real: permite que a
// edição feita pelo profissional (ClientProfilePro) seja refletida na
// visão do cliente (MyPlan) dentro do mesmo navegador.

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest: string;
}

export interface Workout {
  id: string;
  day: string;
  name: string;
  exercises: Exercise[];
  observations?: string;
}

export interface WorkoutExecution {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  completedExercises: { name: string; sets: number; reps: string; load: string }[];
  observations?: string;
}

export interface PlanVersion {
  timestamp: string;
  objective: string;
  strategy: string;
  workouts: Workout[];
}

export interface ClientPlan {
  clientId: string;
  objective: string;
  strategy: string;
  workouts: Workout[];
  executions: WorkoutExecution[];
  versions: PlanVersion[];
  updatedAt: string;
}

const STORAGE_PREFIX = "fit_plan_";

const defaultWorkouts: Workout[] = [
  {
    id: "w1",
    day: "Segunda",
    name: "Treino A - Inferiores",
    exercises: [
      { id: "e1", name: "Agachamento livre", sets: 4, reps: "10-12", load: "40kg", rest: "90s" },
      { id: "e2", name: "Leg press", sets: 3, reps: "12-15", load: "120kg", rest: "60s" },
      { id: "e3", name: "Cadeira extensora", sets: 3, reps: "15", load: "30kg", rest: "45s" },
    ],
  },
  {
    id: "w2",
    day: "Quarta",
    name: "Treino B - Superiores",
    exercises: [
      { id: "e4", name: "Supino reto", sets: 4, reps: "8-10", load: "50kg", rest: "90s" },
      { id: "e5", name: "Puxada frontal", sets: 3, reps: "10-12", load: "45kg", rest: "60s" },
      { id: "e6", name: "Desenvolvimento", sets: 3, reps: "10", load: "20kg", rest: "60s" },
    ],
  },
  {
    id: "w3",
    day: "Sexta",
    name: "Treino C - Full Body",
    exercises: [
      { id: "e7", name: "Levantamento terra", sets: 4, reps: "8", load: "60kg", rest: "120s" },
      { id: "e8", name: "Remada curvada", sets: 3, reps: "10", load: "40kg", rest: "60s" },
      { id: "e9", name: "Prancha", sets: 3, reps: "45s", load: "-", rest: "30s" },
    ],
  },
];

const defaultPlan = (clientId: string): ClientPlan => ({
  clientId,
  objective: "Melhorar condicionamento físico",
  strategy: "4 sessões semanais - hipertrofia",
  workouts: defaultWorkouts,
  executions: [],
  versions: [],
  updatedAt: new Date(2024, 10, 28).toISOString(),
});

export const getPlan = (clientId: string): ClientPlan => {
  const raw = localStorage.getItem(STORAGE_PREFIX + clientId);
  if (!raw) return defaultPlan(clientId);
  try {
    return JSON.parse(raw) as ClientPlan;
  } catch {
    return defaultPlan(clientId);
  }
};

const persist = (plan: ClientPlan) => {
  localStorage.setItem(STORAGE_PREFIX + plan.clientId, JSON.stringify(plan));
};

/** Salva alterações feitas pelo profissional, preservando a versão anterior no histórico. */
export const savePlanEdits = (
  clientId: string,
  edits: { objective?: string; strategy?: string; workouts?: Workout[] }
): ClientPlan => {
  const current = getPlan(clientId);
  const previousVersion: PlanVersion = {
    timestamp: current.updatedAt,
    objective: current.objective,
    strategy: current.strategy,
    workouts: current.workouts,
  };
  const updated: ClientPlan = {
    ...current,
    ...edits,
    versions: [previousVersion, ...current.versions].slice(0, 20),
    updatedAt: new Date().toISOString(),
  };
  persist(updated);
  return updated;
};

/** Registra a execução de um treino pelo cliente. */
export const recordExecution = (
  clientId: string,
  execution: Omit<WorkoutExecution, "id">
): ClientPlan => {
  const current = getPlan(clientId);
  const updated: ClientPlan = {
    ...current,
    executions: [{ ...execution, id: crypto.randomUUID() }, ...current.executions],
  };
  persist(updated);
  return updated;
};
