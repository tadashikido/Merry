import { vi } from 'vitest'

type OuvinteMidia = (evento: MediaQueryListEvent) => void

export interface MidiaSimulada {
  definirTelaPequena: (pequena: boolean) => void
}

export function simularMatchMedia(telaPequenaInicial: boolean): MidiaSimulada {
  let telaPequena = telaPequenaInicial
  const ouvintes = new Set<OuvinteMidia>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => ({
      get matches() {
        return telaPequena
      },
      media: consulta,
      onchange: null,
      addEventListener: (_tipo: string, ouvinte: OuvinteMidia) => ouvintes.add(ouvinte),
      removeEventListener: (_tipo: string, ouvinte: OuvinteMidia) => ouvintes.delete(ouvinte),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )

  return {
    definirTelaPequena(pequena: boolean) {
      telaPequena = pequena
      ouvintes.forEach((ouvinte) => ouvinte({ matches: pequena } as MediaQueryListEvent))
    },
  }
}
