# Celebri

*Eventos que conectam.* Plataforma para cerimonialistas e assessorias gerenciarem os eventos sociais dos seus clientes (casamento, festa de 15 anos, aniversário, comemoração).

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
dotnet user-secrets set "ConnectionStrings:Principal" "Host=localhost;Port=5432;Database=casamento;Username=casamento;Password=<senha do .env>" --project src/Celebri.Api
dotnet user-secrets set "Jwt:ChaveAssinatura" "<valor aleatório com 32 bytes ou mais>" --project src/Celebri.Api
dotnet user-secrets set "DadosSensiveis:ChaveCifragem" "$(openssl rand -base64 32)" --project src/Celebri.Api
dotnet run --project src/Celebri.Api
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

```bash
bash infra/testes/env-exemplo.test.sh
```

Falha se algum `.env*.example` versionado tiver valor com aparência de segredo real (hexadecimal ou Base64 longo, chave PEM, tokens de provedores) ou se o `.env.production.example` vier com segredo preenchido, e confere que o compose de produção recusa o exemplo sem segredos. Roda no job `infra` do CI.

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
dotnet ef migrations add <Nome> --project src/Celebri.Infraestrutura --startup-project src/Celebri.Infraestrutura --output-dir Persistencia/Migrations
```

Em `Development` as migrations são aplicadas na inicialização (`Banco:AplicarMigrationsAoIniciar`). Em produção o `docker-compose.prod.yml` liga a mesma flag (uma única réplica da API); faça backup do banco antes de publicar migrations destrutivas.

## Deploy em produção

Arquitetura: nginx do host da VPS (TLS do Let's Encrypt, portas 80/443, compartilhado com outros sites) → `web` (nginx do container, SPA e proxy de `/api/`, publicado só em `127.0.0.1:${WEB_PORTA}`) → `api` → `db`. Os containers ficam na rede docker `10.214.0.0/24`, definida em `docker-compose.prod.yml`. O tráfego da porta publicada chega ao `web` pelo gateway dessa rede, que é confiável para `X-Forwarded-*`. A mesma faixa aparece em `frontend/nginx/default.conf` (`set_real_ip_from` e `geo`), em `ProxyReverso__Redes__0` e na rede interna de `infra/testes/proxy.test.sh`; se ela colidir com outra rede da VPS, altere todos os pontos juntos. O teste `RedeProducaoTestes` falha no CI se esses pontos divergirem, se a faixa não for privada ou se ela se sobrepuser aos pools padrão do Docker (`172.17.0.0/16`–`172.31.0.0/16` e `192.168.0.0/16`), que causam `Pool overlaps with other one on this address space` na VPS. Trocar a faixa recria a rede `casamento-producao_default`.

O workflow `Deploy` roda após o `CI` concluir com sucesso num push em `main` (ou manualmente por *Run workflow*), conecta por SSH e executa `deploy.sh <sha>`. O script:

- avança o repositório por fast-forward até o SHA validado;
- reconstrói apenas `api` (mudanças em `backend/`) e/ou `web` (mudanças em `frontend/`) e aplica `up -d`;
- avisa quando `infra/nginx/` mudou, porque o vhost do host é atualizado manualmente;
- falha se `https://<DOMINIO>/api/saude` não responder em cerca de 90 s.

`./deploy.sh --completo` reconstrói tudo com `--pull` (atualização de imagens base).

### VPS (uma vez)

1. Instale Docker Engine com o plugin compose, `git`, `curl`, `certbot`, `python3-certbot-nginx` e `gettext-base` (`envsubst`). O nginx do host continua como está. Firewall: apenas 22/tcp, 80/tcp e 443/tcp.
2. Aponte o registro DNS `A` (e `AAAA`, se houver IPv6) do domínio para a VPS.
3. Crie o usuário de deploy sem sudo: `sudo adduser --disabled-password deploy && sudo usermod -aG docker deploy`.
4. Como `deploy`, gere a chave de leitura do repositório (`ssh-keygen -t ed25519 -f ~/.ssh/github_celebri -N ""`), cadastre a pública como *Deploy key* somente leitura no GitHub e configure `~/.ssh/config` com `Host github.com` → `IdentityFile ~/.ssh/github_celebri`.
5. `sudo install -d -o deploy -g deploy /var/www/celebri` e, como `deploy`, clone: `git clone git@github.com:tadashikido/Merry.git /var/www/celebri`.
6. `cp .env.production.example .env && chmod 600 .env` e preencha. Os segredos vêm vazios no exemplo e o compose recusa subir sem eles; gere-os na própria VPS (ou na sua máquina) e nunca os versione nem reaproveite de outro ambiente. O compose interpola `$` dentro do `.env`; se um valor tiver `$`, escreva `$$`. Valores:
   - senha do banco com `openssl rand -hex 32` (sem `;`, para não quebrar a connection string);
   - `JWT_CHAVE_ASSINATURA` com `openssl rand -base64 48`;
   - `DADOS_SENSIVEIS_CHAVE` com `openssl rand -base64 32` (guarde uma cópia fora da VPS);
   - domínio;
   - `WEB_PORTA` livre no host (confira com `ss -ltn`);
   - SMTP do provedor (porta 587 com `SMTP_USAR_SSL=true` usa STARTTLS).
