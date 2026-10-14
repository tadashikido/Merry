import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_FORNECEDOR, ID_FORNECEDOR_2, fornecedorCompleto, resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { ROTA_FORNECEDORES, caminhoFornecedor, useFornecedoresStore } from '@/stores/fornecedores'
import type { SalvarFornecedorRequest } from '@/tipos/fornecedores'

const REQUEST: SalvarFornecedorRequest = {
  categoria: 'Buffet',
  nomeEmpresa: 'Buffet São João',
  responsavel: null,
  telefone: null,
  email: null,
  site: null,
  instagram: null,
  observacoes: null,
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useFornecedoresStore', () => {
  it('[UNITÁRIO] monta as rotas codificando o identificador', () => {
    expect(ROTA_FORNECEDORES).toBe('/api/fornecedores')
    expect(caminhoFornecedor()).toBe('/api/fornecedores')
    expect(caminhoFornecedor('a/b')).toBe('/api/fornecedores/a%2Fb')
    expect(caminhoFornecedor('f1', 'arquivar')).toBe('/api/fornecedores/f1/arquivar')
  })

  it('[UNITÁRIO] carrega a lista e guarda falha de permissão e de conexão', async () => {
    const store = useFornecedoresStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson([resumoFornecedor()]))
      .mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar()
    expect(store.lista).toEqual([resumoFornecedor()])

    await store.carregar()
    expect(store.lista).toBeNull()
    expect(store.falhaLista?.tipo).toBe('semPermissao')

    await store.carregar()
    expect(store.falhaLista?.tipo).toBe('conexao')
  })

  it('[UNITÁRIO] criar envia o corpo e inclui o novo item na lista carregada', async () => {
    const store = useFornecedoresStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson([resumoFornecedor()]))
      .mockResolvedValueOnce(respostaJson(fornecedorCompleto({ id: ID_FORNECEDOR_2, nomeEmpresa: 'Casa Aurora', categoria: 'EspacoLocal' }), 201))
    await store.carregar()

    const resultado = await store.criar({ ...REQUEST, nomeEmpresa: 'Casa Aurora', categoria: 'EspacoLocal' })

    expect(resultado.ok).toBe(true)
    const [, init] = fetchSimulado.mock.calls[1]!
    expect(init?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ ...REQUEST, nomeEmpresa: 'Casa Aurora', categoria: 'EspacoLocal' })
    expect(store.lista?.map((item) => item.nomeEmpresa)).toEqual(['Buffet São João', 'Casa Aurora'])
    expect(store.lista?.[1]).not.toHaveProperty('observacoes')
    expect(store.atual?.id).toBe(ID_FORNECEDOR_2)
  })

  it('[UNITÁRIO] 422 com campo vira erro do campo nomeEmpresa', async () => {
    const store = useFornecedoresStore()
    fetchSimulado.mockResolvedValueOnce(
      respostaProblema(422, { title: 'Regra', detail: 'Já existe um fornecedor com esse nome nessa categoria.', campo: 'nomeEmpresa' }),
    )

    const resultado = await store.criar(REQUEST)

    expect(resultado).toMatchObject({
      ok: false,
      falha: { tipo: 'regra', errosCampos: { nomeEmpresa: 'Já existe um fornecedor com esse nome nessa categoria.' } },
    })
  })

  it('[UNITÁRIO] arquivar e restaurar atualizam a linha; remover tira da lista', async () => {
    const store = useFornecedoresStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson([resumoFornecedor()]))
      .mockResolvedValueOnce(respostaJson(fornecedorCompleto({ arquivado: true, arquivadoEm: '2026-09-30T13:00:00Z' })))
      .mockResolvedValueOnce(respostaJson(fornecedorCompleto()))
      .mockResolvedValueOnce(respostaVazia())
    await store.carregar()

    await store.arquivar(ID_FORNECEDOR)
    expect(store.lista?.[0]?.arquivado).toBe(true)
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(`/api/fornecedores/${ID_FORNECEDOR}/arquivar`)

    await store.restaurar(ID_FORNECEDOR)
    expect(store.lista?.[0]?.arquivado).toBe(false)

    const remocao = await store.remover(ID_FORNECEDOR)
    expect(remocao.ok).toBe(true)
    expect(store.lista).toEqual([])
    expect(store.atual).toBeNull()
  })

  it('[UNITÁRIO] carregar o atual guarda não encontrado', async () => {
    const store = useFornecedoresStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(404, { title: 'Recurso não encontrado.' }))

    await store.carregarAtual(ID_FORNECEDOR)

    expect(store.atual).toBeNull()
    expect(store.falhaAtual?.tipo).toBe('naoEncontrado')
  })
})
