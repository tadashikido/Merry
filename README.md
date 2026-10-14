# Casamento

Plataforma para cerimonialistas gerenciarem os casamentos dos seus clientes.

- `backend/` — .NET 8 (ASP.NET Core, EF Core, PostgreSQL), camadas `Api`, `Aplicacao`, `Dominio`, `Infraestrutura`
- `frontend/` — Vue 3 + TypeScript + Pinia + PrimeVue (Vite)

## Pré-requisitos

Docker, SDK .NET 8 (fixado em `global.json`) e Node 24 (`.nvmrc`).

## Subir tudo

```bash
cp .env.example .env
docker compose up --build
```

- Aplicação: http://localhost:8081
- API: http://localhost:5080/api/saude
- E-mails de desenvolvimento (Mailpit): http://localhost:8025

Antes de subir, gere uma chave JWT aleatória para o `.env` (por exemplo `openssl rand -base64 48`) e grave em `JWT_CHAVE_ASSINATURA`. Gere também a chave dos dados sensíveis com `openssl rand -base64 32` e grave em `DADOS_SENSIVEIS_CHAVE` (use valores diferentes).

Este compose é para desenvolvimento: a API roda em `Development` e as portas ficam restritas a `127.0.0.1`.

## Desenvolvimento local

```bash
docker compose up -d db email
cd backend
dotnet user-secrets set "ConnectionStrings:Principal" "Host=localhost;Port=5432;Database=casamento;Username=casamento;Password=<senha do .env>" --project src/Casamento.Api
dotnet user-secrets set "Jwt:ChaveAssinatura" "<valor aleatório com 32 bytes ou mais>" --project src/Casamento.Api
dotnet user-secrets set "DadosSensiveis:ChaveCifragem" "$(openssl rand -base64 32)" --project src/Casamento.Api
dotnet run --project src/Casamento.Api
```

```bash
cd frontend
npm ci
npm run dev
```

Frontend em http://localhost:5173, com proxy de `/api` para `http://localhost:5080`.

## Testes e verificações

```bash
cd backend
dotnet format --verify-no-changes
dotnet test
```

Os testes de integração com banco usam Testcontainers e exigem Docker em execução.

```bash
cd frontend
npm run lint
npm run type-check
npm run test
```

### Testes E2E (Playwright)

Os cenários ficam em `frontend/e2e/` e não entram na suíte do Vitest. O Playwright sobe um Vite dedicado na porta `5180` (ou reutiliza um já em execução nela), separado do `npm run dev` da 5173. Há duas suítes:

- **Simulada** (`e2e/*.e2e.ts`): a API é simulada com `page.route`, sem backend.
- **Integrada** (`e2e/integrado/**/*.e2e.ts`): roda contra a API .NET, o PostgreSQL e o Mailpit reais. Cada teste cadastra a própria assessoria e lê os e-mails (recuperação de senha, convite do casal) no Mailpit.

```bash
cd frontend
npm run test:e2e:instalar      # primeira vez: baixa o Chromium
npm run test:e2e               # suíte simulada (sem backend)

npm run e2e:ambiente:subir     # db + Mailpit + API com o override docker-compose.e2e.yml (Docker aberto, .env na raiz)
npm run test:e2e:visivel       # suíte integrada com o navegador visível
npm run test:e2e:integrado     # suíte integrada em headless
npm run e2e:ambiente:derrubar  # para os containers

npm run test:e2e:interface     # modo interativo para depuração
npx playwright show-report     # relatório HTML da última execução
```