7. Crie o vhost no mesmo padrão dos outros sites da VPS (`server_name` + `proxy_pass` para a porta local) e deixe o certbot injetar o TLS:

   ```bash
   cd /var/www/celebri
   export DOMINIO=celebri.exemplo.com.br WEB_PORTA=8090
   envsubst '$DOMINIO $WEB_PORTA' < infra/nginx/celebri.conf.template | sudo tee /etc/nginx/sites-available/celebri.conf > /dev/null
   sudo ln -sf /etc/nginx/sites-available/celebri.conf /etc/nginx/sites-enabled/celebri.conf
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d "$DOMINIO" --redirect
   ```

   O template difere do padrão dos outros sites em dois pontos:
   - `client_max_body_size 11m`: sem ele, PDFs de contrato acima de 1 MB recebem 413;
   - `127.0.0.1` no lugar de `localhost`: o container é publicado só em IPv4.

   Para usar também `www`, acrescente-o ao `server_name` e ao certbot (`-d www.$DOMINIO`). Se o nginx do host carrega vhosts de `/etc/nginx/conf.d/`, grave em `/etc/nginx/conf.d/celebri.conf` e pule o `ln`.

8. Depois do certbot, o arquivo `/etc/nginx/sites-available/celebri.conf` (em instalações anteriores ao Celebri, `casamento.conf`) passa a conter o TLS e é a fonte da verdade: **nunca o sobrescreva com o template**. Quando o `deploy.sh` avisar que `infra/nginx/celebri.conf.template` mudou, aplique só a diferença à mão e rode `sudo nginx -t && sudo systemctl reload nginx`. As renovações são automáticas pelo timer do certbot; confira com `sudo certbot renew --dry-run`.
9. Primeiro deploy manual: `./deploy.sh`.
10. Agende backup diário do banco (`docker compose -f docker-compose.prod.yml exec -T db pg_dump -U casamento casamento | gzip > backup.sql.gz`) e do volume `casamento-producao_arquivos-enlace`, copiando-os para fora da VPS.

### GitHub (uma vez)

1. Gere outro par de chaves só para o Actions (`ssh-keygen -t ed25519 -f deploy_actions -N ""`) e adicione a pública em `/home/deploy/.ssh/authorized_keys` com o prefixo `restrict ` (bloqueia port forwarding, agent e pty).
2. Em *Settings → Environments*, crie o environment `production` (opcionalmente com aprovação obrigatória) e cadastre:
   - secrets `VPS_HOST`, `VPS_USUARIO` (`deploy`), `VPS_CHAVE_SSH` (conteúdo da chave privada `deploy_actions`) e `VPS_KNOWN_HOSTS` (saída de `ssh-keyscan -t ed25519 <host>`, conferida com `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` na VPS);
   - variables `VPS_DIRETORIO` e `VPS_PORTA` (padrão `22`). Sem `VPS_DIRETORIO`, o workflow envia `infra/deploy/localizar-deploy.sh` pela conexão SSH e usa o primeiro diretório que tiver `deploy.sh`, nesta ordem: `/var/www/celebri`, `/var/www/merry` (legado).

### Segredos de produção vazados no histórico

Desde o commit `2b6fe2d` (primeiro deploy) até a limpeza, o `.env.production.example` trazia valores com aparência de segredo real em `POSTGRES_PASSWORD`, `JWT_CHAVE_ASSINATURA` e `DADOS_SENSIVEIS_CHAVE`. O arquivo foi limpo, mas os valores continuam no histórico do git já enviado ao GitHub e devem ser tratados como públicos. Se a VPS usa algum deles, rotacione.

**1. Verificar se a VPS usa os valores vazados** (como `deploy`; o clone da VPS já contém o commit `2b6fe2d` e nada é impresso além do resultado):

