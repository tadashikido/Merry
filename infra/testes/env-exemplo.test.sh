#!/usr/bin/env bash

set -uo pipefail

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXEMPLO_PRODUCAO=".env.production.example"
SEGREDOS_PRODUCAO=(POSTGRES_PASSWORD JWT_CHAVE_ASSINATURA DADOS_SENSIVEIS_CHAVE DADOS_SENSIVEIS_CHAVE_ANTERIOR SMTP_SENHA)
FALHAS=0

falhar() {
  echo "FALHOU: $1"
  FALHAS=$((FALHAS + 1))
}

passar() {
  echo "ok: $1"
}

limpar_valor() {
  local valor="${1%$'\r'}"
  valor="${valor#\"}"
  valor="${valor%\"}"
  valor="${valor#\'}"
  valor="${valor%\'}"
  printf '%s' "$valor"
}

valor_suspeito() {
  local valor
  valor="$(limpar_valor "$1")"
  [ -z "$valor" ] && return 1

  if [[ "$valor" =~ -----BEGIN ]] \
    || [[ "$valor" =~ AKIA[0-9A-Z]{16} ]] \
    || [[ "$valor" =~ ^(ghp_|gho_|ghs_|github_pat_|sk-|xox[abpr]-|SG\.) ]]; then
    return 0
  fi

  if [[ "$valor" =~ ^[0-9a-fA-F]{32,}$ ]]; then
    return 0
  fi

  if [[ "$valor" =~ ^[A-Za-z0-9+/_-]{32,}={0,2}$ ]] \
    && [[ "$valor" =~ [A-Z] ]] && [[ "$valor" =~ [a-z] ]]; then
    return 0
  fi

  return 1
}

nome_de_segredo() {
  [[ "$1" =~ (PASSWORD|SENHA|CHAVE|SECRET|TOKEN|KEY) ]]
}

