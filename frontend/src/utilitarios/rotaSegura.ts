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

const FORMATO_IDENTIFICADOR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function identificadorSeguro(valor: unknown): string | null {
  const texto = Array.isArray(valor) ? valor[0] : valor
  return typeof texto === 'string' && FORMATO_IDENTIFICADOR.test(texto) ? texto : null
}