```bash
cd /var/www/celebri
for nome in POSTGRES_PASSWORD JWT_CHAVE_ASSINATURA DADOS_SENSIVEIS_CHAVE; do
  vazado=$(git show 2b6fe2d:.env.production.example | grep -E "^$nome=" | cut -d= -f2- | tr -d "\"'\r")
  atual=$(grep -E "^$nome=" .env | tail -n 1 | cut -d= -f2- | tr -d "\"'\r")
  if [ -n "$vazado" ] && [ "$vazado" = "$atual" ]; then echo "$nome: usa o valor vazado, rotacione"; else echo "$nome: diferente do valor vazado"; fi
done
```

**2. Rotacionar o que estiver em uso**, nesta ordem, com `cd /var/www/celebri` e `C="docker compose -f docker-compose.prod.yml"`:

| Segredo | Como rotacionar | Impacto |
|---|---|---|
| `POSTGRES_PASSWORD` | Trocar a variável não muda a senha de um banco já criado. Altere no PostgreSQL primeiro: `$C exec db psql -U casamento -d casamento` e, no prompt, `\password casamento` com a saída de `openssl rand -hex 32`. Grave o mesmo valor no `.env` e rode `$C up -d --force-recreate api` | API indisponível por alguns segundos; nenhum dado perdido. Se o `.env` e o banco ficarem diferentes, a API não conecta |
| `JWT_CHAVE_ASSINATURA` | `openssl rand -base64 48` no `.env` e `$C up -d --force-recreate api` | Tokens de acesso emitidos deixam de valer, inclusive os forjados com a chave vazada; a sessão é renovada pelo refresh token (cookie `casamento_rt`), que não depende da chave. Os tokens dos links de RSVP e cronograma são cifrados com chave derivada desta: os links já enviados continuam funcionando, mas o painel não consegue reexibi-los (link irrecuperável) e gerar um novo invalida o anterior. Prefira rotacionar antes de enviar convites em massa |
| `DADOS_SENSIVEIS_CHAVE` | **Não troque direto se houver dados.** Conte os registros: `$C exec -T db psql -U casamento -d casamento -tc "select count(*) from dados_sensiveis_convidados where conteudo_cifrado is not null"`. Se for zero, ou se a perda for aceita formalmente, gere `openssl rand -base64 32`, grave no `.env`, rode `$C up -d --force-recreate api` e guarde a nova chave fora da VPS. Se houver dados a preservar, a rotação depende de uma tarefa de backend que aceite a chave anterior e recifre os registros | Sem recifragem, todas as restrições alimentares e necessidades especiais gravadas ficam ilegíveis: o rótulo `casamento/dados-sensiveis/v1` amarra cada registro à chave. O job de retenção apaga esses dados após o evento, o que reduz o volume com o tempo |
| `SMTP_USUARIO` / `SMTP_SENHA` | Nunca estiveram preenchidos no exemplo. Troque no provedor só se tiverem sido expostos por outro meio | Envio de e-mail falha até o `.env` receber a credencial nova |

**3. Depois da rotação:** backups do banco feitos enquanto a chave vazada de dados sensíveis estava em uso continuam legíveis com ela; apague-os ou guarde-os cifrados. Restrições alimentares são dado de saúde (LGPD, art. 11): se houver indício de acesso indevido, avalie a comunicação de incidente (art. 48).

**4. Histórico do git:** reescrever o histórico (por exemplo com `git filter-repo`) exige force push na `main`, quebra os clones existentes (inclusive o da VPS, que só avança por fast-forward) e não revoga cópias já feitas. A medida efetiva é a rotação; a reescrita fica a critério do dono do repositório. Ative também *Settings → Code security → Secret scanning* e *Push protection* no GitHub para barrar novos vazamentos.

Para não repetir: segredos são gerados na VPS ou localmente e ficam só no `.env` (ignorado pelo git). O teste `infra/testes/env-exemplo.test.sh` faz o CI falhar se um `.env*.example` voltar a ter valor com aparência de segredo.

### Nomes físicos preservados no renome para Celebri

O renome técnico de Casamento/Nossia para Celebri trocou solução, projetos, namespaces, imagens e caminhos internos, mas manteve de propósito tudo o que identifica dado persistente ou sessão em produção. Renomear qualquer item abaixo exige migração manual na VPS:

