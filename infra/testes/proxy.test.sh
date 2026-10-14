#!/usr/bin/env bash

set -uo pipefail

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGEM_NGINX_CONTAINER="nginxinc/nginx-unprivileged:1.27-alpine"
IMAGEM_NGINX_HOST="nginx:1.27-alpine"
IMAGEM_CURL="curlimages/curl:8.11.1"
IMAGEM_PYTHON="python:3.12-alpine"
DOMINIO_TESTE="casamento.teste"
IP_BORDA="192.168.250.30"
PREFIXO="teste-proxy-$$"
REDE_INTERNA="$PREFIXO-interna"
REDE_EXTERNA="$PREFIXO-externa"
DIRETORIO_TEMPORARIO="$(mktemp -d)"

caminho_docker() {
  if command -v cygpath > /dev/null; then cygpath -w "$1"; else echo "$1"; fi
}

limpar() {
  docker rm -f "$PREFIXO-api-1" "$PREFIXO-api-2" "$PREFIXO-web" "$PREFIXO-borda" > /dev/null 2>&1
  docker network rm "$REDE_INTERNA" "$REDE_EXTERNA" > /dev/null 2>&1
  rm -rf "$DIRETORIO_TEMPORARIO"
}
trap limpar EXIT

export MSYS_NO_PATHCONV=1

