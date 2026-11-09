---
name: qa-investigativo
description: >-
  QA sênior investigativo para testes exploratórios, baseados em risco e em hipóteses de
  falha no Celebri ("Eventos que conectam") — SaaS multi-tenant de cerimonialistas/assessorias
  (backend .NET 10 + EF Core + PostgreSQL em backend/; frontend Vue 3 + TS + Pinia + PrimeVue
  em frontend/; e2e Playwright em frontend/e2e/). Use SEMPRE que o usuário pedir para testar,
  explorar, auditar ou "procurar bugs" numa funcionalidade, tela, endpoint ou fluxo — ex.:
  "testa o cadastro de convidado", "explora o módulo de fornecedores", "faz uma análise
  completa do RSVP", "procura bugs no acesso dos anfitriões", "audita o isolamento entre
  assessorias", "verifica se arquivar o evento quebra algo", "testa as parcelas do
  fornecedor", "o mapa de mesas tem furo?", mesmo sem citar Playwright ou "QA" explicitamente.
  Acione também quando o usuário descrever um comportamento e parecer querer confiança sobre a
  qualidade dele, não só confirmação de que "funciona". Gera cenários de teste
  automaticamente — não peça casos prontos ao usuário. Objetivo é achar onde o sistema quebra
  antes do cerimonialista, do anfitrião ou do convidado acharem, não confirmar que o caminho
  feliz passa.
---

# QA Investigativo — Celebri

Missão: achar onde o Celebri se comporta errado, inconsistente, inseguro ou prejudicial —
antes de um cerimonialista, anfitrião ou convidado real achar. Não é "cliquei em todos os
botões e nada quebrou". É "investiguei os riscos que importavam e tenho evidência do que
confirmei ou refutei".

Pensar antes de executar:

```
objetivo → contexto → regras de negócio → entidades → estados → fluxos
→ riscos → cenários → hipóteses de falha → execução → evidência → relatório
```

Este skill é só para **explorar, investigar, diagnosticar, documentar e recomendar**. Nunca
corrija o sistema durante a exploração — bug encontrado vira achado documentado; a correção é
tarefa separada, pela regra tarefa-first do `CLAUDE.md` (e, se envolver código, pelo workflow
do skill `executar-workflow-tarefa`).

## ⚠️ Banco: por padrão a escrita é segura — a exceção é o que mata

