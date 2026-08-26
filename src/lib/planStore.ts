// Store local (localStorage) dos planos de um cliente.
// Simula a camada de dados até termos um backend real: permite que a
// edição feita pelo profissional (ClientProfilePro) seja refletida na
// visão do cliente (MyPlan/Workouts) dentro do mesmo navegador.
//
// Um cliente tem um histórico de Planos (entidades independentes e
// completas — objetivo, prazo, estratégias, treinos, profissionais
// responsáveis). Só um plano fica "active" por vez; ao criar um novo,
// o anterior é marcado "completed" e preservado no histórico.

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest: string;
  /** Exercícios com o mesmo supersetGroup são executados em sequência, sem descanso entre eles. */
  supersetGroup?: string;
}

export interface Workout {
  id: string;
  day: string;
  name: string;
  exercises: Exercise[];
  observations?: string;
}

/** Peso e repetições realmente executados em uma série específica. */
export interface SetLog {
  setNumber: number;
  weight: string;
  reps: string;
  /** RIR (repetições em reserva), 0-5. Opcional — nem todo cliente registra esforço. */
  effort?: number;
}

/** Execução de um exercício dentro de um treino: pode ter sido trocado naquele dia. */
export interface ExerciseLog {
  exerciseId: string;
  plannedName: string;
  performedName: string;
  sets: SetLog[];
  notes?: string;
  /** true quando a maior carga desta sessão superou o recorde anterior do exercício. */
  isPR?: boolean;
}

export interface WorkoutExecution {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  exerciseLogs: ExerciseLog[];
  observations?: string;
}

export interface PlanVersion {
  timestamp: string;
  objective: string;
  trainingStrategy: string;
  workouts: Workout[];
}

export interface Plan {
  id: string;
  clientId: string;
  title: string;
  objective: string;
  deadline: string;
  trainingStrategy: string;
  trainingApproach: string;
  nutritionStrategy: string;
  trainerName: string;
  nutritionistName: string;
  workouts: Workout[];
  executions: WorkoutExecution[];
  versions: PlanVersion[];
  progress: number;
  status: "active" | "completed";
  startDate: string;
  endDate?: string;
  updatedAt: string;
}

const STORAGE_PREFIX = "fit_plans_";

const defaultWorkouts: Workout[] = [
  {
    id: "w1",
    day: "Segunda",
    name: "Treino A - Inferiores",
    exercises: [
      { id: "e1", name: "Agachamento livre", sets: 4, reps: "10-12", load: "45kg", rest: "90s" },
      { id: "e2", name: "Leg press", sets: 3, reps: "12-15", load: "120kg", rest: "0s", supersetGroup: "ss1" },
      { id: "e3", name: "Cadeira extensora", sets: 3, reps: "15", load: "30kg", rest: "45s", supersetGroup: "ss1" },
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

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const defaultPlan = (clientId: string): Plan => {
  const start = new Date(2024, 10, 1);
  return {
    id: crypto.randomUUID(),
    clientId,
    title: "Plano de Condicionamento — Nov/2024",
    objective: "Melhorar condicionamento físico",
    deadline: addMonths(start, 3).toISOString(),
    trainingStrategy: "4 sessões semanais - hipertrofia",
    trainingApproach:
      "Progressão de carga semanal com foco em hipertrofia nas primeiras 8 semanas, seguida por um bloco de definição. " +
      "Reavaliação de cargas a cada 4 semanas.",
    nutritionStrategy: "Reeducação alimentar com déficit calórico moderado, priorizando proteína magra e hidratação.",
    trainerName: "Carlos Silva",
    nutritionistName: "Maria Santos",
    workouts: defaultWorkouts,
    executions: [],
    versions: [],
    progress: 45,
    status: "active",
    startDate: start.toISOString(),
    updatedAt: new Date(2024, 10, 28).toISOString(),
  };
};

export const getPlans = (clientId: string): Plan[] => {
  const raw = localStorage.getItem(STORAGE_PREFIX + clientId);
  if (!raw) {
    const seeded = [defaultPlan(clientId)];
    localStorage.setItem(STORAGE_PREFIX + clientId, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw) as Plan[];
  } catch {
    return [defaultPlan(clientId)];
  }
};

export const getActivePlan = (clientId: string): Plan | undefined =>
  getPlans(clientId).find((p) => p.status === "active");

const persist = (clientId: string, plans: Plan[]) => {
  localStorage.setItem(STORAGE_PREFIX + clientId, JSON.stringify(plans));
};

export type PlanEdits = Partial<
  Pick<
    Plan,
    | "objective"
    | "trainingStrategy"
    | "trainingApproach"
    | "nutritionStrategy"
    | "deadline"
    | "trainerName"
    | "nutritionistName"
    | "workouts"
    | "progress"
  >
>;

/** Salva alterações feitas pelo profissional no plano indicado, preservando a versão anterior. */
export const savePlanEdits = (clientId: string, planId: string, edits: PlanEdits): Plan[] => {
  const plans = getPlans(clientId);
  const updated = plans.map((plan) => {
    if (plan.id !== planId) return plan;
    const previousVersion: PlanVersion = {
      timestamp: plan.updatedAt,
      objective: plan.objective,
      trainingStrategy: plan.trainingStrategy,
      workouts: plan.workouts,
    };
    return {
      ...plan,
      ...edits,
      versions: [previousVersion, ...plan.versions].slice(0, 20),
      updatedAt: new Date().toISOString(),
    };
  });
  persist(clientId, updated);
  return updated;
};

/** Encerra o plano ativo e cria um novo plano ativo para o cliente. */
export const createPlan = (
  clientId: string,
  data: Pick<Plan, "title" | "objective" | "deadline" | "trainingStrategy" | "trainingApproach" | "nutritionStrategy" | "trainerName" | "nutritionistName">
): Plan[] => {
  const plans = getPlans(clientId);
  const now = new Date().toISOString();
  const closed = plans.map((p) => (p.status === "active" ? { ...p, status: "completed" as const, endDate: now } : p));
  const newPlan: Plan = {
    id: crypto.randomUUID(),
    clientId,
    ...data,
    workouts: [],
    executions: [],
    versions: [],
    progress: 0,
    status: "active",
    startDate: now,
    updatedAt: now,
  };
  const updated = [...closed, newPlan];
  persist(clientId, updated);
  return updated;
};

/** Registra a execução de um treino (dentro de um plano específico) pelo cliente. */
export const recordExecution = (
  clientId: string,
  planId: string,
  execution: Omit<WorkoutExecution, "id">
): Plan[] => {
  const plans = getPlans(clientId);
  const updated = plans.map((plan) =>
    plan.id === planId
      ? { ...plan, executions: [{ ...execution, id: crypto.randomUUID() }, ...plan.executions] }
      : plan
  );
  persist(clientId, updated);
  return updated;
};