mkdir -p "$DIRETORIO_TEMPORARIO/eco" "$DIRETORIO_TEMPORARIO/borda" "$DIRETORIO_TEMPORARIO/certificado"
cat > "$DIRETORIO_TEMPORARIO/eco/eco.py" <<'PYTHON'
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Eco(BaseHTTPRequestHandler):
    def responder(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        restante = tamanho
        while restante > 0:
            bloco = self.rfile.read(min(restante, 65536))
            if not bloco:
                break
            restante -= len(bloco)
        corpo = (
            f"xff={self.headers.get('X-Forwarded-For', '')} "
            f"proto={self.headers.get('X-Forwarded-Proto', '')} "
            f"uri={self.path} tamanho={tamanho}"
        ).encode()
        self.send_response(200)
        self.send_header("Strict-Transport-Security", "max-age=1")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    do_GET = responder
    do_POST = responder


ThreadingHTTPServer(("", 8080), Eco).serve_forever()
PYTHON

sed -e "s/\${DOMINIO}/$DOMINIO_TESTE/g" \
  -e "s/127\.0\.0\.1:\${WEB_PORTA}/web:8080/" \
  -e "/server_name/a\\    listen 443 ssl;" \
  -e "/server_name/a\\    ssl_certificate /etc/letsencrypt/live/$DOMINIO_TESTE/fullchain.pem;" \
  -e "/server_name/a\\    ssl_certificate_key /etc/letsencrypt/live/$DOMINIO_TESTE/privkey.pem;" \
  "$RAIZ_REPOSITORIO/infra/nginx/casamento.conf.template" > "$DIRETORIO_TEMPORARIO/borda/casamento.conf"
cat >> "$DIRETORIO_TEMPORARIO/borda/casamento.conf" <<NGINX

server {
    if (\$host = $DOMINIO_TESTE) {
        return 301 https://\$host\$request_uri;
    }
    listen 80;
    server_name $DOMINIO_TESTE;
    return 404;
}
NGINX
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$DOMINIO_TESTE" \
  -keyout "$(caminho_docker "$DIRETORIO_TEMPORARIO/certificado/privkey.pem")" \
  -out "$(caminho_docker "$DIRETORIO_TEMPORARIO/certificado/fullchain.pem")" > /dev/null 2>&1

ECO="$(caminho_docker "$DIRETORIO_TEMPORARIO/eco")"
VHOST_BORDA="$(caminho_docker "$DIRETORIO_TEMPORARIO/borda/casamento.conf")"
CERTIFICADO="$(caminho_docker "$DIRETORIO_TEMPORARIO/certificado")"
NGINX_CONF="$(caminho_docker "$RAIZ_REPOSITORIO/frontend/nginx/default.conf")"
NGINX_CABECALHOS="$(caminho_docker "$RAIZ_REPOSITORIO/frontend/nginx/cabecalhos-seguranca.conf")"

docker network create --subnet 10.214.0.0/24 "$REDE_INTERNA" > /dev/null
docker network create --subnet 192.168.250.0/24 "$REDE_EXTERNA" > /dev/null

subir_api() {
  docker run -d --name "$1" --network "$REDE_INTERNA" --network-alias api \
    -v "$ECO:/eco:ro" "$IMAGEM_PYTHON" python -u /eco/eco.py > /dev/null
}

subir_api "$PREFIXO-api-1"
docker run -d --name "$PREFIXO-web" --network "$REDE_INTERNA" --network-alias web \
  -v "$NGINX_CONF:/etc/nginx/conf.d/default.conf:ro" \
  -v "$NGINX_CABECALHOS:/etc/nginx/snippets/cabecalhos-seguranca.conf:ro" \
  "$IMAGEM_NGINX_CONTAINER" > /dev/null
docker network connect --ip 192.168.250.20 "$REDE_EXTERNA" "$PREFIXO-web"

curl_em() {
  local rede=$1 ip=$2
  shift 2
  docker run --rm --network "$rede" --ip "$ip" "$IMAGEM_CURL" -s -m 30 "$@" 2>&1
}

curl_na_borda() {
  docker run --rm --network "$REDE_EXTERNA" --ip 192.168.250.60 "$IMAGEM_CURL" -s -k -m 30 \
    --resolve "$DOMINIO_TESTE:443:$IP_BORDA" --resolve "$DOMINIO_TESTE:80:$IP_BORDA" "$@" 2>&1
}

enviar_arquivo() {
  local megabytes=$1 url=$2
  docker run --rm --network "$REDE_EXTERNA" --ip 192.168.250.61 --entrypoint sh "$IMAGEM_CURL" -c \
    "head -c $((megabytes * 1024 * 1024)) /dev/zero > /tmp/arquivo && curl -s -k -m 60 --resolve $DOMINIO_TESTE:443:$IP_BORDA -w ' status=%{http_code}' --data-binary @/tmp/arquivo $url" 2>&1
}

aguardar() {
  local url=$1 rede=$2 _
  for _ in $(seq 1 30); do
    if curl_em "$rede" "$3" -k --resolve "$DOMINIO_TESTE:443:$IP_BORDA" "$url" | grep -q "proto="; then
      return 0
    fi
    sleep 1
  done
  return 1
}

TOTAL=0
FALHAS=0

registrar() {
  local nome=$1 sucesso=$2 detalhe=$3
  TOTAL=$((TOTAL + 1))
  if [ "$sucesso" = sim ]; then
    echo "  ✓ $nome"
  else
    FALHAS=$((FALHAS + 1))
    echo "  ✗ $nome"
    echo "      $detalhe"
  fi
}

afirmar_contem() {
  local nome=$1 obtido=$2 esperado=$3
  if grep -qF -- "$esperado" <<< "$obtido"; then
    registrar "$nome" sim ""
  else
    registrar "$nome" nao "esperado: $esperado | obtido: $obtido"
  fi
}

echo "proxy (nginx do host com TLS do certbot → nginx do container → api)"

if ! aguardar http://web:8080/api/pronto "$REDE_INTERNA" 10.214.0.40; then
  echo "  ✗ container web não ficou pronto"
  exit 1
fi

docker run -d --name "$PREFIXO-borda" --network "$REDE_INTERNA" \
  -v "$VHOST_BORDA:/etc/nginx/conf.d/default.conf:ro" \
  -v "$CERTIFICADO:/etc/letsencrypt/live/$DOMINIO_TESTE:ro" \
  "$IMAGEM_NGINX_HOST" > /dev/null
docker network connect --ip "$IP_BORDA" "$REDE_EXTERNA" "$PREFIXO-borda"

if ! aguardar "https://$DOMINIO_TESTE/api/pronto" "$REDE_EXTERNA" 192.168.250.40; then
  echo "  ✗ nginx do host não ficou pronto"
  docker logs "$PREFIXO-borda" 2>&1 | tail -5
  exit 1
fi

afirmar_contem "proxy confiável da rede interna repassa IP e proto ao container" \
  "$(curl_em "$REDE_INTERNA" 10.214.0.50 -H "X-Forwarded-For: 203.0.113.7" -H "X-Forwarded-Proto: https" "http://web:8080/api/convidados?pagina=2")" \
  "xff=203.0.113.7 proto=https uri=/api/convidados?pagina=2"

afirmar_contem "cliente fora da rede confiável não consegue forjar IP nem proto" \
  "$(curl_em "$REDE_EXTERNA" 192.168.250.50 -H "X-Forwarded-For: 203.0.113.7" -H "X-Forwarded-Proto: https" http://192.168.250.20:8080/api/x)" \
  "xff=192.168.250.50 proto=http"

afirmar_contem "cadeia completa descarta X-Forwarded-For forjado e entrega https" \
  "$(curl_na_borda -H "X-Forwarded-For: 6.6.6.6" "https://$DOMINIO_TESTE/api/x")" \
  "xff=192.168.250.60 proto=https"

afirmar_contem "upload de 10 MB atravessa a cadeia completa (limite de PDF da API)" \
  "$(enviar_arquivo 10 "https://$DOMINIO_TESTE/api/fornecedores/contrato")" \
  "tamanho=10485760 status=200"

afirmar_contem "upload acima de 11 MB é recusado" \
  "$(enviar_arquivo 12 "https://$DOMINIO_TESTE/api/fornecedores/contrato")" \
  "status=413"

subir_api "$PREFIXO-api-2"
docker rm -f "$PREFIXO-api-1" > /dev/null
sleep 11
afirmar_contem "proxy continua respondendo após recriação do container da api" \
  "$(curl_na_borda "https://$DOMINIO_TESTE/api/saude")" \
  "uri=/api/saude"

echo
echo "$((TOTAL - FALHAS))/$TOTAL cenários passaram"
[ "$FALHAS" -eq 0 ]
