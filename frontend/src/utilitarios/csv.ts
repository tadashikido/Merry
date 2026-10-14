export const SEPARADOR_CSV = ';'
export const MARCA_BOM = '\uFEFF'
const QUEBRA_LINHA = '\r\n'
const INICIOS_PERIGOSOS = ['=', '+', '-', '@', '\t', '\r']

export function neutralizarCelula(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return INICIOS_PERIGOSOS.some((inicio) => texto.startsWith(inicio)) ? `'${texto}` : texto
}

function escaparCelula(valor: string): string {
  return /[";\r\n,]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

export function gerarCsv(cabecalho: readonly string[], linhas: readonly (readonly (string | number | null | undefined)[])[]): string {
  const registros = [cabecalho, ...linhas].map((linha) =>
    linha.map((celula) => escaparCelula(neutralizarCelula(celula))).join(SEPARADOR_CSV),
  )
  return `${MARCA_BOM}${registros.join(QUEBRA_LINHA)}${QUEBRA_LINHA}`
}
