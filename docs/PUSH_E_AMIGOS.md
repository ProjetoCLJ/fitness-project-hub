# Notificações push e amigos — especificação (ainda não implementado)

Decisões fechadas com o usuário. Guia técnico do Web Push: `docs/PWA_E_PUSH.md`.

## Regras de envio
- **1 por dia por pessoa. Sem teto semanal.** Exceções (podem ser a 2ª do dia): pedido de amizade, resultado da liga, plano/treino alterado ou cancelado.
- Se duas notificações competem no mesmo dia, vale a de maior prioridade: resultado da liga > plano alterado/cancelado > amizade > semana pendente > treino do dia > meta perto > Foco quebrado > fechamento da liga > semana perfeita > sentimos sua falta.
- **Janela silenciosa 21h30–8h (Brasília).** Só o lembrete de treino pode sair antes das 8h, e apenas se o hábito de treino da pessoa for naquele horário (ex.: treina às 6h → aviso às 6h45). Nunca antes das 5h.
- Não envia se a pessoa já treinou hoje ou está com o app aberto. Tom sempre positivo (nada de "você vai perder").
- Cada tipo tem 6+ frases; a cada envio sorteia uma diferente da última usada.
- A pessoa liga/desliga por categoria em Perfil › Notificações: Foco, Liga, Social, Plano.

## Horários
- **Lembrete do treino do dia:** 45 min depois do horário esperado do treino, se ainda não treinou.
  - Com profissional e aula/atendimento agendado no dia: o horário da aula.
  - Sem profissional (ou sem aula no dia): média dos horários de treino daquele dia da semana (e da semana do ciclo do plano, quando houver histórico). Sem histórico: hábito de acesso ao app (hora mais frequente); sem nada: 18h.
- **Avisos fixos:** sábado 10h e domingo 15h (semana pendente); dia 1 às 9h (resultado da liga); segunda 9h (semana perfeita); 3 dias e 1 dia antes do fechamento do mês (fechamento da liga); Foco quebrado no dia seguinte às 9h; meta perto: dia anterior às 10h.
- **Sentimos sua falta:** a cada 5 dias sem treino registrado (dias 5, 10, 15, 20); depois, uma por mês até a pessoa voltar.
- **Plano alterado:** junta várias mudanças seguidas em um aviso só (30 min de espera).

## Permissão
1. Ao abrir o PWA e **logo depois de fazer login**: modal próprio "Ativar notificações?" (dá para mudar em Perfil › Notificações). Só se tocar em "Ativar" aparece o pedido do sistema.
2. Quem tocar em "Agora não" recebe **um único convite de reforço** depois do 1º treino concluído.

## Mensagens (título / mensagem)
**Treino do dia**
- Ainda não vimos você por aqui / Ainda dá tempo de fazer seu treino programado para hoje.
- Pulou o treino de hoje? / Lembre-se: movimentar o corpo é essencial!
- Seu treino está esperando / Que tal começar agora? Mantenha o ritmo.
- Seu treino de hoje ainda está de pé / Vinte e cinco minutos já contam. Bora?
- Que tal um treino agora? / Seu plano de hoje está esperando por você.
- Hoje ainda não acabou / Dá tempo de treinar e manter seu Foco aceso.
- Seu Foco agradece / Um treino hoje mantém o ritmo da semana.

**Semana pendente (sábado)**
- Você tem treinos pendentes esta semana / Conclua até domingo e mantenha seu Foco!
- Dá tempo de fechar a semana / Faltam {n} treinos. Um de cada vez e você chega lá.
- Sua semana ainda está aberta / Faltam {n} treinos para manter seu Foco de {X} dias.
- Reta final da semana / Que tal treinar hoje e deixar o domingo mais leve?
- Falta pouco para a semana perfeita / {n} treino(s) e você garante o bônus de XP.
- Hora de fechar a semana com chave de ouro / Treine hoje e mantenha seu Foco.

**Semana pendente (domingo, última chamada)**
- Último dia da semana / {n} treino(s) para manter seu Foco de {X} dias.
- Ainda dá tempo! / Conclua hoje e mantenha seu Foco.
- Domingo é dia de fechar a semana / Faltam {n} treino(s). Você consegue!
- Última chamada da semana / Um treino agora e o Foco segue aceso.
- Hoje é o último dia / {n} treino(s) pendente(s). Bora fechar?

