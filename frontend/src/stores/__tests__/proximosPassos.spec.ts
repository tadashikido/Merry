import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoProximosPassos, useProximosPassosStore } from '@/stores/proximosPassos'
import type { ProximosPassosCasamentoDto } from '@/tipos/proximosPassos'

const ID = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'

function passos(dados: Partial<ProximosPassosCasamentoDto> = {}): ProximosPassosCasamentoDto {
  return {
    casalConvidado: false,
    checklistAplicado: false,
    convidadosCadastrados: false,
    convitesEnviados: false,
    todosConcluidos: false,
    ...dados,
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useProximosPassosStore', () => {
  it('[UNITÁRIO] monta a rota codificando o identificador', () => {
    expect(caminhoProximosPassos(ID)).toBe(`/api/casamentos/${ID}/proximos-passos`)
    expect(caminhoProximosPassos('a/b')).toBe('/api/casamentos/a%2Fb/proximos-passos')
  })

  it('[UNITÁRIO] carrega os passos do casamento com uma única requisição', async () => {
    const store = useProximosPassosStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(passos({ casalConvidado: true })))

    await store.carregar(ID)

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`/api/casamentos/${ID}/proximos-passos`)
    expect(store.casamentoId).toBe(ID)
    expect(store.passos?.casalConvidado).toBe(true)
    expect(store.carregando).toBe(false)
    expect(store.falha).toBeNull()
  })

  it('[UNITÁRIO] erro de serviço limpa os passos e registra a falha', async () => {
    const store = useProximosPassosStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(500))

    await store.carregar(ID)

    expect(store.passos).toBeNull()
    expect(store.falha?.tipo).toBe('inesperado')
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] erro de rede vira falha de conexão', async () => {
    const store = useProximosPassosStore()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar(ID)

    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[SEGURANÇA] 403 e 404 são interpretados como sem permissão e não encontrado', async () => {
    const store = useProximosPassosStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(403)).mockResolvedValueOnce(respostaProblema(404))

    await store.carregar(ID)
    expect(store.falha?.tipo).toBe('semPermissao')

    await store.carregar(ID)
    expect(store.falha?.tipo).toBe('naoEncontrado')
  })

  it('[UNITÁRIO] resposta atrasada de outro casamento não sobrescreve o atual', async () => {
    const store = useProximosPassosStore()
    let resolverPrimeira: (resposta: Response) => void = () => {}
    fetchSimulado
      .mockImplementationOnce(() => new Promise<Response>((resolver) => { resolverPrimeira = resolver }))
      .mockResolvedValueOnce(respostaJson(passos({ convitesEnviados: true })))

    const primeira = store.carregar(ID)
    await store.carregar(OUTRO)
    resolverPrimeira(respostaJson(passos({ casalConvidado: true })))
    await primeira

    expect(store.casamentoId).toBe(OUTRO)
    expect(store.passos?.convitesEnviados).toBe(true)
    expect(store.passos?.casalConvidado).toBe(false)
  })

  it('[UNITÁRIO] limpar zera o estado', async () => {
    const store = useProximosPassosStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(passos()))
    await store.carregar(ID)

    store.limpar()

    expect(store.casamentoId).toBeNull()
    expect(store.passos).toBeNull()
    expect(store.falha).toBeNull()
  })
})
