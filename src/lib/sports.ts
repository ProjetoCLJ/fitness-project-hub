// Biblioteca de esportes e exercícios (rascunho em docs/BIBLIOTECA_ESPORTES_E_EXERCICIOS.md).
// Cada plano tem um esporte; as listas abaixo são sugestões e a pessoa também pode digitar.

export type SportCode =
  | "musculacao"
  | "funcional_hiit"
  | "crossfit"
  | "calistenia"
  | "corrida"
  | "caminhada"
  | "ciclismo"
  | "natacao"
  | "yoga"
  | "pilates"
  | "lutas"
  | "coletivos"
  | "raquete"
  | "danca"
  | "alongamento"
  | "outro";

export interface Sport {
  code: SportCode;
  label: string;
}

export const SPORTS: Sport[] = [
  { code: "musculacao", label: "Musculação" },
  { code: "funcional_hiit", label: "Funcional / HIIT" },
  { code: "crossfit", label: "CrossFit" },
  { code: "calistenia", label: "Calistenia" },
  { code: "corrida", label: "Corrida" },
  { code: "caminhada", label: "Caminhada" },
  { code: "ciclismo", label: "Ciclismo" },
  { code: "natacao", label: "Natação" },
  { code: "yoga", label: "Yoga" },
  { code: "pilates", label: "Pilates" },
  { code: "lutas", label: "Lutas" },
  { code: "coletivos", label: "Esportes coletivos" },
  { code: "raquete", label: "Raquete" },
  { code: "danca", label: "Dança" },
  { code: "alongamento", label: "Alongamento e mobilidade" },
  { code: "outro", label: "Outro" },
];

export const sportLabel = (code: string | null | undefined) => SPORTS.find((s) => s.code === code)?.label ?? "Outro";

const split = (s: string) => s.split(" · ").map((x) => x.trim()).filter(Boolean);

const MUSCULACAO = [
  // Peito
  "Supino reto (barra) · Supino reto (halteres) · Supino inclinado (barra) · Supino inclinado (halteres) · Supino declinado · Supino na máquina · Crucifixo (halteres) · Crucifixo na máquina (peck deck) · Crossover (polia) · Flexão de braço",
  // Costas
  "Puxada frontal · Puxada com triângulo · Puxada supinada · Remada curvada (barra) · Remada baixa (polia) · Remada unilateral (haltere) · Remada cavalinho · Remada na máquina · Barra fixa · Pullover · Levantamento terra · Hiperextensão lombar",
  // Ombros
  "Desenvolvimento (halteres) · Desenvolvimento (barra) · Desenvolvimento Arnold · Desenvolvimento na máquina · Elevação lateral · Elevação frontal · Crucifixo inverso · Remada alta · Encolhimento (trapézio)",
  // Bíceps
  "Rosca direta (barra) · Rosca alternada (halteres) · Rosca martelo · Rosca scott · Rosca concentrada · Rosca na polia",
  // Tríceps
  "Tríceps testa · Tríceps corda (polia) · Tríceps pulley (barra) · Tríceps francês · Mergulho no banco · Mergulho em paralelas · Tríceps coice",
  // Pernas
  "Agachamento livre · Agachamento no smith · Agachamento frontal · Leg press 45° · Hack squat · Cadeira extensora · Mesa flexora · Cadeira flexora · Afundo / passada · Avanço búlgaro · Stiff · Levantamento terra romeno · Cadeira abdutora · Cadeira adutora · Panturrilha em pé · Panturrilha sentado",
  // Glúteos
  "Elevação pélvica (hip thrust) · Glúteo na polia · Abdução de quadril · Agachamento sumô · Ponte de glúteo",
  // Abdômen
  "Abdominal crunch · Elevação de pernas · Abdominal na polia · Abdominal bicicleta · Prancha · Prancha lateral · Roda abdominal · Russian twist",
  // Cardio de academia
  "Esteira · Bicicleta ergométrica · Elíptico · Remo ergométrico · Escada",
].flatMap(split);

export const EXERCISES_BY_SPORT: Record<SportCode, string[]> = {
  musculacao: MUSCULACAO,
  funcional_hiit: split(
    "Burpee · Polichinelo · Mountain climber · Agachamento com salto · Kettlebell swing · Thruster · Box jump · Corda naval (battle rope) · Corda de pular · Farmer's walk · Wall ball · Afundo com salto · Flexão · Prancha · Remo ergométrico · Circuito (por tempo)"
  ),
  crossfit: split(
    "WOD do dia · AMRAP · EMOM · For time · Snatch · Clean and jerk · Thruster · Overhead squat · Box jump · Wall ball · Double under · Toes to bar · Muscle-up · Handstand push-up · Kettlebell swing · Burpee · Remo ergométrico · Assault bike"
  ),
  calistenia: split("Barra fixa · Flexão (várias pegadas) · Paralelas · Agachamento (peso do corpo) · Pistol squat · Prancha · Elevação de pernas · L-sit · Muscle-up · Parada de mão"),
  corrida: split("Corrida contínua leve · Corrida longa · Tiros (intervalado) · Fartlek · Ritmo (tempo run) · Subidas (hill repeats) · Regenerativo · Corrida na esteira · Educativos de corrida"),
  caminhada: split("Caminhada leve · Caminhada rápida · Caminhada em subida · Trilha · Caminhada na esteira"),
  ciclismo: split("Pedal leve · Pedal longo · Intervalado · Subidas · Spinning · Mountain bike"),
  natacao: split("Crawl · Costas · Peito · Borboleta · Medley · Educativos / pernada · Nado com palmar · Nado contínuo"),
  yoga: split("Yoga flow · Saudação ao sol · Guerreiro I / II · Cachorro olhando para baixo · Postura da criança · Cobra · Árvore · Triângulo · Ponte · Respiração (pranayama) · Meditação · Yin yoga · Savasana"),
  pilates: split("The hundred · Roll-up · Single leg stretch · Double leg stretch · Criss-cross · Spine stretch · Swan · Saw · Side kick series · Bridge · Teaser · Prancha"),
  lutas: split("Treino na sombra · Saco de pancada · Manopla (mitts) · Sparring · Técnica / drills · Rolamento (jiu-jitsu) · Condicionamento"),
  coletivos: split("Futebol · Futsal · Futebol society · Basquete · Vôlei · Vôlei de praia · Handebol · Rugby · Treino técnico · Treino físico · Partida"),
  raquete: split("Tênis · Beach tennis · Padel · Squash · Badminton · Tênis de mesa · Treino técnico · Treino físico · Partida"),
  danca: split("Dança aeróbica · Zumba · Ballet · Dança de salão · Dança livre"),
  alongamento: split("Alongamento de posteriores · Alongamento de quadril · Alongamento de ombros · Mobilidade de coluna · Foam roller"),
  outro: [],
};

export const exerciseSuggestions = (sport: string | null | undefined): string[] =>
  EXERCISES_BY_SPORT[(sport ?? "outro") as SportCode] ?? [];