**Meta perto (falta 1 dia)**
- Falta 1 dia / Amanhã você bate a meta de {N} dias de Foco.
- Quase lá! / Mais um dia e a meta de {N} dias é sua.
- Sua meta está logo ali / Falta 1 dia para {N} dias de Foco.

**Foco quebrado (dia seguinte)**
- Bora de novo! / Escolha sua próxima meta e comece hoje.
- Novo começo, nova meta / Escolha sua meta e acenda o Foco de novo.
- Seu Foco espera você / Escolha uma meta e dê o primeiro passo.

**Sentimos sua falta**
- Sentimos sua falta / Você está {x} dias sem registrar treinos. Proteja sua meta!
- Faz {x} dias que você não treina / O treino é essencial para sua saúde!
- Como está sendo sua semana? / Um treino curto ajuda no sono, no humor e na energia.
- Seu corpo sente falta de você / Que tal um treino leve para voltar ao ritmo?
- Voltar é mais fácil do que parece / Vinte e cinco minutos já valem XP e reacendem seu Foco.
- A gente está torcendo por você / Faz {x} dias sem treino. Hoje pode ser o recomeço.

**Fechamento da liga (3 dias e 1 dia antes)**
- Faltam 3 dias para fechar a liga / Hora de correr atrás do que falta!
- Reta final da liga / Cada treino conta até o fim do mês.
- A liga fecha em 3 dias / Bora somar mais XP e subir na tabela?
- Amanhã a liga fecha / Seu último empurrão do mês está esperando.
- Falta 1 dia para fechar a liga / Dá tempo de subir na tabela!

**Resultado da liga (dia 1)**
- O resultado da liga saiu! / Descubra a sua posição.
- Chegou a hora da revelação / Veja como foi seu mês na liga.
- Sua liga do mês fechou / Descubra se você subiu de liga!

**Semana perfeita (segunda)**
- Semana perfeita! / +10 XP na sua conta.
- Você fechou a semana! / Todos os treinos feitos. +10 XP.
- Semana completa! / Parabéns pela constância. +10 XP.

**Plano ou treino alterado / cancelado (para o aluno)**
- Seu profissional atualizou seus treinos / Veja o que mudou.
- Novo plano disponível / Seu profissional montou um novo plano.
- Treinos atualizados / Seu plano recebeu mudanças. Confira antes de treinar.
- Plano encerrado / Seu profissional encerrou seu plano atual.

**Amizade**
- {Nome} quer ser seu amigo / Toque para aceitar.
- {Nome} aceitou seu pedido / Agora vocês acompanham o Foco um do outro.

Fora do catálogo: "fulano passou você" e "amigo treinou hoje".

## Como enviar
Agendador (pg_cron + pg_net) a cada 10 min → função de servidor (Edge Function, Web Crypto, sem a lib `web-push`) → SQL "quem recebe o quê agora" (testável) → envio Web Push → registro do envio (limites, variação de frase, respostas 404/410 apagam inscrições mortas). Plano B: agendador externo gratuito chamando a função. **Pendente: o usuário rodar a consulta de `pg_cron`/`pg_net` no Lovable.**
Novos dados: `push_subscriptions`, `notification_prefs` (categorias), `push_log` (envios), horas de acesso ao app (hábito).

## Amigos (primeira versão)
- Amizade de mão dupla (pede/aceita), bloquear e remover. Convite por **link** (sem QR) e botão "Adicionar" ao lado de quem aparece no grupo da liga e nos desafios. Sem busca por nome.
- O amigo vê: nome, dias de Foco, XP do mês, liga atual, últimas medalhas, XP total, esportes e XP por esporte, e "Usando o MyJourn desde {mês/ano}" (a própria pessoa também vê o seu). Nunca: plano, peso, treinos, dados pessoais, "treinou hoje". Sem avatares por enquanto. A pessoa pode desligar a visibilidade em Perfil.
- Onde: aba **Amigos** no Perfil (lista, pedidos, link) e faixa "Ofensivas dos amigos" no Resumo (Foco de cada amigo, fechamento semanal). Tocar em um amigo abre o perfil dele (somente leitura).
- Fora desta versão: aba Amigos nas Ligas, grupos privados de amigos (possibilidade futura), ofensiva em dupla.
