## Correções e melhorias

### 1. Contagem de atletas correta (bug)
Na home (`src/routes/app.index.tsx`) e na média da equipe, hoje conto a partir de `profiles` (que inclui psicólogo e treinador). Vou contar a partir de `user_roles` filtrando `role = 'atleta'`. Isso afeta:
- `src/routes/app.index.tsx` — card "Atletas" (psicólogo/treinador)
- Confirmar que `app.atletas.index.tsx` e `app.alertas.tsx` já filtram por role (sim, já filtram — sem alteração).

### 2. Tema apenas em Configurações
- Remover botão Sol/Lua do topo do `AppShell` (`src/components/AppShell.tsx`).
- Manter o toggle existente em `src/routes/app.configuracoes.tsx`.

### 3. Logo Universidade Feevale no topo
- Substituir o ícone `Activity` (atualmente no drawer) e adicionar a logo no header onde antes ficava o botão de tema.
- Como ainda não foi enviada a imagem, vou usar um placeholder textual "FEEVALE" estilizado em verde, dentro de um pill arredondado, deixando pronto um componente `<FeevaleLogo />` em `src/components/FeevaleLogo.tsx` que poderá receber depois um `<img src="/feevale.png" />` quando você enviar o arquivo.
- Instrução: assim que enviar a foto, ela é colocada em `public/feevale.png` e o componente passa a usar `<img>`.

### 4. Histórico mostrando semanas não respondidas (taxa de adesão)
No `src/routes/app.historico.tsx`:
- Determinar a "primeira semana" do atleta (semana do `created_at` do profile) até a semana ISO atual.
- Gerar a lista de todas as semanas no intervalo.
- Para cada semana: se houver resposta, mostra o card normal; se não houver, mostra um card cinza "Não respondido" com badge de adesão.
- Adicionar um resumo no topo: "Adesão: X de Y semanas (Z%)".
- O gráfico continua usando apenas semanas respondidas (gaps são pulados).

Comportamento de envio do questionário não muda — segue 1x por semana ISO, com bloqueio rígido.

### 5. Aba "Sobre o projeto"
- Nova rota `src/routes/app.sobre.tsx` com:
  - Objetivo do projeto: monitorar bem-estar e índice de estresse de atletas universitários da Feevale, oferecendo suporte preventivo via psicólogos e treinadores.
  - Como funciona: questionário semanal validado, acompanhamento longitudinal, alertas para a equipe técnica, sigilo de notas do psicólogo.
  - Responsáveis: campo de texto com os nomes — **preciso que você me informe os nomes dos responsáveis** (autor/orientador/equipe). Enquanto isso deixarei placeholders "[Nome do responsável]" para você editar depois ou me passar agora.
  - Versão e contato.
- Adicionar item no menu lateral (`AppShell` NAV) "Sobre" com ícone `Info`, visível para todos os papéis.

### Arquivos alterados/criados
- `src/components/AppShell.tsx` — remover toggle de tema, trocar ícone por logo Feevale, adicionar item "Sobre".
- `src/components/FeevaleLogo.tsx` (novo) — componente da logo (placeholder por enquanto).
- `src/routes/app.index.tsx` — corrigir contagem de atletas via `user_roles`.
- `src/routes/app.historico.tsx` — gerar série completa de semanas com lacunas e taxa de adesão.
- `src/routes/app.sobre.tsx` (novo) — página Sobre o Projeto.

### Pergunta antes de implementar
Quer me passar agora os nomes dos responsáveis (e eventualmente um pequeno texto institucional) para eu já incluir na página Sobre? Se preferir, sigo com placeholders e você edita depois — me diga "siga com placeholders" e eu prossigo.