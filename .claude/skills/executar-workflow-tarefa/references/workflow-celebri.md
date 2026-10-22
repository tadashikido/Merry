# Workflow "Fluxo Completo de Feature" — projeto Casamento

Retrato do workflow ativo em 2026-09-28. **O servidor é a fonte de verdade**: rode
`wf.py workflow` no pré-voo e, se algo aqui divergir, siga o servidor e avise o
usuário que esta referência ficou desatualizada.

## Grafo

```
step-analista (analista → requisitos)                       [documentacao]
  → step-arquiteto (arquiteto → arquitetura)                [documentacao]
  → check-tem-frontend  "spec:arquitetura declara frontend necessário"
       sim → step-ux (ux → ux)                              [documentacao]
              → check-tem-backend
       não → check-tem-backend
  check-tem-backend  "spec:arquitetura declara backend necessário"
       sim → paralelo-desenvolvimento
               ├ step-desenvolvedor-backend  (→ codigo)     [em_andamento]
               └ step-desenvolvedor-frontend (→ codigo)     [em_andamento]
             → paralelo-testes
       não → check-tem-frontend-dev "spec:arquitetura declara frontend necessário"
               sim → step-desenvolvedor-frontend → paralelo-testes
               não → paralelo-testes
  paralelo-testes
       └ step-implementador-testes (→ testes)               [em_revisao]
  → step-validador-testes (→ validacao-testes)              [em_revisao]
  → step-revisor (→ revisao)                                [em_revisao]
  → loop-correcao (maxIteracoes 2)
       stepsLoop: paralelo-correcao
         ├ step-correcao-backend  (desenvolvedor-backend)   [em_andamento]
         └ step-correcao-frontend (desenvolvedor-frontend)  [em_andamento]
       → step-revisor (de novo)
  → check-loop-esgotado "spec:revisao indica REPROVADO"
       sim → step-escalonamento (escalonador) — BLOQUEIA, sem concluir
       não → paralelo-qa-docs
               ├ step-auditor (→ seguranca)                 [em_revisao]
               └ step-documentador (→ documentacao)         [em_revisao]
  → check-auditoria "spec:seguranca indica BLOQUEADO"
       sim → step-escalonamento-seguranca (escalonador) — BLOQUEIA, sem concluir
       não → step-criar-pr (git, sem tipoSpec)              [em_revisao]
  → step-fim (tipo fim)                                     [concluido]
```

## Pontos que exigem julgamento

**Condicionais de escopo.** O inputTemplate do arquiteto manda declarar *no início
do documento* se a feature inclui backend, frontend e/ou banco. Os três
condicionais de escopo leem essa declaração — então, quando você for o arquiteto,
escreva-a sem ambiguidade (ex.: `ESCOPO: backend sim · frontend sim · banco sim`).
Quando for avaliar o condicional, procure essa linha primeiro.

**Paralelo de desenvolvimento roda os dois devs mesmo que um lado não exista.**
Se o ramo backend foi escolhido, `step-desenvolvedor-frontend` também roda; o
template dele exige a primeira linha `ESCOPO: FRONTEND necessário / FRONTEND não
necessário (puramente backend)`. No caso "não necessário", grave a spec só com o
escopo e a justificativa e conclua — não invente tela.

**Loop de correção.** Depois do `step-revisor`:
- veredicto `APROVADO` ou `APROVADO COM RESSALVAS` → pule o loop, vá direto ao
  `check-loop-esgotado` (que dará "não").
- `REPROVADO` e iterações feitas < 2 → rode `paralelo-correcao` (backend e
  frontend, cada um ignora o que não é da sua camada), depois `step-revisor` de
  novo. Conte as iterações pelas specs `revisao` já gravadas.
- `REPROVADO` após 2 iterações → `check-loop-esgotado` = sim → escalonamento.

**Steps de correção não têm `tiposSpecPermitidos`.** Use a chave do modeloSpec do
agente (`codigo`) — a correção grava uma nova spec `codigo` que substitui a
anterior como "mais recente" para o revisor.

**Escalonadores** (`step-escalonamento`, `step-escalonamento-seguranca`): rode
`iniciar`, depois `bloquear` com o motivo do template, e **pare**. Não grave spec,
não conclua. Relate ao usuário.

**Validador de testes** também pode bloquear: veredicto BLOQUEADO → `bloquear`
com motivo detalhado, sem `concluir`.

## Stack e restrições (da constituição — confirme no pré-voo)

- Backend: .NET 8 + ASP.NET Core + EF Core + PostgreSQL; JWT; SignalR.
- Frontend: Vue 3 + TypeScript + Pinia + PrimeVue; SFC `<script setup>`; stores `useXStore`.
- DTOs são `record` imutáveis; nomes de negócio em pt-BR; sufixos técnicos em inglês.
- Sem lógica em Controllers; sem entidades nas respostas; sem `any`; HTTP só em stores.
- **Sem commits sem testes passando** — o implementador de testes commita ao
  final; rode os testes antes de qualquer commit.
- OWASP Top 10 em toda decisão (o auditor cobre as 10 categorias, sempre).
