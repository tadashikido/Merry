#!/usr/bin/env bash

set -uo pipefail

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIRETORIO_FRONTEND="$RAIZ_REPOSITORIO/frontend"
IMAGEM_BASE="busybox:1.37"
IMAGEM_CONTEXTO="teste-contexto-web-$$"
FALHAS=0

caminho_docker() {
  if command -v cygpath > /dev/null; then cygpath -w "$1"; else echo "$1"; fi
}

limpar() {
  docker rmi -f "$IMAGEM_CONTEXTO" > /dev/null 2>&1
}
trap limpar EXIT

export MSYS_NO_PATHCONV=1

falhar() {
  echo "FALHOU: $1"
  FALHAS=$((FALHAS + 1))
}

passar() {
  echo "ok: $1"
}

if ! printf 'FROM %s\nCOPY . /contexto\n' "$IMAGEM_BASE" \
  | docker build --quiet --file - --tag "$IMAGEM_CONTEXTO" "$(caminho_docker "$DIRETORIO_FRONTEND")" > /dev/null; then
  echo "FALHOU: não foi possível montar o contexto Docker de frontend/"
  exit 1
fi

CONTEUDO_CONTEXTO="$(docker run --rm "$IMAGEM_CONTEXTO" ls -A /contexto)"

existe_no_contexto() {
  grep -qxF "$1" <<< "$CONTEUDO_CONTEXTO"
}

REFERENCIAS="$(sed -n 's/.*"path"[[:space:]]*:[[:space:]]*"\.\/\([^"]*\)".*/\1/p' "$DIRETORIO_FRONTEND/tsconfig.json")"

if [ -z "$REFERENCIAS" ]; then
  falhar "nenhuma referência encontrada em frontend/tsconfig.json"
fi

while IFS= read -r referencia; do
  [ -z "$referencia" ] && continue
  if existe_no_contexto "$referencia"; then
    passar "referência $referencia presente no contexto"
  else
    falhar "referência $referencia do tsconfig.json excluída do contexto Docker"
  fi
done <<< "$REFERENCIAS"

for obrigatorio in tsconfig.json package.json package-lock.json index.html vite.config.ts src public nginx; do
  if existe_no_contexto "$obrigatorio"; then
    passar "$obrigatorio presente no contexto"
  else
    falhar "$obrigatorio ausente do contexto Docker"
  fi
done

for proibido in e2e playwright.config.ts node_modules dist coverage playwright-report test-results blob-report .env .env.local .env.production; do
  if existe_no_contexto "$proibido"; then
    falhar "$proibido não deveria entrar no contexto Docker"
  else
    passar "$proibido fora do contexto"
  fi
done

if [ "$FALHAS" -gt 0 ]; then
  echo "$FALHAS verificação(ões) falharam"
  exit 1
fi

echo "contexto Docker do frontend válido"
