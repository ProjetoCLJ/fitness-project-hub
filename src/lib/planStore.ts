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

export const getPlans = (clientId: string): Plan[] => {
  const raw = localStorage.getItem(STORAGE_PREFIX + clientId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Plan[];
  } catch {
    return [];
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
