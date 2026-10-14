#!/usr/bin/env bash

set -uo pipefail

unset MSYS_NO_PATHCONV

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DEPLOY="$RAIZ_REPOSITORIO/deploy.sh"
DIRETORIO_TEMPORARIO="$(mktemp -d)"
trap 'rm -rf "$DIRETORIO_TEMPORARIO"' EXIT

export GIT_CONFIG_NOSYSTEM=1
export GIT_CONFIG_GLOBAL="$DIRETORIO_TEMPORARIO/gitconfig"
printf '[user]\n\tname = Teste\n\temail = teste@exemplo.com\n[init]\n\tdefaultBranch = main\n[core]\n\tautocrlf = false\n' > "$GIT_CONFIG_GLOBAL"

TOTAL=0
FALHAS=0

preparar_cenario() {
  CENARIO="$DIRETORIO_TEMPORARIO/cenario-$TOTAL"
  ORIGEM="$CENARIO/origem.git"
  DESENVOLVIMENTO="$CENARIO/desenvolvimento"
  VPS="$CENARIO/vps"
  STUBS="$CENARIO/stubs"
  LOG_DOCKER="$CENARIO/docker.log"
  LOG_CURL="$CENARIO/curl.log"
  mkdir -p "$CENARIO" "$STUBS"
  : > "$LOG_DOCKER"
  : > "$LOG_CURL"

  git init --quiet --bare "$ORIGEM"
  git clone --quiet "$ORIGEM" "$DESENVOLVIMENTO" 2> /dev/null
  mkdir -p "$DESENVOLVIMENTO/backend" "$DESENVOLVIMENTO/frontend" "$DESENVOLVIMENTO/infra/nginx"
  cp "$SCRIPT_DEPLOY" "$DESENVOLVIMENTO/deploy.sh"
  echo "api" > "$DESENVOLVIMENTO/backend/api.txt"
  echo "web" > "$DESENVOLVIMENTO/frontend/web.txt"
  echo "server {}" > "$DESENVOLVIMENTO/infra/nginx/casamento.conf.template"
  echo "services: {}" > "$DESENVOLVIMENTO/docker-compose.prod.yml"
  git -C "$DESENVOLVIMENTO" add -A
  git -C "$DESENVOLVIMENTO" commit --quiet -m "inicial"
  git -C "$DESENVOLVIMENTO" push --quiet origin main 2> /dev/null

  git clone --quiet "$ORIGEM" "$VPS" 2> /dev/null
  echo "DOMINIO=casamento.teste" > "$VPS/.env"

  cat > "$STUBS/docker" <<EOF
#!/usr/bin/env bash
echo "\$*" >> "$LOG_DOCKER"
EOF
  cat > "$STUBS/curl" <<EOF
#!/usr/bin/env bash
echo "\$*" >> "$LOG_CURL"
exit \${CURL_CODIGO:-0}
EOF
  printf '#!/usr/bin/env bash\nexit 0\n' > "$STUBS/sleep"
  chmod +x "$STUBS/docker" "$STUBS/curl" "$STUBS/sleep"
}

commitar() {
  local arquivo=$1
  mkdir -p "$(dirname "$DESENVOLVIMENTO/$arquivo")"
  echo "$RANDOM" >> "$DESENVOLVIMENTO/$arquivo"
  git -C "$DESENVOLVIMENTO" add -A
  git -C "$DESENVOLVIMENTO" commit --quiet -m "altera $arquivo"
  git -C "$DESENVOLVIMENTO" push --quiet origin HEAD 2> /dev/null
  git -C "$DESENVOLVIMENTO" rev-parse HEAD
}

executar_deploy() {
  SAIDA=$(PATH="$STUBS:$PATH" bash "$VPS/deploy.sh" "$@" 2>&1)
  CODIGO=$?
}

head_vps() {
  git -C "$VPS" rev-parse HEAD
}

verificar() {
  local descricao=$1
  shift
  if ! "$@"; then
    echo "    ✗ $descricao"
    FALHA_ATUAL=1
  fi
}

docker_executou() {
  grep -qxF -- "$1" "$LOG_DOCKER"
}

docker_nao_executou_build() {
  ! grep -q " build" "$LOG_DOCKER"
}

caso() {
  local nome=$1
  TOTAL=$((TOTAL + 1))
  FALHA_ATUAL=0
  preparar_cenario
  "$nome"
  if [ "$FALHA_ATUAL" -eq 0 ]; then
    echo "  ✓ $nome"
  else
    FALHAS=$((FALHAS + 1))
    echo "  ✗ $nome"
    while IFS= read -r linha; do
      echo "      | $linha"
    done <<< "$SAIDA"
  fi
}

sem_commits_novos_nao_reconstroi_e_sobe_servicos() {
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "nenhum build" docker_nao_executou_build
  verificar "up -d executado" docker_executou "compose -f docker-compose.prod.yml up -d --remove-orphans"
  verificar "prune executado" docker_executou "image prune -f"
}

alteracao_somente_no_frontend_reconstroi_apenas_web() {
  commitar frontend/src/App.vue > /dev/null
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "build web" docker_executou "compose -f docker-compose.prod.yml build web"
  verificar "sem build api" bash -c "! grep -q 'build.*api' '$LOG_DOCKER'"
}

alteracao_somente_no_backend_reconstroi_apenas_api() {
  commitar backend/src/Programa.cs > /dev/null
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "build api" docker_executou "compose -f docker-compose.prod.yml build api"
}

