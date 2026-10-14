---
name: executar-workflow-tarefa
description: >-
  Executa o loop completo do workflow SDD "Fluxo Completo de Feature" do projeto
  Casamento (SpecFlow) para uma tarefa do board, de forma determinística: lê a
  constituição, busca o workflow ativo, e para cada step de agente roda
  iniciar → trabalho do agente → gravar spec via API → concluir com métricas,
  tratando condicionais de escopo (frontend/backend), paralelos, loop de
  correção do revisor, escalonamentos com bloqueio, git flow, pull request e
  step de fim. Use SEMPRE que o usuário pedir para "rodar o workflow da tarefa
  X", "executar a tarefa do board", "tocar a tarefa pelo orquestrador",
  "começar o fluxo de agentes", passar um tarefaId, ou pedir uma ação de
  MODIFICAÇÃO de código no projeto Casamento ("implemente", "crie a tela",
  "corrija o bug", "refatore", "adicione o endpoint") — pela regra tarefa-first
  isso precisa virar tarefa no board e passar pelos steps. Acione também quando
  o usuário disser "concluí o analista, segue pro próximo step", "retoma a
  tarefa", "a tarefa foi desbloqueada" ou quiser continuar um fluxo no meio.
  Garante que nenhuma spec vire arquivo no repositório, que métricas sejam
  reportadas e que a working tree fique limpa no fim.
---

# Executar workflow SDD de uma tarefa — projeto Casamento

Cada tarefa do board do Casamento percorre o workflow "Fluxo Completo de
Feature"; cada step de agente produz uma spec. O `CLAUDE.md` descreve isso em
prosa — esta skill transforma em runbook para que nada seja pulado: sinalizar
início, gravar a spec **via API** (nunca como arquivo), reportar métricas e deixar
a working tree limpa.

Hierarquia de verdade, do mais forte para o mais fraco: **`inputTemplate` do step
> `contextoInjetado` da resposta de `iniciar` > `promptSistema` do agente >
`CLAUDE.md` > esta skill**. Os três primeiros vêm do servidor em runtime; esta
skill é só a sequência operacional. Quando divergirem, siga o mais forte.

O grafo concreto deste projeto (quais condicionais, como funciona o loop de
correção, quando escalonar) está em
[references/workflow-casamento.md](references/workflow-casamento.md). **Leia-o no
pré-voo** — é onde estão as decisões que não dá para inferir só do JSON.

## Ferramenta

```
python .claude/skills/executar-workflow-tarefa/scripts/wf.py <comando> [args]
```

Rode a partir da raiz do projeto. Sem dependências além do Python 3 padrão.

| Comando | Args | Para quê |
|---|---|---|
| `constituicao` | — | pré-voo obrigatório |
| `workflow` | — | workflow ativo, steps resumidos (sem templates) |
| `step` | `<stepId>` | step completo, com `inputTemplate` |
| `agente` | `<nome>` | `promptSistema` + `modeloSpec` do agente |
| `kanban` | — | tarefas por coluna |
| `tarefa` | `<id>` | detalhes e coluna atual |
| `specs` | `<id>` | specs já gravadas (retomada, condicionais) |
| `render` | `<id> <stepId>` | `inputTemplate` com `{titulo}`, `{descricao}`, `{spec:X}` resolvidos |
| `iniciar` | `<id> <nomeAgente> <stepId>` | abre a execução e marca o relógio |
| `spec` | `<id> <tipoSpec> <criadoPorAgente> <arquivo>` | grava a spec |
| `concluir` | `<id> <execucaoId> <tokIn> <tokOut> <duracaoMs\|auto> [tipoSpec]` | fecha com métricas |
| `mover` | `<id> <coluna>` | step de fim |
| `bloquear` | `<id> <motivo>` | travou, não inventa |
| `tarefa-nova` | `<arquivoJson>` | regra tarefa-first |
| `branch` | `<id> <nomeBranch> <branchBase>` | git flow, 1º agente |
| `pr` | `<id> <url> <numero> <status>` | `step-criar-pr` |

`spec` e `tarefa-nova` recebem **caminho de arquivo** (conteúdo grande demais para
argv). Escreva esses arquivos no **scratchpad da sessão**, nunca dentro do repo, e
apague depois.

**Config via env, sem fallback:** `SPECFLOW_API`, `SPECFLOW_KEY`,
`SPECFLOW_PROJETO`. Neste projeto já estão em `.claude/settings.local.json`
(injetadas automaticamente). Se o script reclamar que faltam, os valores estão no
`CLAUDE.md` — exporte-os no comando, não os copie para arquivos rastreados.

