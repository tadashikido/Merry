#!/usr/bin/env bash

set -euo pipefail

readonly CANDIDATOS_PADRAO="/var/www/celebri:/var/www/merry"

falhar() {
  echo "❌ $1" >&2
  exit "${2:-1}"
}

principal() {
  local diretorio=${1:-}
  local commit=${2:-}

  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || falhar "Commit inválido: '$commit'. Informe um SHA de 40 caracteres." 2

  if [ -n "$diretorio" ]; then
    [[ "$diretorio" =~ ^(/[A-Za-z0-9._-]+)+$ ]] || falhar "VPS_DIRETORIO inválido: '$diretorio'. Use um caminho absoluto." 2
  else
    local candidatos candidato
    IFS=: read -r -a candidatos <<< "${DIRETORIOS_CANDIDATOS:-$CANDIDATOS_PADRAO}"
    for candidato in "${candidatos[@]}"; do
      if [ -f "$candidato/deploy.sh" ]; then
        diretorio=$candidato
        break
      fi
    done
    [ -n "$diretorio" ] || falhar "deploy.sh não encontrado em ${DIRETORIOS_CANDIDATOS:-$CANDIDATOS_PADRAO}. Defina a variável VPS_DIRETORIO."
  fi

  [ -f "$diretorio/deploy.sh" ] || falhar "deploy.sh não encontrado em $diretorio"

  echo "📂 Diretório da aplicação: $diretorio"
  exec bash "$diretorio/deploy.sh" "$commit" < /dev/null
}

principal "$@"
