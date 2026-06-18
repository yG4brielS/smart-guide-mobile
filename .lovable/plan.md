## Objetivo
Limpar todas as respostas de questionário no banco e investigar o "loop infinito" da semana 19 no histórico do atleta.

## Passo 1 — Apagar respostas
Rodar uma migration que faz:

```sql
DELETE FROM public.questionnaire_responses;
```

Resultado: as 6 respostas existentes (semanas 19 e 21 de 2026, dos 3 atletas) são removidas. Cada atleta pode responder normalmente de novo.

> Observação: como é DELETE em dados (não em esquema), eu rodo via insert tool, não via migration de schema.

## Passo 2 — Corrigir a tela "Histórico do atleta"
Suspeita do bug: em `src/routes/app.historico.tsx`, a função `buildWeekRange` usa `mondayOfIsoWeek(year, week)` e depois soma 7 dias para avançar para a próxima semana ISO. Em algumas viradas de ano (semana 52/53 → semana 1), o cálculo pode devolver a mesma semana e prender o loop até bater no limite de 520 iterações, renderizando centenas de cartões "Não respondido" — o que parece "semana 19 infinita".

Plano:
1. Substituir o algoritmo por um avanço determinístico em dias UTC + reconvertendo via `isoYearWeek`, garantindo que cada iteração avance exatamente 7 dias e nunca devolva a mesma `(year, week)` duas vezes seguidas.
2. Adicionar uma trava extra: se a próxima `(year, week)` for igual à atual, sair do loop.
3. Limitar o range exibido a no máximo 26 semanas (~6 meses) para evitar listas gigantes quando a primeira resposta for muito antiga — semanas mais antigas continuam acessíveis (podemos paginar depois, se quiser).

## Passo 3 — Verificação
- Entrar como atleta e abrir `/app/histórico`: deve mostrar "Sem respostas ainda" (após o DELETE) sem travar.
- Responder o questionário da semana atual e conferir que aparece corretamente, sem semanas duplicadas.

## Detalhes técnicos
- Arquivo alterado: `src/routes/app.historico.tsx` (apenas `buildWeekRange` e a limitação de janela).
- Sem mudanças de schema, sem mudanças de RLS.
- Sem alterações em `src/routes/app.dashboard.tsx` ou `src/routes/app.atletas.$id.tsx`.