O script sai com código ≠ 0 em HTTP ≥ 400 e imprime o corpo do erro. Falha em
`iniciar`/`concluir` é bloqueante: sem `execucaoId` válido a execução fica órfã
no servidor. Não siga para o próximo step torcendo. Um 404/405 indica que o
`CLAUDE.md` pode estar desatualizado — pare e peça ao usuário para regerar a
chave (instruções no `CLAUDE.md`), sem adivinhar endpoints.

## Pré-voo (uma vez por sessão)

1. **Constituição.** `wf.py constituicao`. Leia princípios, decisões técnicas,
   convenções e restrições. Confirme internamente "Constituição lida: sim".
2. **Workflow.** `wf.py workflow` (já filtra o `ativo: true`). Compare com
   `references/workflow-casamento.md`; se o servidor mudou, siga o servidor e
   avise o usuário.
3. **Tarefa.** `wf.py tarefa <id>` e `wf.py specs <id>` → em que ponto ela está e
   o que já foi produzido. Assim você retoma no meio sem refazer trabalho nem
   duplicar spec: o próximo step é o primeiro cujo `tipoSpec` ainda não tem spec
   (respeitando os condicionais).
4. **Estado do repositório.** O projeto começou sem git. Anote se há `.git` —
   isso importa para o git flow (abaixo).

## Tipos de step

Só rode o ciclo de agente em `tipo: agente`; os outros são roteamento e não têm
`execucaoId`, spec nem métricas:

