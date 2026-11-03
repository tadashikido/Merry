export interface RotaResolvida {
  name?: unknown
  params: Record<string, unknown>
}

export function lerEstadoAnterior(estado: unknown = window.history.state): unknown {
  return typeof estado === 'object' && estado !== null && 'back' in estado ? estado.back : null
}

export function origemInterna<T extends string>(
  anterior: unknown,
  eventoId: string,
  resolver: (caminho: string) => RotaResolvida,
  permitidas: readonly T[],
  padrao: T,
): T {
  if (typeof anterior !== 'string' || !anterior.startsWith('/') || anterior.startsWith('//')) {
    return padrao
  }
  try {
    const rota = resolver(anterior)
    const permitida = permitidas.find((nome) => nome === rota.name)
    return permitida !== undefined && rota.params.id === eventoId ? permitida : padrao
  } catch {
    return padrao
  }
}