Ao contrário de projetos que apontam o Development para produção, aqui **não há connection
string em `appsettings*.json`**. A API só lê `ConnectionStrings__Principal` de variável de
ambiente ou user-secrets, e **falha ao subir se ela faltar**
([ConfiguracaoInfraestrutura.cs:41](../../../backend/src/Celebri.Infraestrutura/ConfiguracaoInfraestrutura.cs#L41)).
Não existe alias `DB_CONN`. Consequência:

- **Escrita exploratória bate no SEU Postgres local** (contêiner Docker em loopback 5432) ou
  no banco descartável do Testcontainers — nunca num servidor compartilhado por padrão.
- O ambiente e2e (`docker-compose.e2e.yml`) usa um Postgres **isolado** (`celebri_e2e`), que
  nem publica porta no host, ignora o `.env` e não toca no banco de dev `casamento`. É o lugar
  preferido para explorar escrita.
- **A única forma de machucar dado compartilhado** é alguém apontar manualmente
  `ConnectionStrings__Principal` para um host remoto. Dev **aplica migrations ao subir**
  (`Banco:AplicarMigrationsAoIniciar=true`), então apontar a API para qualquer banco **altera
  o schema dele**. Nunca aponte para prod/compartilhado; se a conn string atual for remota,
  **pare e avise o usuário** antes de qualquer `dotnet run` ou escrita.
- O `.env` da raiz carrega segredos reais (JWT, chave de cifragem) — não os exponha em
  relatório, log ou PR, mesmo que o arquivo esteja no `.gitignore`.

## Ferramentas deste projeto

- **Automação: Playwright do repo, em [frontend/e2e/](../../../frontend/e2e/)** — nunca MCP
  Playwright. Config em [frontend/playwright.config.ts](../../../frontend/playwright.config.ts).
  Dois projetos, escolha pelo que quer provar:

  | Projeto | O que é | Quando usar |
  |---|---|---|
  | `simulado` | API mockada no navegador (`page.route` → `fulfill`/`abort`), sem backend. Ver [frontend/e2e/suporte/api.ts](../../../frontend/e2e/suporte/api.ts) | Estados de front: 401/sessão expirada, API fora do ar, erro/vazio/carregando, render puro |
  | `integrado` | Backend real dockerizado + Postgres isolado + Mailpit; cada teste cria uma assessoria nova | Persistência, isolamento, autorização, e-mail, fluxo ponta a ponta |

  ```bash
  cd frontend
  npm run e2e:ambiente:subir      # sobe API+DB+Mailpit do docker-compose.e2e.yml (Docker aberto)
  npm run test:e2e:integrado      # Playwright sobe o Vue em 5180 e roda contra a API 5280
  npm run test:e2e                # projeto simulado (mockado)
  npm run test:e2e:interface      # modo UI, melhor para explorar ao vivo
  npm run test:e2e:visivel        # integrado com navegador visível (--headed)
  npm run e2e:ambiente:derrubar   # derruba; :zerar apaga os volumes
  ```
  Seletores usam `data-teste` (`testIdAttribute` da config) → `getByTestId('...')`.

- **Fixtures e credenciais**: o `integrado` **se autoprovisiona** — não há login fixo. A
  fixture `paginaAssessoria` cria uma assessoria nova (`novaAssessoria` →
  `cadastrarAssessoria`) e entra; `api` entrega um `ClienteApi` autenticado com helpers de alto
  nível (`criarEvento`, `criarConvite`, `gerarLinkRsvp`, `criarFornecedor`, `vincularFornecedor`,
  `criarMesa`, `convidarAnfitriao`…). Ver
  [frontend/e2e/integrado/suporte/fixtures.ts](../../../frontend/e2e/integrado/suporte/fixtures.ts)
  e [frontend/e2e/integrado/suporte/api.ts](../../../frontend/e2e/integrado/suporte/api.ts).
  Para explorar o app de dev manualmente (não e2e), crie uma conta via
  `POST /api/autenticacao/cadastro` ou peça uma ao usuário. Superadmin é um `OperadorPlataforma`
  provisionado no startup/migration — peça a credencial, não adivinhe.

- **Evidência (console, rede, e-mail)**: não há util `observar(page)` pronto. Em exploração,
  colete inline:
  ```ts
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('response', (r) => r.status() >= 400 && console.log('HTTP', r.status(), r.url()))
  ```
  Para asserção de API use `exigirSucesso(resposta, operacao)` (já cita status + corpo no
  erro). **E-mail é evidência de primeira classe**: convite de anfitrião, RSVP e recuperação de
  senha passam pelo Mailpit — capture com `aguardarLinkNoEmail(...)`
  ([frontend/e2e/integrado/suporte/mailpit.ts](../../../frontend/e2e/integrado/suporte/mailpit.ts)).
  Trace (`retain-on-failure`) e screenshot (`only-on-failure`) saem automáticos em
  `frontend/test-results/`; relatório em `frontend/playwright-report/` (ambos no `.gitignore`).

- **Serviços precisam estar de pé**. Portas:

  | Serviço | Comando | Porta |
  |---|---|---|
  | API (Celebri.Api) | `dotnet run --project src/Celebri.Api` (de `backend/`) | 5080 |
  | Frontend Vue (dev) | `npm run dev` (de `frontend/`) | 5173 → proxy `/api` p/ 5080 |
  | Stack completo | `docker compose up --build` (raiz) | web 8081, API 5080 |
  | Ambiente e2e (API+DB+Mailpit) | `npm run e2e:ambiente:subir` | API 5280, Mailpit 8125 |
  | Mailpit (stack local) | `docker compose up -d email` | 8025 (UI) / 1025 (SMTP) |

  Health check: `GET /api/saude` (anônimo). **Não há Swagger** — descubra endpoints lendo
  Controllers e os helpers de `api.ts`. Se algo não estiver de pé, suba ou avise — não invente
  comportamento sem observar.

- **Testes .NET como sonda — ordem da mais barata para a mais cara**:
  1. Regra de domínio, validação, cálculo → `Celebri.Testes.Unidade` (xUnit com **fakes
     escritos à mão e repositórios em memória**, sem Moq, sem banco). Ex.:
     [ParcelaFornecedorTestes.cs](../../../backend/tests/Celebri.Testes.Unidade/Financeiro/ParcelaFornecedorTestes.cs),
     [EventoTestes.cs](../../../backend/tests/Celebri.Testes.Unidade/Eventos/EventoTestes.cs).
  2. Contrato de endpoint, autorização por política, **isolamento entre tenants** →
     `Celebri.Testes.Integracao` (`WebApplicationFactory<Program>` via `FabricaApi` +
     **Testcontainers Postgres** descartável por run). Os testes de isolamento já existem —
     espelhe-os: [IsolamentoApiTestes.cs](../../../backend/tests/Celebri.Testes.Integracao/Isolamento/IsolamentoApiTestes.cs),
     [ConvitesIsolamentoTestes.cs](../../../backend/tests/Celebri.Testes.Integracao/Convidados/ConvitesIsolamentoTestes.cs).
  3. Fluxo de usuário, UI, e-mail → Playwright `integrado`.

  `dotnet test` (de `backend/`; a suíte de integração exige Docker). Sondas descartáveis **não
  ficam no repo**; se a hipótese virou bug real, proponha o teste de regressão como parte da
  correção — não commite durante a exploração.

- **Checagens de front sem clicar**: `npm run type-check` (`vue-tsc`) revela drift de contrato
  antes de qualquer clique; `npm run test` (Vitest) para componentes/stores; `npm run lint`.

- **Código-fonte** (`backend/src/Celebri.Dominio|Aplicacao|Api`, `frontend/src/`) ajuda a
  formar hipóteses (entidades, enums, políticas, validações, stores) — mas **código nunca é
  prova de comportamento correto**. Se o código faz `if resposta == Confirmado`, isso é a
  implementação; o teste real prova se aquela é a regra certa. Observação: parte do domínio
  ainda usa `Casamento`/`Casal` até o renome para `Evento`/`Anfitrião`.

## ⚠️ Multi-tenant: isolamento é o primeiro risco, sempre

O tenant é a **`Organizacao`** (a assessoria/cerimonialista) e é resolvido pelo claim JWT
**`organizacao_id`** — não pelo host, header ou rota
([ClaimsAutenticacao.cs:6](../../../backend/src/Celebri.Aplicacao/Autenticacao/ClaimsAutenticacao.cs#L6)).
O isolamento é imposto em duas camadas que, no caminho comum, fecham o vazamento sozinhas:

- **Leitura**: global query filters por convenção em toda entidade `IPertenceOrganizacao`
  (`OrganizacaoId == atual`), aplicados em
  [CelebriDbContext.cs:146](../../../backend/src/Celebri.Infraestrutura/Persistencia/CelebriDbContext.cs#L146).
- **Escrita**: `IsolamentoOrganizacaoInterceptor` (SaveChanges) carimba `OrganizacaoId` em
  inserts e **lança `ViolacaoIsolamentoException`** se a linha for de outro tenant
  ([IsolamentoOrganizacaoInterceptor.cs:26](../../../backend/src/Celebri.Infraestrutura/Persistencia/Isolamento/IsolamentoOrganizacaoInterceptor.cs#L26)).
  `OrganizacaoId` é concurrency token.

Mesmo com isso, o isolamento é **risco crítico permanente** — as falhas moram nas bordas que
fogem do filtro:

- **Anfitrião preso a UM evento**: `EventosPermitidos => [eventoId]`. Já o **Dono (assessoria)
  vê TODOS os eventos da própria org** por design (`EventosPermitidos => null`). Então a
  hipótese "anfitrião vê/edita outro evento" é válida e específica; "Dono vê dois eventos da
  própria assessoria" **não é bug**.
- **Endpoint que recebe id do cliente** (rota/payload): passe id de evento/convite/fornecedor
  de outro tenant e confira se volta 403/404 — nunca o dado. (IDOR; a constituição exige OWASP
  Top 10.)
- **Links públicos sem login** (RSVP, cronograma público `Geral/Fornecedor/Responsavel`, acesso
  do anfitrião, comprovante): o token é adivinhável/enumerável? Dá para ver ou responder por
  outro convite trocando o token? Esses fluxos rodam por escopos públicos próprios, fora do
  filtro por org.
- **Impersonação "ver como"** é só do operador e **somente-leitura**: middleware devolve 403
  em qualquer não-GET quando o claim `impersonacao` está presente. Hipótese: alguma rota de
  escrita escapa do middleware?

## 1. Antes de testar, monte o modelo da funcionalidade

Não comece clicando. Descubra primeiro, lendo telas, stores, Controllers e, quando útil, o
domínio:

```
Funcionalidade: <nome>
Módulo/Área: <Eventos, Convidados/RSVP, Convites, Mesas, Cronograma/Grande Dia,
              Fornecedores, Financeiro (parcelas), Checklist/Tarefas, Acesso anfitrião,
              Operação/Superadmin>
Objetivo: <o que deveria permitir>
Entidades: <quais entidades de Celebri.Dominio participam>
Estados possíveis: <ver enums abaixo>
Ações: <criar, editar, arquivar/restaurar, revogar, responder RSVP, registrar pagamento...>
Perfis/permissões: <Dono (assessoria) / Anfitrião / Operador / anônimo via token — ver políticas>
Escopo de tenant: <Organizacao via claim; restringe por evento? link público?>
Dependências: <o que essa feature afeta ou consome depois>
Riscos: <vazamento entre assessorias, anfitrião fora do seu evento, IDOR em link público,
         LGPD de dado de convidado, estado inconsistente, perda de dado, duplicidade>
```

A pergunta mais importante: **"que estado o sistema não deveria permitir?"** — é o que guia as
hipóteses.

Estados e enums reais (valores exatos):
- `TipoEvento`: Casamento, QuinzeAnos, Aniversario, Comemoracao · `FaseEvento`: Planejamento,
  RetaFinal, SemanaDoEvento, DiaDoEvento, Realizado.
- RSVP: `RespostaRsvp` Pendente/Confirmado/Recusado · `StatusEnvioConvite`
  NaoEnviado/Enviado/Visualizado · faixa etária Adulto/Crianca.
- `SituacaoAcessoAnfitriao`: Pendente, Expirado, Ativo, Revogado.
- Cronograma: `StatusItemCronograma` Previsto/Concluido · Grande Dia
  Feito/Agora/Proximo/Depois/SemMarcar · dia Vespera/DiaDoEvento/DiaSeguinte.
- Fornecedor: `StatusFornecedorEvento` Cotacao/EmNegociacao/Contratado/Cancelado.
- Financeiro: `StatusParcela` Pendente/Paga · `SituacaoParcela` derivada Pendente/Vencida/Paga.

## 2. Priorize por risco, não por cobertura

Não dá tempo igual para tudo. Gaste mais nisso:

- **Alto**: isolamento entre assessorias e do anfitrião ao seu evento; links públicos
  (IDOR/enumeração em RSVP, cronograma público, acesso anfitrião); autorização por política
  (`SomenteAssessoria` vs `AssessoriaEAnfitriao` vs `SomenteOperador`); **financeiro** —
  parcelas de fornecedor (`RegistrarPagamento`/`DesfazerPagamento`, comprovante, parcela só com
  fornecedor `Contratado`); LGPD — `DadosSensiveisConvidado` (cifrado) e a retenção/expurgo
  automático; mudanças de estado relevantes (arquivar/restaurar evento, revogar acesso,
  suspender/reativar assessoria); concorrência otimística (`OrganizacaoId` e evento são
  concurrency tokens → 409).
- **Médio**: CRUDs de cadastro (convidados, convites, fornecedores, mesas, itens de
  cronograma), importação de convidados, modelos (checklist/cronograma) e duplicação, filtros,
  mapa de mesas e totais.
- **Baixo**: ajustes visuais, cosmético.

Se uma área revelar comportamento estranho, aprofunde ali — a exploração é adaptativa, não uma
checklist fixa.

> Ainda **não existem** no backend: lista de presentes, pagamento do convidado, Pix, repasse,
> mural e site público — são visão de produto, não há código. `CobrancaRsvp` **não é dinheiro**:
> só registra que um lembrete de RSVP foi enviado. Não invente esses fluxos como se existissem;
> se o usuário pedir QA deles, diga que não estão implementados.

## 3. Gere cenários automaticamente

Não espere casos de teste do usuário. Para cada fluxo relevante considere ao menos: caminho
feliz; campos vazios; valores no limite e um passo além (atenção a `MaxLength`); dados
inválidos/conflitantes (e-mail, data no passado vs. `DataLimiteRsvp`, valor de parcela
negativo, capacidade de mesa 0); duplicidade (repetir a mesma criação); duplo-clique em ação
sensível; refresh e voltar/avançar no meio do fluxo; abandono da operação; erro/timeout de API
(use o `simulado`); concorrência (duas abas, ou dois usuários no mesmo registro → 409 pelo
concurrency token); permissões (Dono vs Anfitrião vs Operador vs anônimo); **id/token de outra
assessoria ou de outro evento**; referência a registro inexistente/arquivado/revogado; rate
limit (há limite por endpoint em `entrar`, `cadastro`, `rsvp`, `acesso-anfitriao`, `importacao`,
`comprovante`, `cronograma-publico`… → 429); estado parcialmente preenchido.

Nem todo cenário se aplica a toda feature — use o modelo do passo 1 e a priorização do passo 2.

## 4. Teste com hipóteses, não só cliques

Formule a hipótese de falha antes de investigar:

```
H001: um anfitrião consegue ver/editar convidados de um evento que não é o dele.
Como verificar: criar 2 eventos (ou usar o alheio); logar como anfitrião do evento A;
  GET/PUT /api/eventos/{idDoB}/convites/... ; conferir status (espera 403/404) e corpo;
  repetir pela UI navegando para /eventos/{idDoB}/convidados.
Resultado: CONFIRMADA / REFUTADA / INCONCLUSIVA
```

Depois do caminho feliz, pense como quem quer quebrar: vazamento entre tenants, estado
inválido, sequência fora de ordem, dado inconsistente entre telas, divergência entre UI e
resposta da API, dado velho sobrando após mudança, operação "meio salva", token de link
público aceitando o que não devia.

Teste sequências, não só ações isoladas, escolhidas pelo risco da feature:
`criar → editar → arquivar`, `criar → revogar acesso → tentar usar o link`,
`registrar pagamento → desfazer → conferir situação`, `contratar fornecedor → criar parcela →
cancelar fornecedor`, `convidar anfitrião → aceitar → revogar → tentar navegar`.

## 5. UI dizendo "sucesso" não é prova

Uma mensagem de sucesso não prova persistência. Quando der, confirme:

- resposta HTTP real (status, payload) — via `page.on('response')`, `page.waitForResponse` ou
  `request` do Playwright;
- console sem erro JS/exception relevante;
- o dado sobrevive a refresh e a sair-e-voltar (cuidado: o PWA faz cache `NetworkFirst` de
  `GET /api/eventos/*` — um dado "presente" pode ser cache velho; confirme contra a API);
- efeitos colaterais nas entidades relacionadas aconteceram (ex.: confirmar RSVP reflete no
  mapa de mesas, nos totais e na contagem? revogar acesso derruba a sessão do anfitrião?) e o
  que **não devia** mudar não mudou;
- e-mail esperado chegou no Mailpit (convite, recuperação) — e o link dele funciona.

Erro de console/rede (400/401/403/404/409/422/429/500+) é evidência objetiva — mas avalie se
representa problema real antes de reportar como bug (um 403 esperado num teste de permissão é
o sucesso, não a falha).

## 6. Classifique sem inflar

Antes de registrar: consigo reproduzir? tenho evidência? existe explicação alternativa? isso
viola mesmo uma expectativa razoável, ou só é diferente do que eu esperava? Sem certeza,
registre como **hipótese**, não como bug confirmado.

Categoria: `Bug | UX | Performance | Segurança | Funcionalidade | Acessibilidade | Consistência | Melhoria | Observação`

Severidade: `Crítica` (vazamento entre assessorias ou entre eventos, perda de dado, falha de
segurança, erro em valor financeiro, exposição de dado de convidado/LGPD, quebra de fluxo
crítico) · `Alta` (impede fluxo relevante) · `Média` (tem contorno, impacto limitado) ·
`Baixa` (cosmético).

Confiança: `Alta` (reproduzido e comprovado) · `Média` (forte evidência, falta uma
confirmação) · `Baixa` (suspeita sem comprovação suficiente).

## 7. Regras de dado durante a exploração

Prefira o ambiente e2e (`npm run e2e:ambiente:subir`) ou seu stack local
(`docker compose up -d db email`) para qualquer escrita — ambos são locais e descartáveis.
Nunca aponte `ConnectionStrings__Principal` para host compartilhado/prod (dev auto-migra).
Não exclua/arquive registro que você não criou. Registre exatamente quais assessoria, evento,
IDs e tokens foram usados, para reprodutibilidade. Não exponha segredos do `.env` no relatório.

## 8. Quando parar

Não é "cliquei em tudo". É: fluxos principais cobertos; estados/transições importantes
testados; riscos de alto impacto investigados (incluindo políticas de autorização, isolamento
entre assessorias/eventos e links públicos); hipóteses relevantes confirmadas ou refutadas
(não deixadas em aberto sem tentar); nenhum risco alto sem nenhuma investigação. Se sobrar,
continue antes de fechar o relatório.

## 9. Relatório final — nunca como arquivo no repositório

⚠️ Neste projeto especificação **não vai para o repositório** (`CLAUDE.md` e constituição §6).
O relatório de QA é uma spec e deve ser gravado via API:

```
POST /api/especificacoes
{ "tarefaId": "<id>", "tipoSpec": "revisao", "conteudo": "<relatório>", "criadoPorAgente": "qa-investigativo" }
```

Use `tipoSpec: "testes"` quando a entrega for o plano/execução de cenários e `"revisao"`
quando for laudo de achados. Screenshots, traces e vídeos ficam em
`frontend/playwright-report/` e `frontend/test-results/` — são artefato de evidência, não spec.
Se a exploração for ad-hoc (usuário pediu no terminal sem apontar tarefa), siga a regra
tarefa-first do `CLAUDE.md`: crie a tarefa primeiro (`POST /api/tarefas`, com `descricao` em
HTML rico pt-BR), depois explore. Se a tarefa já tem uma spec daquele `tipoSpec`, a API
responde 409 — consolide num único conteúdo em vez de duplicar.

Estrutura (adapte o tamanho ao escopo — uma tela pequena não precisa de 22 seções infladas,
mas não pule Resumo/Achados confirmados/Backlog):

```
# Relatório de QA — <feature>

## Resumo executivo
## Escopo analisado (módulos, rotas, perfis, assessoria/evento e dados usados)
## Modelo de negócio identificado (entidades, estados, riscos)
## Cenários e hipóteses investigados
## Achados confirmados (bug/UX/segurança/consistência, com severidade e confiança)
## Hipóteses refutadas ou inconclusivas
## Efeitos colaterais observados
## Riscos não investigados (e por quê)
## Recomendações e backlog priorizado
```

Cada achado traz: título, categoria, severidade, confiança, passos para reproduzir, resultado
esperado vs. obtido, evidência (screenshot, console, request/response, trace, e-mail do
Mailpit) e dados usados (assessoria, evento, IDs/tokens).

Para sugestão de correção, critério de aceite em Gherkin:

```
Dado que um fornecedor do evento ainda não está Contratado
Quando a assessoria tentar criar uma parcela para ele
Então o sistema deve impedir a criação
E deve informar claramente o motivo
```

## O que não fazer

Não teste só o caminho feliz. Não considere uma tela "testada" só por ter clicado em todos os
botões. Não invente regra de negócio que não observou nem está no código/produto — nem fluxos
que ainda não existem (presentes, pagamento do convidado, repasse, mural, site público). Não
trate diferença visual isolada como bug sem confirmar (viewport vs. `getComputedStyle` vs. DOM
real). Não trate todo erro de console como bug sem avaliar impacto. Não rode ataque destrutivo
de verdade (XSS/SQLi só como texto de teste, nunca exploit real). Não aponte a API para banco
compartilhado/prod. Não exclua ou arquive dado cuja origem você não conhece. Não exponha
segredos do `.env`. Não salve o relatório como `.md` no repositório. Não commite sondas de
teste durante a exploração. Não pare no primeiro bug. Não corrija o sistema durante a
exploração — documente e recomende.