- **`agente`** — ciclo completo (iniciar → trabalho → spec → concluir).
- **`condicional`** — a `condicao` é prosa (ex.: *"spec:arquitetura declara
  frontend necessário"*). Leia a spec citada via `wf.py specs` e decida com
  honestidade; errar o ramo pula um agente inteiro ou roda um desnecessário.
  Diga ao usuário qual ramo escolheu e por quê (uma linha).
- **`paralelo`** — rode cada step de `stepsParalelos`, um ciclo completo por vez,
  na ordem listada. "Paralelo" descreve independência, não simultaneidade.
- **`loop`** — repita `stepsLoop` respeitando `maxIteracoes`. Detalhes do loop
  de correção do revisor em `references/workflow-casamento.md`.
- **`fim`** — sem agente, só move a tarefa (ver abaixo).

## Regra tarefa-first (entrada ad-hoc)

Pedido de **modificação** sem tarefa apontada → crie a tarefa antes:

```
wf.py tarefa-nova <arquivo.json>
```

JSON com `titulo`, `descricao`, `prioridade` (`Baixa`/`Media`/`Alta`);
`projetoId` e `colunaKanban: a_fazer` o script preenche. `descricao` é **HTML
rico** em pt-BR (`<h2>Contexto</h2>`, `<h2>Critérios de aceite</h2>`, `<ul>`,
`<strong>`, `<code>`) — nunca texto puro nem Markdown, porque o campo é
renderizado num editor WYSIWYG e Markdown aparece cru. Labels válidas:
`feature`, `infra`, `bug`, `design`, `chore`, `refactor`, `docs`, `test`.

Comandos exploratórios ("liste", "explique", "qual") **não** geram tarefa. A
regra existe por rastreabilidade: toda execução de agente precisa estar
vinculada a uma tarefa.

## Loop por step de agente

### 1. Preparar e iniciar

1. `wf.py agente <nome>` — o `promptSistema` define o papel (analista, arquiteto,
   revisor...). Assuma esse papel para o step. Não precisa reler se já leu esse
   agente nesta sessão.
2. `wf.py iniciar <tarefaId> <agente> <stepId>`. Guarde da resposta:
   - `execucaoId` — exigido no concluir.
   - `contextoInjetado` — stack, constituição e o **"## Contrato de Output"**
     do agente. Siga o contrato à risca; tem precedência sobre o `promptSistema`.
     Pode vir `null`.
   - `git` — se não nulo, git flow ativo.
3. `wf.py render <tarefaId> <stepId>` — o `inputTemplate` já com as specs
   anteriores inseridas. É o enunciado do step.

### 2. Git flow (só se `git` ≠ nulo)

| Condição | Ação |
|---|---|
| `git.nomeBranchAtual` nulo (1º agente) | `git checkout -b <git.nomeBranchSugerida>` → `git push -u origin <…>` → `wf.py branch <id> <nomeBranchSugerida> <git.branchBase>` |
| `git.nomeBranchAtual` preenchido | `git checkout <git.nomeBranchAtual>` |
| `step-criar-pr` | commits no branch → rode `git.comandoCriarPullRequest` → extraia URL e número → `wf.py pr <id> <url> <numero> aberto` → conclua **sem** tipoSpec |

Se `git` ≠ nulo mas o diretório não é repositório git (ou não há remote), isso é
"ambiente indisponível": `wf.py bloquear` explicando o que falta. Não rode
`git init` nem crie remote por conta própria — é decisão do usuário.

Se `git` for nulo no `step-criar-pr`, grave "sem fluxo git configurado" como spec
e conclua sem tipoSpec. Nos demais steps, `git` nulo = nenhuma ação git.

Registrar branch e PR via API liga a entrega física à tarefa do board; sem isso o
board mostra "concluído" sem rastro do código.

### 3. Executar o trabalho do agente

Produza a spec do step conforme o template renderizado e o contrato de output.
Os templates deste projeto exigem **seções nomeadas e mínimos de caracteres**
(ex.: analista — Contexto ≥ 120, Critérios de Aceite em BDD com ≥ 3 cenários
≥ 200, Regras de Negócio com ID `RN-001` ≥ 200). Há validação de score no
servidor; spec magra é reprovada. Leia o template antes de escrever.

Específicos deste workflow:
- **Arquiteto:** declare o escopo (backend/frontend/banco) na primeira linha —
  os condicionais dependem disso.
- **Devs (backend/frontend):** primeira linha `ESCOPO: ...` exigida pelo
  template. Código real vai para o repositório seguindo a stack da constituição;
  a spec `codigo` descreve o que foi feito e onde.
- **Implementador de testes:** testes como arquivos reais; rode-os e só commite
  com eles passando (restrição da constituição).
- **Validador de testes:** execute a suíte de verdade e reporte o resultado real.
  BLOQUEADO → `bloquear`, sem concluir.
- **Revisor / auditor:** veredicto explícito no formato do template — os
  condicionais seguintes leem essas palavras (`REPROVADO`, `BLOQUEADO`).

Conteúdo em **pt-BR com acentuação correta**. `tipoSpec` vem de
`tiposSpecPermitidos`; se o step não tiver (steps de correção), use a chave do
`modeloSpec` do agente.

**Se travar, bloqueie — não invente.** Requisito ambíguo, restrição não declarada
ou contradição crítica → `wf.py bloquear <id> "<dúvida estruturada>"`. **Não**
chame `concluir`: a execução fica em aberto de propósito, sinalizando interrupção.
Encerre e diga ao usuário o que bloqueou.

### 4. Gravar a spec — via API, nunca como arquivo

Spec **jamais** vira arquivo no repositório; o board é o único lugar onde ela
vive. Escreva no scratchpad e envie:

```
wf.py spec <tarefaId> <tipoSpec> <agente> <caminhoNoScratchpad>
```

### 5. Concluir com métricas

```
wf.py concluir <tarefaId> <execucaoId> <tokensEntrada> <tokensSaida> auto [tipoSpec]
```

`auto` calcula `duracaoMs` real a partir do instante registrado no `iniciar`.

Tokens: você não enxerga seu contador exato. Se o step rodou num subagente, use
`total_tokens` da notificação dele (é o número mais próximo do real). Caso
contrário, estime de forma honesta — saída ≈ caracteres produzidos ÷ 4 (spec +
código escrito); entrada ≈ caracteres lidos no step (template renderizado,
contexto injetado, arquivos abertos) ÷ 4 — e **diga ao usuário que é
estimativa**. Número inventado corrompe o histórico de custo do projeto.

Steps operacionais (`step-criar-pr`) concluem sem `tipoSpec`. Escalonadores não
concluem.

### 6. Limpeza antes de seguir

Liste arquivos novos (`git status` se houver repo; senão, compare com o que
existia). Entrega legítima (código, teste, config persistente, migration) fica;
rascunho, output, script de exploração sai. Lixo acumulado vira "contexto" falso
para o próximo agente. Specs foram via API — não devem existir como arquivo.

## Step de fim

`tipo: fim` não tem agente:

```
wf.py mover <tarefaId> concluido
```

Gate final: working tree com **apenas** arquivos da entrega. Sobrou lixo, apague
antes de declarar a tarefa concluída.

## Ao terminar, relate e verifique

Resuma ao usuário: steps executados, ramos escolhidos nos condicionais, specs
gravadas, métricas (marcando estimativas), branch/PR, e bloqueios se houver.

- [ ] Constituição lida no início da sessão.
- [ ] Workflow ativo conferido contra a referência.
- [ ] Cada step de agente: iniciar → trabalho → spec via API → concluir.
- [ ] Condicionais decididos lendo a spec citada; ramo informado ao usuário.
- [ ] Templates e contrato de output respeitados (seções e mínimos).
- [ ] Nenhuma spec gravada como arquivo no repositório.
- [ ] Git flow: branch registrada no 1º agente; PR registrado em `step-criar-pr`.
- [ ] Bloqueio usado em vez de inventar, sem `concluir`.
- [ ] Working tree limpa no step de fim.
