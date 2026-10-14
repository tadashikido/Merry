export function normalizarParaBusca(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function contemTexto(termo: string, ...valores: (string | null | undefined)[]): boolean {
  const termoNormalizado = normalizarParaBusca(termo)
  if (termoNormalizado === '') {
    return true
  }
  return valores.some((valor) => normalizarParaBusca(valor).includes(termoNormalizado))
}
