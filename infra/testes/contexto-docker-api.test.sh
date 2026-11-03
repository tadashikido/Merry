#!/usr/bin/env bash

set -uo pipefail

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIRETORIO_BACKEND="$RAIZ_REPOSITORIO/backend"
DOCKERFILE_API="$DIRETORIO_BACKEND/src/Celebri.Api/Dockerfile"
IMAGEM_BASE="busybox:1.37"
IMAGEM_CONTEXTO="teste-contexto-api-$$"
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
  | docker build --quiet --file - --tag "$IMAGEM_CONTEXTO" "$(caminho_docker "$DIRETORIO_BACKEND")" > /dev/null; then
  echo "FALHOU: não foi possível montar o contexto Docker de backend/"
  exit 1
fi

CONTEUDO_CONTEXTO="$(docker run --rm "$IMAGEM_CONTEXTO" sh -c 'cd /contexto && find . -mindepth 1 | sed "s|^\./||"')"

existe_no_contexto() {
  grep -qxF "$1" <<< "$CONTEUDO_CONTEXTO"
}

PROJETOS="$(sed -n 's|^COPY[[:space:]]\{1,\}\(src/[^[:space:]]*\.csproj\)[[:space:]].*|\1|p' "$DOCKERFILE_API")"

if [ -z "$PROJETOS" ]; then
  falhar "nenhum projeto encontrado no Dockerfile da api"
fi

while IFS= read -r projeto; do
  [ -z "$projeto" ] && continue
  if existe_no_contexto "$projeto"; then
    passar "projeto $projeto presente no contexto"
  else
    falhar "projeto $projeto do Dockerfile ausente do contexto Docker"
  fi
done <<< "$PROJETOS"

for obrigatorio in Celebri.sln Directory.Build.props Directory.Packages.props src src/Celebri.Api/Program.cs src/Celebri.Api/appsettings.json; do
  if existe_no_contexto "$obrigatorio"; then
    passar "$obrigatorio presente no contexto"
  else
    falhar "$obrigatorio ausente do contexto Docker"
  fi
done

for proibido in tests .vs .env .env.local .env.production; do
  if existe_no_contexto "$proibido"; then
    falhar "$proibido não deveria entrar no contexto Docker"
  else
    passar "$proibido fora do contexto"
  fi
done

for diretorio in bin obj TestResults; do
  encontrados="$(grep -E "(^|/)$diretorio(/|$)" <<< "$CONTEUDO_CONTEXTO" | head -n 3)"
  if [ -n "$encontrados" ]; then
    falhar "$diretorio/ não deveria entrar no contexto Docker: $(tr '\n' ' ' <<< "$encontrados")"
  else
    passar "nenhum $diretorio/ no contexto"
  fi
done

if [ "$FALHAS" -gt 0 ]; then
  echo "$FALHAS verificação(ões) falharam"
  exit 1
fi

echo "contexto Docker da api válido"
