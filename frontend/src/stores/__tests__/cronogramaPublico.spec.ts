import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { OUTRO_TOKEN_CRONOGRAMA, TOKEN_CRONOGRAMA, cronogramaPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { ErroApi, registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { interpretarFalhaCronogramaPublico, useCronogramaPublicoStore } from '@/stores/cronogramaPublico'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
  registrarProvedorAutenticacao({ obterToken: () => 'token-da-cerimonialista', renovar: async () => false })
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('store do cronograma público', () => {
  it('[SEGURANÇA] consulta com token no corpo, sem Authorization e sem token na URL', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(cronogramaPublico()))
    const store = useCronogramaPublicoStore()

    await store.consultar(TOKEN_CRONOGRAMA)

    const [url, init] = fetchSimulado.mock.calls[0]!
    expect(String(url)).toBe('/api/cronograma-publico/consulta')
    expect(String(url)).not.toContain(TOKEN_CRONOGRAMA)
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ token: TOKEN_CRONOGRAMA })
    expect(store.dados?.filtro.rotulo).toBe('Buffet Sabor')
    expect(store.carregadoEm).toBeInstanceOf(Date)
    expect(store.carregando).toBe(false)
  })

  it('[SEGURANÇA] token malformado não chega à API e vira link inativo', async () => {
    const store = useCronogramaPublicoStore()

    await store.consultar('curto')

    expect(fetchSimulado).not.toHaveBeenCalled()
    expect(store.falha).toBe('linkInativo')
  })

  it('[COMPONENTE] 404 limpa os dados e 429 sinaliza muitas tentativas', async () => {
    const store = useCronogramaPublicoStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaPublico()))
    await store.consultar(TOKEN_CRONOGRAMA)

    fetchSimulado.mockResolvedValueOnce(respostaProblema(404, { title: 'Recurso não encontrado.' }))
    await store.consultar(TOKEN_CRONOGRAMA)
    expect(store.falha).toBe('linkInativo')
    expect(store.dados).toBeNull()

    fetchSimulado.mockResolvedValueOnce(respostaProblema(429, { title: 'Muitas tentativas.' }))
    await store.consultar(TOKEN_CRONOGRAMA)
    expect(store.falha).toBe('muitasTentativas')
  })

  it('[COMPONENTE] falha de rede ao atualizar mantém a última versão', async () => {
    const store = useCronogramaPublicoStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaPublico()))
    await store.consultar(TOKEN_CRONOGRAMA)
    const carregadoEm = store.carregadoEm

    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await store.consultar(TOKEN_CRONOGRAMA)

    expect(store.falha).toBe('conexao')
    expect(store.dados?.itens).toHaveLength(4)
    expect(store.carregadoEm).toBe(carregadoEm)
  })

  it('[COMPONENTE] trocar de token descarta os dados do anterior', async () => {
    const store = useCronogramaPublicoStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaPublico()))
    await store.consultar(TOKEN_CRONOGRAMA)

    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await store.consultar(OUTRO_TOKEN_CRONOGRAMA)

    expect(store.dados).toBeNull()
    store.limpar()
    expect(store.falha).toBeNull()
  })

  it('[UNITÁRIO] interpreta falhas', () => {
    expect(interpretarFalhaCronogramaPublico(new ErroApi('x', 0, null))).toBe('conexao')
    expect(interpretarFalhaCronogramaPublico(new ErroApi('x', 400, null))).toBe('linkInativo')
    expect(interpretarFalhaCronogramaPublico(new ErroApi('x', 404, null))).toBe('linkInativo')
    expect(interpretarFalhaCronogramaPublico(new ErroApi('x', 429, null))).toBe('muitasTentativas')
    expect(interpretarFalhaCronogramaPublico(new ErroApi('x', 500, null))).toBe('inesperado')
    expect(interpretarFalhaCronogramaPublico(new Error('x'))).toBe('inesperado')
  })
})
