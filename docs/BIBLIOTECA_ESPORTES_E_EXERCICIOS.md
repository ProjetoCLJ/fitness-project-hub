# Biblioteca de esportes e exercícios (rascunho v1)

Rascunho para revisão — **ainda não implementado**. Regras:
- Cada **plano** tem **um esporte** desta lista.
- Cada esporte tem sua lista de exercícios/atividades; a pessoa também pode **digitar** um exercício que não está na lista.
- O esporte define o **tipo de medida padrão** (como o treino é registrado).

## Tipos de medida
| Código | Como registra |
|---|---|
| `series` | séries × repetições × carga (kg) |
| `tempo` | duração (min) |
| `distancia` | distância (km) + tempo (min) |
| `intervalos` | blocos de esforço/descanso (tempo ou distância) |

## Esportes (v1)
| Esporte | Medida padrão |
|---|---|
| Musculação | `series` (completa desde o início) |
| Funcional / HIIT | `series` ou `tempo` (por exercício) |
| Calistenia | `series` |
| Corrida | `distancia` / `intervalos` |
| Caminhada | `distancia` / `tempo` |
| Ciclismo | `distancia` / `tempo` |
| Natação | `distancia` / `intervalos` |
| Yoga | `tempo` |
| Pilates | `series` (repetições) ou `tempo` |
| Lutas (boxe, muay thai, jiu-jitsu...) | `tempo` / `intervalos` |
| Esportes coletivos e de raquete | `tempo` |
| Dança | `tempo` |
| Alongamento e mobilidade | `tempo` |
| Outro | `tempo` |

## Musculação (`series`)
**Peito:** Supino reto (barra) · Supino reto (halteres) · Supino inclinado (barra) · Supino inclinado (halteres) · Supino declinado · Supino na máquina · Crucifixo (halteres) · Crucifixo na máquina (peck deck) · Crossover (polia) · Flexão de braço
**Costas:** Puxada frontal · Puxada com triângulo · Puxada supinada · Remada curvada (barra) · Remada baixa (polia) · Remada unilateral (haltere) · Remada cavalinho · Remada na máquina · Barra fixa · Pullover · Levantamento terra · Hiperextensão lombar
**Ombros:** Desenvolvimento (halteres) · Desenvolvimento (barra) · Desenvolvimento Arnold · Desenvolvimento na máquina · Elevação lateral · Elevação frontal · Crucifixo inverso · Remada alta · Encolhimento (trapézio)
**Bíceps:** Rosca direta (barra) · Rosca alternada (halteres) · Rosca martelo · Rosca scott · Rosca concentrada · Rosca na polia
**Tríceps:** Tríceps testa · Tríceps corda (polia) · Tríceps pulley (barra) · Tríceps francês · Mergulho no banco · Mergulho em paralelas · Tríceps coice
**Pernas:** Agachamento livre · Agachamento no smith · Agachamento frontal · Leg press 45° · Hack squat · Cadeira extensora · Mesa flexora · Cadeira flexora · Afundo / passada · Avanço búlgaro · Stiff · Levantamento terra romeno · Cadeira abdutora · Cadeira adutora · Panturrilha em pé · Panturrilha sentado
**Glúteos:** Elevação pélvica (hip thrust) · Glúteo na polia · Abdução de quadril · Agachamento sumô · Ponte de glúteo
**Abdômen:** Abdominal crunch · Elevação de pernas · Abdominal na polia · Abdominal bicicleta · Prancha · Prancha lateral · Roda abdominal · Russian twist
**Cardio de academia (`tempo`/`distancia`):** Esteira · Bicicleta ergométrica · Elíptico · Remo ergométrico · Escada

## Funcional / HIIT
Burpee · Polichinelo · Mountain climber · Agachamento com salto · Kettlebell swing · Thruster · Box jump · Corda naval (battle rope) · Corda de pular · Farmer's walk · Wall ball · Afundo com salto · Flexão · Prancha · Remo ergométrico · Circuito (por tempo)

## Calistenia
Barra fixa · Flexão (várias pegadas) · Paralelas · Agachamento (peso do corpo) · Pistol squat · Prancha · Elevação de pernas · L-sit · Muscle-up · Parada de mão

## Corrida
Corrida contínua leve · Corrida longa · Tiros (intervalado) · Fartlek · Ritmo (tempo run) · Subidas (hill repeats) · Regenerativo · Corrida na esteira · Educativos de corrida

## Caminhada
Caminhada leve · Caminhada rápida · Caminhada em subida · Trilha · Caminhada na esteira

## Ciclismo
Pedal leve · Pedal longo · Intervalado · Subidas · Spinning · Mountain bike

## Natação
Crawl · Costas · Peito · Borboleta · Medley · Educativos / pernada · Nado com palmar · Nado contínuo

## Yoga
Yoga flow · Saudação ao sol · Guerreiro I / II · Cachorro olhando para baixo · Postura da criança · Cobra · Árvore · Triângulo · Ponte · Respiração (pranayama) · Meditação · Yin yoga · Savasana

## Pilates
The hundred · Roll-up · Single leg stretch · Double leg stretch · Criss-cross · Spine stretch · Swan · Saw · Side kick series · Bridge · Teaser · Prancha

## Lutas
Treino na sombra · Saco de pancada · Manopla (mitts) · Sparring · Técnica / drills · Rolamento (jiu-jitsu) · Condicionamento

## Esportes coletivos e de raquete
Futebol · Futsal · Basquete · Vôlei · Vôlei de praia · Handebol · Tênis · Beach tennis · Padel · Treino técnico · Treino físico · Partida

## Dança
Dança aeróbica · Zumba · Ballet · Dança de salão · Dança livre

## Alongamento e mobilidade
Alongamento de posteriores · Alongamento de quadril · Alongamento de ombros · Mobilidade de coluna · Foam roller

## Observações
- As listas são ponto de partida; entram novos itens com o tempo.
- Todo esporte aceita **exercício digitado** pela pessoa.
- Os esportes podem ser vinculados depois às especialidades dos profissionais (mesma lista no filtro da busca).