| Item | Nome mantido | Motivo |
|---|---|---|
| Projeto do compose (`name:`) | `casamento` (dev) e `casamento-producao` (produção) | prefixa containers, rede e volumes; trocar sobe um projeto novo ao lado do antigo, disputando a porta publicada e a sub-rede `10.214.0.0/24` |
| Volumes | `dados-postgres` e `arquivos-enlace` (`casamento-producao_*` na VPS) | trocar desanexa o banco e os contratos já gravados |
| Banco e usuário PostgreSQL | valores do `.env` (`casamento`) | trocar exige dump/restore |
| Emissor e audiência do JWT | `casamento-api` / `casamento-web` | trocar invalida as sessões em andamento |
| `UserSecretsId` | `casamento-api` | trocar perde os user-secrets locais dos desenvolvedores |
| Cookie do refresh token | `casamento_rt` | trocar desconecta todas as sessões abertas |
| Rótulos de contexto da cifra | `casamento/dados-sensiveis/v1`, `casamento/cronograma/token/v1`, `casamento/rsvp/token/v1` | são dados associados do AES-GCM: trocar torna ilegíveis as restrições gravadas e invalida os links de RSVP e cronograma já enviados |

O renome de domínio (Casamento → Evento, Casal → Anfitrião) renomeou tabelas, colunas, índices e constraints pela migration `GeneralizarDominioEvento`, sem apagar dados, e trocou os valores gravados `Casal` → `Anfitriao` e `DiaDoCasamento` → `DiaDoEvento`. A API passou de `api/casamentos` e `api/acesso-casal` para `api/eventos` e `api/acesso-anfitriao`, sem alias. No front, `/casamentos/**` e `/acesso-casal` redirecionam para `/eventos/**` e `/acesso-anfitriao`, para que links já enviados por e-mail continuem funcionando. Tokens de acesso emitidos antes do deploy deixam de autorizar e são renovados pela sessão.

O caminho de montagem dos arquivos dentro do container mudou para `/var/lib/celebri/arquivos`. Isso não afeta os arquivos já gravados: o volume é o mesmo e a API grava caminhos relativos à raiz configurada.

Migração opcional do diretório da VPS (feita à mão, fora do deploy automático): `sudo mv /var/www/merry /var/www/celebri` com nenhum deploy em andamento e, se `VPS_DIRETORIO` estiver definida no environment `production`, atualize-a. Os containers e volumes não dependem do diretório, porque o nome do projeto está fixado no compose. Confirme disparando o workflow `Deploy` manualmente.

### Rollback

Se o health check falhar, o código novo continua no ar e o job fica vermelho. Para voltar atrás, faça `git revert` do commit problemático na `main`: o revert passa pelo CI e é publicado como um deploy normal. Chamar `./deploy.sh <sha-antigo>` não funciona, porque um SHA anterior ao publicado é ignorado de propósito, para que execuções fora de ordem nunca regridam a produção. Em emergência, depois de enviar o revert, dispare o workflow `Deploy` manualmente (*Run workflow*): o `workflow_dispatch` publica a ponta da `main` sem aguardar o CI.

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
| `RetencaoDadosSensiveis__DiasAposEvento` | dias após a data do evento para apagar restrições e necessidades especiais (padrão 30; 1 a 365). O nome antigo `RetencaoDadosSensiveis__DiasAposCasamento` ainda é lido quando o novo não está definido |
| `RetencaoDadosSensiveis__IntervaloMinutos` / `RetencaoDadosSensiveis__Habilitada` | intervalo do job de retenção (padrão 360) e liga/desliga (padrão `true`) |
| `Autenticacao__UrlFrontend` | URL pública do frontend usada no link de redefinição de senha (obrigatória) |
| `Email__Remetente`, `Email__Smtp__Host`, `Email__Smtp__Porta`, `Email__Smtp__UsarSsl`, `Email__Smtp__Usuario`, `Email__Smtp__Senha` | SMTP de envio (em desenvolvimento, o Mailpit do compose). O nome de exibição do remetente é sempre a marca Celebri e não é configurável |
| `ArmazenamentoArquivos__Diretorio` | caminho **absoluto** onde a API guarda os contratos em PDF dos fornecedores (obrigatória). Fora do diretório da aplicação e nunca servido como estático; no `docker-compose`, volume `arquivos-enlace` em `/var/lib/celebri/arquivos` (o volume mantém o nome legado para não desanexar os arquivos já gravados). Inclua o diretório no backup |
| `LimitesRequisicao__<politica>__Limite` / `__JanelaSegundos` | rate limiting de `entrar`, `cadastro`, `recuperacao` e `renovar` por IP; `contrato` (envio de contrato, padrão 20/60 s) por usuário |
| `VITE_API_URL` | URL base da API no frontend (vazio = mesma origem) |
