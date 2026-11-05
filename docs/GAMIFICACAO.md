# Gamificação do MyJourn — especificação (XP, Foco, ligas, medalhas) e modo atleta

Registro único das regras fechadas. A implementação está em `drizzle/lovable-prompts/0009` a `0012` (banco) e em
`src/lib/gamification.ts`, `src/lib/medals.ts`, `src/components/gamification/*` (app). Toda a regra roda no servidor
(gatilhos e funções `SECURITY DEFINER`); o cliente só lê e chama RPCs.

## Ordem de aplicação no banco (Lovable)
1. `0009_athlete_mode.sql` — todo usuário também é aluno, planos próprios, esporte do plano, remoção/pausa na próxima segunda.
2. `0010_gamification_core.sql` — cronômetro, XP, Foco, metas, marcos, medalhas, treinos planejados.
3. `0011_leagues.sql` — ligas mensais, ranking por esporte, privacidade.
4. `0012_trainer_adherence.sql` — painel de adesão do profissional.
5. `0013_multiesportista.sql` — medalha de Multiesportista por quantidade de esportes.
6. `0014_esportes_crossfit_raquete.sql` — CrossFit; "coletivos e raquete" vira dois esportes.
7. `0015_treinos_acompanhados.sql` — treino acompanhado pelo professor e horário do treino.

## Treino válido
- Pertence a um plano, tem cronômetro (iniciar/concluir) e **mínimo de 25 minutos** (máx. 240; duração ajustável ao concluir).
- Data = dia (fuso de Brasília) em que o treino terminou, definida pelo servidor. Registro offline vale por até 24 h.
- Treino inválido fica no histórico, sem XP nem Foco.

## XP
- 20 por treino válido; no mesmo dia: 1º e 2º = 20, 3º = 15, 4º = 10, 5º = 5, depois 0.
- +10 ao cumprir todos os treinos planejados da semana (segunda a domingo).
- Total, por esporte e "XP da liga" (só treinos + bônus semanal; metas e marcos não entram na liga).

## Foco (dias corridos, incluindo descanso)
- Começa no primeiro treino válido. Semana de segunda a domingo; treino pendente pode ser recuperado até domingo.
- **Falta** = treino planejado que venceu no domingo sem ser feito. Qualquer falta encerra o Foco.
- Faltas acumuladas desde a última meta conquistada: 1ª falta → menu −1; depois −1 a cada 2 faltas. Cada semana 100% cumprida perdoa 1 falta
  (colchão: cada descida é paga uma vez).
- Relógio de calendário (sem plano/pausa): 7 dias sem treino desce 1 menu, depois 1 a cada 3 dias. Vale a maior descida (não soma).
  Mais de 7 dias parado (inclui pausa) zera o Foco. XP e medalhas sempre ficam.
- Metas: 6 menus (0 a 5), sempre 3 opções; começa no menu 0; meta conquistada sobe 1 menu.
  - 0: 3·5·7 dias (8·14·20 XP) · 1: 10·14·21 (25·35·50) · 2: 30·45·60 (55·75·100) · 3: 90·120·150 (150·190·240)
  - 4: 180·240·300 (300·390·480) · 5: 365·450·550 (600·720·880)
- Marcos automáticos (uma vez na vida, medalha + XP): 14=15, 30=30, 60=45, 90=55, 120=70, 180=100, 365=200, 730=500.
- Mudanças que reduzem compromisso (excluir plano/treino, pausar) só valem a partir da próxima segunda; adicionar vale na hora.

## Ligas (10): Estreante, Amador, Praticante, Competidor, Atleta, Veterano, Mestre, Campeão, Elite, Lenda
- Grupos de ~15 (10–20; 8–9 pessoas = grupo único; menos de 8 = grupo aberto, sem rebaixamento). Fechamento mensal (Brasília).
- Montagem: por fatias do XP de referência (60% mês anterior + 40% anterior a esse; novos usam só o mês). Todos são remontados todo mês.
- Sobem/descem por grupo de 15: L1 6/0 · L2 5/2 · L3-4 5/3 · L5-6 4/3 · L7 3/3 · L8-9 3/4 · L10 0/4 (top 3 da Lenda = pódio).
  Mínimo de 3 sobem em grupos ≥ 10 (abaixo: proporção, mín. 2). XP zero nunca sobe. Máx. 1 liga por mês.
- Desempate: mais treinos, quem chegou primeiro ao XP, mais dias de Foco.
- XP zero no mês: fora dos grupos e **desce 1 liga por mês** (exceto quem não teve treino planejado no mês).
- Fechamento "preguiçoso": qualquer chamada do app dispara `league_run()` (idempotente, com trava); não depende de cron.
- Ranking por esporte (mês/geral): só aparece quem ativou "Aparecer nos rankings por esporte" (desligado por padrão).

## Medalhas e conquistas
Permanentes; sem XP (exceto marcos do Foco). Séries (bronze/prata/ouro por posição): Foco, treinos, XP total, semanas perfeitas,
pódio em sequência, XP por esporte. Avulsas: pódio mensal, Campeão da Lenda, De volta ao Foco, metas ≥ 30 dias,
primeiro treino de cada esporte (16 esportes, o nome muda conforme o esporte), Multiesportista (uma medalha para cada quantidade de esportes diferentes no mês, a partir de 3: 3, 4, 5...). Pódio mostra o nome da liga e o mês.

## Modo atleta (profissional também é aluno)
- Todo `profiles` tem `student_profiles`; dados de gamificação usam o id de autenticação.
- O profissional treina com planos próprios, pode ser aluno de outro profissional (nunca de si mesmo), participa de eventos e desafios.
- Menu do profissional: seção "Profissional" (abas atuais) e "Meus treinos" (Início, Treinos, Ligas, Encontrar profissional, Perfil de atleta).
- Painel de adesão: `trainer_adherence()` — Foco e treinos da semana dos alunos (apenas planos criados pelo profissional).

## Pendências conhecidas
- Medidas de treino além de séries × reps × carga (tempo, distância, intervalos) para esportes como corrida e natação.
- Privacidade: planos próprios do aluno são privados; compartilhar com o profissional ainda não existe.
- "Treino livre" (registrar atividade sem plano) fica para depois da Etapa 1.
- Push no celular (guia em `docs/PWA_E_PUSH.md`).

## Treinos acompanhados pelo professor (migração 0015)
- No plano com profissional, cada treino do ciclo tem "acompanhado" (sim/não) e horário (opcional). Plano próprio do atleta nunca é acompanhado.
- Os treinos planejados da semana copiam esses campos; mudança no plano vale para os pendentes que o aluno não ajustou.
- O aluno ajusta um treino da semana ("só desta vez": acompanhado e/ou horário) tocando nele na página de Treinos.
- Ao concluir, o aluno confirma "Foi acompanhado pelo professor?"; o treino concluído guarda o valor. Vale XP/Foco normalmente.
- O painel de adesão do profissional separa treinos acompanhados e sozinhos. O horário alimenta o lembrete de treino do push.
