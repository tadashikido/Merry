export const CHAVE_DISPENSA_PROXIMOS_PASSOS = 'celebri:proximos-passos-dispensados'
export const CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA = 'nossia:proximos-passos-dispensados'

const LIMITE_DISPENSAS = 200

function interpretar(bruto: string | null): string[] {
  if (!bruto) {
    return []
  }
  try {
    const valor: unknown = JSON.parse(bruto)
    return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function migrarChaveLegada(): void {
  const brutoLegado = window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA)
  if (brutoLegado === null) {
    return
  }
  const legados = interpretar(brutoLegado)
  const atuais = interpretar(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS))
  const unidos = [...legados.filter((id) => !atuais.includes(id)), ...atuais].slice(-LIMITE_DISPENSAS)
  if (unidos.length > 0) {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS, JSON.stringify(unidos))
  }
  window.localStorage.removeItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA)
}

function lerDispensados(): string[] {
  try {
    migrarChaveLegada()
    return interpretar(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS))
  } catch {
    return []
  }
}

export function estaDispensado(casamentoId: string): boolean {
  return lerDispensados().includes(casamentoId)
}

export function registrarDispensa(casamentoId: string): void {
  try {
    const atuais = lerDispensados().filter((id) => id !== casamentoId)
    const proximos = [...atuais, casamentoId].slice(-LIMITE_DISPENSAS)
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS, JSON.stringify(proximos))
  } catch {
    return
  }
}