- `E2E_LENTIDAO_MS=300` deixa a execução visível mais lenta para acompanhar; `npm run test:e2e:visivel -- convidados` roda só um arquivo.
- `E2E_PORTA` muda a porta do Vite de testes (padrão `5180`), `API_PROXY_ALVO` muda a API (padrão `http://localhost:5080`) e `E2E_MAILPIT_URL` muda o Mailpit (padrão `http://localhost:8025`).
- O `docker-compose.e2e.yml` eleva os limites de requisição e aponta os links de e-mail para a porta 5180. Use-o só em ambiente local de testes, nunca em deploy.
- Os testes criam assessorias com e-mails `@e2e.teste` no banco de desenvolvimento. Para zerar o banco: `docker compose down -v`.
- Testes em `Defeitos conhecidos` estão marcados com `test.fail()` e documentam bugs abertos no board; ao corrigir o bug, remova a marcação.

## Migrations

```bash
cd backend
dotnet tool restore
dotnet ef migrations add <Nome> --project src/Casamento.Infraestrutura --startup-project src/Casamento.Infraestrutura --output-dir Persistencia/Migrations
```

Em `Development` as migrations são aplicadas na inicialização (`Banco:AplicarMigrationsAoIniciar`). Nos demais ambientes, aplique com `dotnet ef database update` no deploy.

## Configuração

Nenhum segredo é versionado. Variáveis relevantes:

| Variável | Uso |
|---|---|
| `ConnectionStrings__Principal` | string de conexão do PostgreSQL (obrigatória) |
| `Cors__OrigensPermitidas__0..n` | origens autorizadas a chamar a API |
| `Banco__AplicarMigrationsAoIniciar` | aplica migrations na inicialização |
| `AllowedHosts` | hosts aceitos pela API fora de Development (padrão `localhost`; em produção, o domínio público) |
| `ProxyReverso__Proxies__0..n` / `ProxyReverso__Redes__0..n` | IPs/redes CIDR do proxy reverso confiável para `X-Forwarded-For`/`X-Forwarded-Proto` (vazio = apenas loopback) |
| `Jwt__ChaveAssinatura` | chave HMAC do JWT, 32 bytes ou mais (obrigatória; nunca versionar) |
| `Jwt__Emissor` / `Jwt__Audiencia` | emissor e audiência do JWT (padrão `casamento-api` / `casamento-web`) |
| `DadosSensiveis__ChaveCifragem` | chave AES-256 dos dados sensíveis (restrição alimentar/necessidade especial): exatamente 32 bytes em Base64 (`openssl rand -base64 32`), diferente da chave JWT (obrigatória; nunca versionar; guarde backup — sem ela as restrições gravadas ficam ilegíveis). No `docker-compose`, variável `DADOS_SENSIVEIS_CHAVE` do `.env` |
| `RetencaoDadosSensiveis__DiasAposCasamento` | dias após a data do casamento para apagar restrições e necessidades especiais (padrão 30; 1 a 365) |
| `RetencaoDadosSensiveis__IntervaloMinutos` / `RetencaoDadosSensiveis__Habilitada` | intervalo do job de retenção (padrão 360) e liga/desliga (padrão `true`) |
| `Autenticacao__UrlFrontend` | URL pública do frontend usada no link de redefinição de senha (obrigatória) |
| `Email__Remetente`, `Email__Smtp__Host`, `Email__Smtp__Porta`, `Email__Smtp__UsarSsl`, `Email__Smtp__Usuario`, `Email__Smtp__Senha` | SMTP de envio (em desenvolvimento, o Mailpit do compose) |
| `ArmazenamentoArquivos__Diretorio` | caminho **absoluto** onde a API guarda os contratos em PDF dos fornecedores (obrigatória). Fora do diretório da aplicação e nunca servido como estático; no `docker-compose`, volume `arquivos-enlace` em `/var/lib/enlace/arquivos`. Inclua o diretório no backup |
| `LimitesRequisicao__<politica>__Limite` / `__JanelaSegundos` | rate limiting de `entrar`, `cadastro`, `recuperacao` e `renovar` por IP; `contrato` (envio de contrato, padrão 20/60 s) por usuário |
| `VITE_API_URL` | URL base da API no frontend (vazio = mesma origem) |