alteracao_em_backend_e_frontend_reconstroi_ambos() {
  commitar backend/src/Programa.cs > /dev/null
  commitar frontend/src/App.vue > /dev/null
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "build api web" docker_executou "compose -f docker-compose.prod.yml build api web"
}

alteracao_no_vhost_do_host_avisa_sem_build() {
  commitar infra/nginx/casamento.conf.template > /dev/null
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "aviso de reaplicação do vhost" grep -q "aplique a diferença à mão" <<< "$SAIDA"
  verificar "nenhum build" docker_nao_executou_build
}

alteracao_fora_de_backend_frontend_nao_reconstroi() {
  commitar README.md > /dev/null
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "nenhum build" docker_nao_executou_build
  verificar "up -d executado" docker_executou "compose -f docker-compose.prod.yml up -d --remove-orphans"
}

opcao_completo_reconstroi_tudo_com_pull() {
  executar_deploy --completo
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "build --pull" docker_executou "compose -f docker-compose.prod.yml build --pull"
}

sha_informado_avanca_somente_ate_ele() {
  local primeiro
  primeiro=$(commitar backend/a.cs)
  commitar backend/b.cs > /dev/null
  executar_deploy "$primeiro"
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "HEAD no SHA informado" [ "$(head_vps)" = "$primeiro" ]
}

sha_anterior_ao_publicado_e_no_op() {
  local antigo novo
  antigo=$(git -C "$DESENVOLVIMENTO" rev-parse HEAD)
  novo=$(commitar backend/a.cs)
  executar_deploy "$novo"
  : > "$LOG_DOCKER"
  executar_deploy "$antigo"
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "HEAD permanece no mais novo" [ "$(head_vps)" = "$novo" ]
  verificar "nenhum build" docker_nao_executou_build
}

sha_fora_da_main_e_recusado() {
  git -C "$DESENVOLVIMENTO" checkout --quiet -b paralela
  local sha_paralelo
  sha_paralelo=$(commitar backend/malicioso.cs)
  local antes
  antes=$(head_vps)
  executar_deploy "$sha_paralelo"
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "HEAD inalterado" [ "$(head_vps)" = "$antes" ]
  verificar "nenhuma chamada ao docker" [ ! -s "$LOG_DOCKER" ]
}

argumento_invalido_e_recusado() {
  executar_deploy "main; rm -rf /"
  verificar "código de saída 2" [ "$CODIGO" -eq 2 ]
  verificar "nenhuma chamada ao docker" [ ! -s "$LOG_DOCKER" ]
}

health_check_falhando_retorna_erro() {
  commitar backend/a.cs > /dev/null
  CURL_CODIGO=7 executar_deploy
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "mensagem de falha" grep -q "não respondeu após 45 tentativas" <<< "$SAIDA"
  verificar "45 tentativas" [ "$(wc -l < "$LOG_CURL")" -eq 45 ]
  verificar "sem prune após falha" bash -c "! grep -q 'image prune' '$LOG_DOCKER'"
}

health_check_usa_dominio_do_env() {
  executar_deploy
  verificar "curl com --resolve e URL de saúde" grep -q -- "--resolve casamento.teste:443:127.0.0.1 https://casamento.teste/api/saude" "$LOG_CURL"
}

env_ausente_e_recusado() {
  rm "$VPS/.env"
  executar_deploy
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "mensagem de .env" grep -q ".env não encontrado" <<< "$SAIDA"
}

dominio_ausente_e_recusado() {
  echo "POSTGRES_DB=casamento" > "$VPS/.env"
  executar_deploy
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "mensagem de DOMINIO" grep -q "DOMINIO não definido" <<< "$SAIDA"
}

dominio_com_aspas_e_crlf_e_normalizado() {
  printf 'DOMINIO="casamento.teste"\r\n' > "$VPS/.env"
  executar_deploy
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "domínio sem aspas" grep -q "https://casamento.teste/api/saude" "$LOG_CURL"
}

alteracao_local_divergente_aborta() {
  echo "editado na vps" >> "$VPS/backend/api.txt"
  commitar backend/api.txt > /dev/null
  local antes
  antes=$(head_vps)
  executar_deploy
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "HEAD inalterado" [ "$(head_vps)" = "$antes" ]
  verificar "nenhuma chamada ao docker" [ ! -s "$LOG_DOCKER" ]
}

echo "deploy.sh"
caso sem_commits_novos_nao_reconstroi_e_sobe_servicos
caso alteracao_somente_no_frontend_reconstroi_apenas_web
caso alteracao_somente_no_backend_reconstroi_apenas_api
caso alteracao_em_backend_e_frontend_reconstroi_ambos
caso alteracao_no_vhost_do_host_avisa_sem_build
caso alteracao_fora_de_backend_frontend_nao_reconstroi
caso opcao_completo_reconstroi_tudo_com_pull
caso sha_informado_avanca_somente_ate_ele
caso sha_anterior_ao_publicado_e_no_op
caso sha_fora_da_main_e_recusado
caso argumento_invalido_e_recusado
caso health_check_falhando_retorna_erro
caso health_check_usa_dominio_do_env
caso env_ausente_e_recusado
caso dominio_ausente_e_recusado
caso dominio_com_aspas_e_crlf_e_normalizado
caso alteracao_local_divergente_aborta

echo
echo "$((TOTAL - FALHAS))/$TOTAL cenários passaram"
[ "$FALHAS" -eq 0 ]
