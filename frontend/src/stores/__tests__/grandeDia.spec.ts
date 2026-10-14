import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { grandeDia, ID_CASAMENTO_GRANDE_DIA as ID } from '@/__tests__/auxiliaresGrandeDia'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoConclusao, caminhoGrandeDia, useGrandeDiaStore } from '@/stores/grandeDia'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useGrandeDiaStore', () => {
  it('[UNITÁRIO] monta os caminhos codificando os identificadores', () => {
    expect(caminhoGrandeDia(ID)).toBe(`/api/casamentos/${ID}/grande-dia`)
    expect(caminhoConclusao(ID, 'a/b')).toBe(`/api/casamentos/${ID}/grande-dia/itens/a%2Fb/conclusao`)
  })

  it('[UNITÁRIO] carrega o Grande Dia e registra o instante da carga', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()

    await store.carregar(ID)

    expect(store.dados?.momento.fase).toBe('NoDia')
    expect(store.carregadoEm).toBeInstanceOf(Date)
    expect(store.falha).toBeNull()
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] falha ao carregar vira estado de erro sem dados', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
    const store = useGrandeDiaStore()

    await store.carregar(ID)

    expect(store.dados).toBeNull()
    expect(store.falha?.tipo).toBe('semPermissao')
  })

  it('[UNITÁRIO] atualização silenciosa sem rede mantém a última versão e liga a faixa', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.atualizar(ID)

    expect(store.dados).not.toBeNull()
    expect(store.semConexao).toBe(true)
    expect(store.falha).toBeNull()

    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia({ arquivado: true })))
    await store.atualizar(ID)
    expect(store.semConexao).toBe(false)
    expect(store.dados?.arquivado).toBe(true)
  })

  it('[UNITÁRIO] atualização que perde o acesso troca para o estado de erro', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)
    fetchSimulado.mockResolvedValueOnce(respostaProblema(404, { title: 'Não encontrado' }))

    await store.atualizar(ID)

    expect(store.dados).toBeNull()
    expect(store.falha?.tipo).toBe('naoEncontrado')
  })

  it('[UNITÁRIO] atualizar sem carga prévia ou de outro casamento não chama a API', async () => {
    const store = useGrandeDiaStore()
    await store.atualizar(ID)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('[UNITÁRIO] concluir usa PUT e aplica a resposta; reabrir usa DELETE', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia({ somenteLeitura: true })))

    const resultado = await store.concluir(ID, 'c')

    expect(resultado.ok).toBe(true)
    expect(store.dados?.somenteLeitura).toBe(true)
    const [url, init] = fetchSimulado.mock.calls[fetchSimulado.mock.calls.length - 1]!
    expect(String(url)).toBe(caminhoConclusao(ID, 'c'))
    expect(init?.method).toBe('PUT')

    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    await store.reabrir(ID, 'c')
    expect(fetchSimulado.mock.calls[fetchSimulado.mock.calls.length - 1]![1]?.method).toBe('DELETE')
    expect(store.itemEmAcao).toBeNull()
  })

  it('[UNITÁRIO] conflito ao concluir recarrega a tela e devolve a falha', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)
    fetchSimulado.mockResolvedValueOnce(respostaProblema(409, { title: 'Conflito' }))
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia({ arquivado: true })))

    const resultado = await store.concluir(ID, 'c')

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.falha.tipo).toBe('conflito')
    expect(store.dados?.arquivado).toBe(true)
  })

  it('[SEGURANÇA] casal recebe 403 ao tentar marcar e nada muda', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)
    fetchSimulado.mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))

    const resultado = await store.concluir(ID, 'c')

    expect(!resultado.ok && resultado.falha.tipo).toBe('semPermissao')
    expect(store.dados?.itens.find((item) => item.id === 'c')?.status).toBe('Previsto')
  })

  it('[UNITÁRIO] limpar zera o estado', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(grandeDia()))
    const store = useGrandeDiaStore()
    await store.carregar(ID)

    store.limpar()

    expect(store.dados).toBeNull()
    expect(store.casamentoId).toBeNull()
    expect(store.carregadoEm).toBeNull()
  })
})
