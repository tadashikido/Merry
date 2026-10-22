#!/usr/bin/env bash

set -uo pipefail

RAIZ_REPOSITORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$RAIZ_REPOSITORIO/infra/deploy/localizar-deploy.sh"
DIRETORIO_TEMPORARIO="$(mktemp -d)"
trap 'rm -rf "$DIRETORIO_TEMPORARIO"' EXIT

readonly SHA="0123456789abcdef0123456789abcdef01234567"

TOTAL=0
FALHAS=0

preparar_cenario() {
  CENARIO="$DIRETORIO_TEMPORARIO/cenario-$TOTAL"
  NOVO="$CENARIO/www/celebri"
  LEGADO="$CENARIO/www/merry"
  mkdir -p "$CENARIO/www"
  export DIRETORIOS_CANDIDATOS="$NOVO:$LEGADO"
}

criar_deploy() {
  mkdir -p "$1"
  printf '#!/usr/bin/env bash\necho "executado em %s com $1"\n' "$1" > "$1/deploy.sh"
}

executar() {
  SAIDA=$(bash "$SCRIPT" "$@" 2>&1)
  CODIGO=$?
}

verificar() {
  local descricao=$1
  shift
  if "$@"; then
    echo "  ✓ $descricao"
  else
    echo "  ✗ $descricao"
    echo "$SAIDA" | sed 's/^/      /'
    FALHAS=$((FALHAS + 1))
  fi
}

caso() {
  TOTAL=$((TOTAL + 1))
  echo "- $1"
  preparar_cenario
  "$1"
}

somente_legado_usa_diretorio_legado() {
  criar_deploy "$LEGADO"
  executar "" "$SHA"
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "executou o deploy legado" grep -q "executado em $LEGADO com $SHA" <<< "$SAIDA"
}

novo_e_legado_prioriza_novo() {
  criar_deploy "$NOVO"
  criar_deploy "$LEGADO"
  executar "" "$SHA"
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "executou o deploy novo" grep -q "executado em $NOVO com $SHA" <<< "$SAIDA"
}

diretorio_explicito_tem_prioridade() {
  criar_deploy "$NOVO"
  criar_deploy "$CENARIO/outro"
  executar "$CENARIO/outro" "$SHA"
  verificar "código de saída 0" [ "$CODIGO" -eq 0 ]
  verificar "executou o deploy explícito" grep -q "executado em $CENARIO/outro com $SHA" <<< "$SAIDA"
}

nenhum_diretorio_falha_com_orientacao() {
  executar "" "$SHA"
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "orienta definir VPS_DIRETORIO" grep -q "Defina a variável VPS_DIRETORIO" <<< "$SAIDA"
}

diretorio_explicito_sem_deploy_falha() {
  criar_deploy "$LEGADO"
  executar "$CENARIO/inexistente" "$SHA"
  verificar "código de saída 1" [ "$CODIGO" -eq 1 ]
  verificar "não caiu no legado" bash -c '! grep -q "executado em" <<< "$1"' _ "$SAIDA"
}

diretorio_com_caracteres_invalidos_e_recusado() {
  criar_deploy "$LEGADO"
  executar "/var/www/x';rm -rf /" "$SHA"
  verificar "código de saída 2" [ "$CODIGO" -eq 2 ]
  verificar "mensagem de diretório inválido" grep -q "VPS_DIRETORIO inválido" <<< "$SAIDA"
}

commit_invalido_e_recusado() {
  criar_deploy "$LEGADO"
  executar "" "main; reboot"
  verificar "código de saída 2" [ "$CODIGO" -eq 2 ]
  verificar "mensagem de commit inválido" grep -q "Commit inválido" <<< "$SAIDA"
}

echo "localizar-deploy.sh"
caso somente_legado_usa_diretorio_legado
caso novo_e_legado_prioriza_novo
caso diretorio_explicito_tem_prioridade
caso nenhum_diretorio_falha_com_orientacao
caso diretorio_explicito_sem_deploy_falha
caso diretorio_com_caracteres_invalidos_e_recusado
caso commit_invalido_e_recusado

echo
echo "$((TOTAL - FALHAS))/$TOTAL cenários passaram"
[ "$FALHAS" -eq 0 ]
