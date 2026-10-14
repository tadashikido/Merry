export function destinoSeguro(valor: unknown): string | null {
  const texto = Array.isArray(valor) ? valor[0] : valor
  if (typeof texto !== 'string' || texto.length === 0 || texto.length > 2048) {
    return null
  }
  if (!texto.startsWith('/') || texto.startsWith('//') || texto.startsWith('/\\') || texto.includes('\\')) {
    return null
  }
  return texto
}