variaveis_suspeitas() {
  local arquivo="$1" linha nome valor
  while IFS= read -r linha || [ -n "$linha" ]; do
    linha="${linha%$'\r'}"
    [[ "$linha" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$linha" == *=* ]] || continue
    nome="${linha%%=*}"
    nome="${nome#export }"
    valor="${linha#*=}"
    if valor_suspeito "$valor"; then
      echo "$nome"
    fi
  done < "$arquivo"
}

valor_da_variavel() {
  grep -E "^$2=" "$1" | tail -n 1 | cut -d= -f2-
}

esperar_suspeito() {
  if valor_suspeito "$2"; then passar "detecta $1"; else falhar "não detectou $1"; fi
}

esperar_inofensivo() {
  if valor_suspeito "$2"; then falhar "acusou $1 como segredo"; else passar "aceita $1"; fi
}

aleatorio() {
  openssl rand "$@" | tr -d '\r\n'
}

BASE64_ALEATORIO="$(aleatorio -base64 32)"
CRLF=$'\r'

esperar_suspeito "hexadecimal de 32 bytes" "$(aleatorio -hex 32)"
esperar_suspeito "hexadecimal de 16 bytes" "$(aleatorio -hex 16)"
esperar_suspeito "Base64 de 32 bytes" "$BASE64_ALEATORIO"
esperar_suspeito "Base64 de 48 bytes" "$(aleatorio -base64 48)"
esperar_suspeito "Base64 entre aspas" "\"${BASE64_ALEATORIO}\""
esperar_suspeito "Base64 com CRLF" "${BASE64_ALEATORIO}${CRLF}"
esperar_suspeito "Base64 URL-safe" "$(aleatorio -base64 33 | tr '+/' '-_')"
esperar_suspeito "chave privada PEM" "-----BEGIN PRIVATE KEY-----"
esperar_suspeito "chave de acesso AWS" "AKIA$(aleatorio -hex 8 | tr 'a-f' 'A-F')"
esperar_suspeito "token do GitHub" "ghp_$(aleatorio -hex 18)"
esperar_suspeito "chave da SendGrid" "SG.$(aleatorio -hex 11).$(aleatorio -hex 22)"

esperar_inofensivo "valor vazio" ""
esperar_inofensivo "porta" "5432"
esperar_inofensivo "booleano" "true"
esperar_inofensivo "domínio de exemplo" "celebri.exemplo.com.br"
esperar_inofensivo "e-mail de exemplo" "nao-responda@celebri.exemplo.com.br"
esperar_inofensivo "frase de desenvolvimento com hífens" "chave-de-desenvolvimento-local-nao-usar-em-producao-2026"
esperar_inofensivo "nome de banco" "casamento"

cd "$RAIZ_REPOSITORIO" || exit 1

EXEMPLOS="$(git ls-files -- '.env*.example' '*/.env*.example' 2> /dev/null)"

if [ -z "$EXEMPLOS" ]; then
  falhar "nenhum arquivo .env*.example versionado encontrado"
fi

if ! grep -qxF "$EXEMPLO_PRODUCAO" <<< "$EXEMPLOS"; then
  falhar "$EXEMPLO_PRODUCAO não está versionado"
fi

while IFS= read -r arquivo; do
  [ -z "$arquivo" ] && continue
  suspeitas="$(variaveis_suspeitas "$arquivo")"
  if [ -z "$suspeitas" ]; then
    passar "$arquivo sem valor com aparência de segredo real"
  else
    while IFS= read -r nome; do
      falhar "$arquivo: $nome tem valor com aparência de segredo real (troque por vazio e gere o segredo fora do repositório)"
    done <<< "$suspeitas"
  fi
done <<< "$EXEMPLOS"

if [ -f "$EXEMPLO_PRODUCAO" ]; then
  for nome in "${SEGREDOS_PRODUCAO[@]}"; do
    if ! grep -qE "^$nome=" "$EXEMPLO_PRODUCAO"; then
      falhar "$EXEMPLO_PRODUCAO não declara $nome"
    elif [ -n "$(limpar_valor "$(valor_da_variavel "$EXEMPLO_PRODUCAO" "$nome")")" ]; then
      falhar "$EXEMPLO_PRODUCAO: $nome deve ficar vazio no exemplo"
    else
      passar "$EXEMPLO_PRODUCAO: $nome vazio"
    fi
  done

  while IFS= read -r linha; do
    linha="${linha%$'\r'}"
    nome="${linha%%=*}"
    nome_de_segredo "$nome" || continue
    [[ " ${SEGREDOS_PRODUCAO[*]} " == *" $nome "* ]] && continue
    if [ -n "$(limpar_valor "${linha#*=}")" ]; then
      falhar "$EXEMPLO_PRODUCAO: $nome parece segredo e deve ficar vazio no exemplo"
    fi
  done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$EXEMPLO_PRODUCAO")
fi

if command -v docker > /dev/null && docker compose version > /dev/null 2>&1; then
  if saida_compose="$(env -u POSTGRES_PASSWORD -u JWT_CHAVE_ASSINATURA -u DADOS_SENSIVEIS_CHAVE \
    docker compose -f docker-compose.prod.yml --env-file "$EXEMPLO_PRODUCAO" config --quiet 2>&1)"; then
    falhar "o compose de produção aceitou o $EXEMPLO_PRODUCAO sem segredos preenchidos"
  elif grep -qE "defina (POSTGRES_PASSWORD|JWT_CHAVE_ASSINATURA|DADOS_SENSIVEIS_CHAVE)" <<< "$saida_compose"; then
    passar "o compose de produção recusa o $EXEMPLO_PRODUCAO sem segredos preenchidos"
  else
    falhar "o compose de produção falhou por outro motivo que não a falta de segredo"
  fi
else
  echo "aviso: docker compose indisponível; verificação do compose ignorada"
fi

if [ "$FALHAS" -gt 0 ]; then
  echo "$FALHAS verificação(ões) falharam"
  exit 1
fi

echo "todas as verificações passaram"
