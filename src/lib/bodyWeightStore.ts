// Store local (localStorage) de peso corporal do cliente: histórico de
// pesagens + meta opcional. Mesma lógica de simulação de backend que
// planStore/agendaStore.

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

interface BodyWeightData {
  entries: WeightEntry[];
  goal?: number;
}

const STORAGE_PREFIX = "fit_bodyweight_";

const emptyData = (): BodyWeightData => ({ entries: [] });

const load = (clientId: string): BodyWeightData => {
  const raw = localStorage.getItem(STORAGE_PREFIX + clientId);
  if (!raw) return emptyData();
  try {
    return JSON.parse(raw) as BodyWeightData;
  } catch {
    return emptyData();
  }
};

const persist = (clientId: string, data: BodyWeightData) => {
  localStorage.setItem(STORAGE_PREFIX + clientId, JSON.stringify(data));
};

export const getWeightEntries = (clientId: string): WeightEntry[] =>
  [...load(clientId).entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export const getWeightGoal = (clientId: string): number | undefined => load(clientId).goal;

export const addWeightEntry = (clientId: string, weight: number, date = new Date().toISOString()): WeightEntry[] => {
  const data = load(clientId);
  const updated = { ...data, entries: [...data.entries, { id: crypto.randomUUID(), date, weight }] };
  persist(clientId, updated);
  return getWeightEntries(clientId);
};

export const setWeightGoal = (clientId: string, goal: number) => {
  const data = load(clientId);
  persist(clientId, { ...data, goal });
};
