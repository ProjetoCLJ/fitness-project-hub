// Biblioteca de exercícios própria (dados autorais, não copiados de
// nenhuma fonte de terceiros) — usada para busca/filtro na aba
// Biblioteca e para o profissional escolher exercícios ao montar treinos.

export type MuscleGroup =
  | "Peito"
  | "Costas"
  | "Pernas"
  | "Ombros"
  | "Braços"
  | "Core"
  | "Cardio";

export type Equipment =
  | "Barra"
  | "Halteres"
  | "Máquina"
  | "Peso corporal"
  | "Cabo"
  | "Kettlebell";

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  description: string;
}

export const MUSCLE_GROUPS: MuscleGroup[] = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio"];
export const EQUIPMENT_TYPES: Equipment[] = ["Barra", "Halteres", "Máquina", "Peso corporal", "Cabo", "Kettlebell"];

export const exerciseLibrary: LibraryExercise[] = [
  { id: "lib-1", name: "Agachamento livre", muscleGroup: "Pernas", equipment: "Barra", description: "Agachamento com barra nas costas, foco em quadríceps e glúteos." },
  { id: "lib-2", name: "Leg press", muscleGroup: "Pernas", equipment: "Máquina", description: "Empurrar a plataforma com as pernas, variação segura para volume de quadríceps." },
  { id: "lib-3", name: "Cadeira extensora", muscleGroup: "Pernas", equipment: "Máquina", description: "Isolamento de quadríceps em cadeira extensora." },
  { id: "lib-4", name: "Cadeira flexora", muscleGroup: "Pernas", equipment: "Máquina", description: "Isolamento de posterior de coxa." },
  { id: "lib-5", name: "Levantamento terra", muscleGroup: "Pernas", equipment: "Barra", description: "Puxada de barra do chão, recruta posterior de coxa, glúteos e lombar." },
  { id: "lib-6", name: "Afundo com halteres", muscleGroup: "Pernas", equipment: "Halteres", description: "Passada unilateral com halteres, trabalha quadríceps e glúteos." },
  { id: "lib-7", name: "Elevação pélvica", muscleGroup: "Pernas", equipment: "Barra", description: "Extensão de quadril com barra apoiada, foco em glúteos." },
  { id: "lib-8", name: "Panturrilha em pé", muscleGroup: "Pernas", equipment: "Máquina", description: "Flexão plantar em pé para panturrilha." },

  { id: "lib-9", name: "Supino reto", muscleGroup: "Peito", equipment: "Barra", description: "Empurrar barra deitado em banco reto, principal exercício de peito." },
  { id: "lib-10", name: "Supino inclinado com halteres", muscleGroup: "Peito", equipment: "Halteres", description: "Variação inclinada, ênfase em porção superior do peitoral." },
  { id: "lib-11", name: "Crucifixo", muscleGroup: "Peito", equipment: "Halteres", description: "Abertura de braços deitado, isolamento de peitoral." },
  { id: "lib-12", name: "Crossover", muscleGroup: "Peito", equipment: "Cabo", description: "Cruzamento de cabos em pé, isolamento de peitoral com tensão contínua." },
  { id: "lib-13", name: "Flexão de braço", muscleGroup: "Peito", equipment: "Peso corporal", description: "Flexão de braço no chão, exercício de peso corporal para peito e tríceps." },

  { id: "lib-14", name: "Puxada frontal", muscleGroup: "Costas", equipment: "Cabo", description: "Puxada de barra alta sentado, foco em latíssimo do dorso." },
  { id: "lib-15", name: "Remada curvada", muscleGroup: "Costas", equipment: "Barra", description: "Remada com barra inclinado à frente, trabalha dorsais e trapézio." },
  { id: "lib-16", name: "Remada baixa (cabo)", muscleGroup: "Costas", equipment: "Cabo", description: "Remada sentado em polia baixa, foco em espessura das costas." },
  { id: "lib-17", name: "Barra fixa", muscleGroup: "Costas", equipment: "Peso corporal", description: "Puxada do próprio corpo em barra fixa." },
  { id: "lib-18", name: "Pull-over com halter", muscleGroup: "Costas", equipment: "Halteres", description: "Extensão de braços sobre a cabeça deitado, trabalha dorsal e serrátil." },

  { id: "lib-19", name: "Desenvolvimento com halteres", muscleGroup: "Ombros", equipment: "Halteres", description: "Empurrar halteres acima da cabeça, foco em deltoide anterior." },
  { id: "lib-20", name: "Elevação lateral", muscleGroup: "Ombros", equipment: "Halteres", description: "Elevação de braços lateralmente, isolamento de deltoide medial." },
  { id: "lib-21", name: "Elevação frontal", muscleGroup: "Ombros", equipment: "Halteres", description: "Elevação de braços à frente, foco em deltoide anterior." },
  { id: "lib-22", name: "Face pull", muscleGroup: "Ombros", equipment: "Cabo", description: "Puxada de corda em direção ao rosto, foco em deltoide posterior e rotadores." },
  { id: "lib-23", name: "Encolhimento de trapézio", muscleGroup: "Ombros", equipment: "Halteres", description: "Elevação de ombros com halteres, isolamento de trapézio." },

  { id: "lib-24", name: "Rosca direta", muscleGroup: "Braços", equipment: "Barra", description: "Flexão de cotovelo com barra, isolamento de bíceps." },
  { id: "lib-25", name: "Rosca alternada", muscleGroup: "Braços", equipment: "Halteres", description: "Flexão de cotovelo alternada, isolamento de bíceps." },
  { id: "lib-26", name: "Tríceps corda", muscleGroup: "Braços", equipment: "Cabo", description: "Extensão de cotovelo em polia com corda, isolamento de tríceps." },
  { id: "lib-27", name: "Tríceps testa", muscleGroup: "Braços", equipment: "Barra", description: "Extensão de cotovelo deitado, isolamento de tríceps." },
  { id: "lib-28", name: "Mergulho no banco", muscleGroup: "Braços", equipment: "Peso corporal", description: "Extensão de tríceps apoiado em banco com peso corporal." },

  { id: "lib-29", name: "Prancha", muscleGroup: "Core", equipment: "Peso corporal", description: "Sustentação isométrica em prancha, foco em estabilidade do core." },
  { id: "lib-30", name: "Abdominal supra", muscleGroup: "Core", equipment: "Peso corporal", description: "Flexão de tronco deitado, isolamento de reto abdominal." },
  { id: "lib-31", name: "Elevação de pernas", muscleGroup: "Core", equipment: "Peso corporal", description: "Elevação de pernas suspenso ou deitado, foco em porção inferior do abdômen." },
  { id: "lib-32", name: "Russian twist", muscleGroup: "Core", equipment: "Kettlebell", description: "Rotação de tronco sentado, trabalha oblíquos." },

  { id: "lib-33", name: "Esteira - corrida leve", muscleGroup: "Cardio", equipment: "Máquina", description: "Corrida contínua em ritmo moderado." },
  { id: "lib-34", name: "Bike ergométrica", muscleGroup: "Cardio", equipment: "Máquina", description: "Pedalada estacionária, baixo impacto." },
  { id: "lib-35", name: "Pular corda", muscleGroup: "Cardio", equipment: "Peso corporal", description: "Saltos com corda, cardio de alta intensidade." },
  { id: "lib-36", name: "Kettlebell swing", muscleGroup: "Cardio", equipment: "Kettlebell", description: "Balanço de kettlebell com quadril, cardio + posterior de coxa." },
];
