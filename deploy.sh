#!/usr/bin/env bash

set -euo pipefail

readonly ARQUIVO_COMPOSE="docker-compose.prod.yml"
readonly BRANCH_PRODUCAO="main"
readonly TENTATIVAS_SAUDE=45
readonly INTERVALO_SAUDE_SEGUNDOS=2

compose() {
  docker compose -f "$ARQUIVO_COMPOSE" "$@"
}

falhar() {
  echo "❌ $1" >&2
  exit "${2:-1}"
}

ler_variavel_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d "\"'\r" || true
}

alterou() {
  [ -n "$ARQUIVOS_ALTERADOS" ] && printf '%s\n' "$ARQUIVOS_ALTERADOS" | grep -q "$1"
}

aguardar_saude() {
  local dominio=$1
  local url="https://$dominio/api/saude"
  local tentativa

  for tentativa in $(seq 1 "$TENTATIVAS_SAUDE"); do
    if curl -fsS --max-time 5 --resolve "$dominio:443:127.0.0.1" "$url" > /dev/null 2>&1; then
      echo "✅ $url respondeu (tentativa $tentativa)"
      return 0
    fi
    sleep "$INTERVALO_SAUDE_SEGUNDOS"
  done

  compose ps >&2 || true
  compose logs --tail 50 api web >&2 || true
  falhar "$url não respondeu após $TENTATIVAS_SAUDE tentativas"
}

principal() {
  local completo=false
  local alvo="origin/$BRANCH_PRODUCAO"
  local argumento

  for argumento in "$@"; do
    case "$argumento" in
      --completo) completo=true ;;
      *)
        [[ "$argumento" =~ ^[0-9a-f]{40}$ ]] || falhar "Argumento inválido: '$argumento'. Use --completo e/ou um SHA de 40 caracteres." 2
        alvo=$argumento
        ;;
    esac
  done

  cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

  [ -f .env ] || falhar "Arquivo .env não encontrado em $(pwd). Copie .env.production.example e preencha."
  local dominio
  dominio=$(ler_variavel_env DOMINIO)
  [ -n "$dominio" ] || falhar "DOMINIO não definido no .env"

  echo "🚀 Deploy Enlace iniciado ($alvo)"

  local anterior
  anterior=$(git rev-parse HEAD)
  git fetch --quiet origin "$BRANCH_PRODUCAO"
  git merge-base --is-ancestor "$alvo" "origin/$BRANCH_PRODUCAO" \
    || falhar "Commit $alvo não pertence a origin/$BRANCH_PRODUCAO"
  git merge --ff-only --quiet "$alvo" \
    || falhar "Não foi possível avançar por fast-forward; há alterações locais divergentes na VPS"
  local atual
  atual=$(git rev-parse HEAD)

  ARQUIVOS_ALTERADOS=""
  if [ "$anterior" != "$atual" ]; then
    ARQUIVOS_ALTERADOS=$(git diff --name-only "$anterior" "$atual")
    echo "Commits aplicados: ${anterior:0:7}..${atual:0:7}"
  else
    echo "Nenhum commit novo (${atual:0:7})"
  fi

  if [ "$completo" = true ]; then
    echo "Rebuild completo"
    compose build --pull
  else
    local servicos=()
    if alterou '^backend/'; then servicos+=(api); fi
    if alterou '^frontend/'; then servicos+=(web); fi
    if [ "${#servicos[@]}" -gt 0 ]; then
      echo "Rebuild: ${servicos[*]}"
      compose build "${servicos[@]}"
    fi
  fi

  compose up -d --remove-orphans

  if alterou '^infra/nginx/'; then
    echo "⚠️  infra/nginx/casamento.conf.template mudou: aplique a diferença à mão em /etc/nginx/sites-available/casamento.conf (o arquivo foi editado pelo certbot, não o sobrescreva) e rode 'sudo nginx -t && sudo systemctl reload nginx'"
  fi

  aguardar_saude "$dominio"

  docker image prune -f > /dev/null
  docker builder prune -f --filter "until=168h" > /dev/null

  echo "✅ Deploy finalizado (${atual:0:7})"
}

principal "$@"
exit
