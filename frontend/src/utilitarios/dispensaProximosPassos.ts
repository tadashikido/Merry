export const CHAVE_DISPENSA_PROXIMOS_PASSOS = 'nossia:proximos-passos-dispensados'

const LIMITE_DISPENSAS = 200

function lerDispensados(): string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)
    if (!bruto) {
      return []
    }
    const valor: unknown = JSON.parse(bruto)
    return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
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
