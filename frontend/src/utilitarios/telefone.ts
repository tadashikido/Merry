const DIGITOS_MINIMOS = 10
const DIGITOS_MAXIMOS = 15
const TAMANHO_MAXIMO_ENTRADA = 30
const PADRAO_CARACTERES_PERMITIDOS = /^\+?[\d\s().-]*$/

export const LIMITES_TELEFONE = {
  digitosMinimos: DIGITOS_MINIMOS,
  digitosMaximos: DIGITOS_MAXIMOS,
  tamanhoMaximoEntrada: TAMANHO_MAXIMO_ENTRADA,
} as const

export function normalizarTelefone(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  if (texto === '') {
    return null
  }
  const digitos = texto.replace(/\D/g, '')
  return texto.startsWith('+') ? `+${digitos}` : digitos
}

export function telefoneValido(valor: string | null | undefined): boolean {
  const texto = (valor ?? '').trim()
  if (texto === '') {
    return true
  }
  if (texto.length > TAMANHO_MAXIMO_ENTRADA || !PADRAO_CARACTERES_PERMITIDOS.test(texto)) {
    return false
  }
  const quantidade = texto.replace(/\D/g, '').length
  return quantidade >= DIGITOS_MINIMOS && quantidade <= DIGITOS_MAXIMOS
}

function formatarNacional(digitos: string): string {
  const ddd = digitos.slice(0, 2)
  const numero = digitos.slice(2)
  const divisao = numero.length - 4
  return `(${ddd}) ${numero.slice(0, divisao)}-${numero.slice(divisao)}`
}

export function formatarTelefone(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim()
  if (texto === '') {
    return ''
  }
  const digitos = texto.replace(/\D/g, '')
  const internacional = texto.startsWith('+')

  if (!internacional && (digitos.length === 10 || digitos.length === 11)) {
    return formatarNacional(digitos)
  }
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return `+55 ${formatarNacional(digitos.slice(2))}`
  }
  return internacional ? `+${digitos}` : digitos
}
