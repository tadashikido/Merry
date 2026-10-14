export const CENTAVOS_POR_REAL = 100

export function paraCentavos(valor: number | null | undefined): number {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return 0
  }
  return Math.round(valor * CENTAVOS_POR_REAL)
}

export function deCentavos(centavos: number): number {
  return centavos / CENTAVOS_POR_REAL
}

export function somarCentavos(valores: Array<number | null | undefined>): number {
  return valores.reduce<number>((total, valor) => total + paraCentavos(valor), 0)
}

export function valorEmCentavosValido(centavos: number, minimo: number, maximo: number): boolean {
  return Number.isSafeInteger(centavos) && centavos >= minimo && centavos <= maximo
}

export function temNoMaximoDuasCasas(valor: number): boolean {
  return Number.isFinite(valor) && Math.abs(Math.round(valor * CENTAVOS_POR_REAL) - valor * CENTAVOS_POR_REAL) < 1e-6
}
