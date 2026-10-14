import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { TOKEN_CRONOGRAMA, linksExemplo } from '@/__tests__/auxiliaresCronogramaPublico'
import { caminhoLinksCronograma, useLinksCronogramaStore } from '@/stores/linksCronograma'

const ID = '11111111-1111-4111-8111-111111111111'
const ROTA = `/api/casamentos/${ID}/cronograma/links`

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

describe('store de links do cronograma', () => {
  it('[UNITÁRIO] monta as rotas codificadas', () => {
    expect(caminhoLinksCronograma(ID)).toBe(ROTA)
    expect(caminhoLinksCronograma(ID, 'a/b')).toBe(`${ROTA}/a%2Fb`)
  })

  it('[COMPONENTE] carrega a lista de destinos', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(linksExemplo()))
    const store = useLinksCronogramaStore()

    await store.carregar(ID)

    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(ROTA)
    expect(store.links?.destinos).toHaveLength(3)
    expect(store.falha).toBeNull()
  })

  it('[COMPONENTE] gerar envia o destino e recarrega a lista', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
      .mockResolvedValueOnce(respostaJson({ id: 'l2', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-10T12:00:00Z' }))
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
    const store = useLinksCronogramaStore()
    await store.carregar(ID)

    const resultado = await store.gerar(ID, { tipo: 'Fornecedor', fornecedorCasamentoId: 'v-buffet' })

    expect(resultado).toEqual({ ok: true, valor: { id: 'l2', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-10T12:00:00Z' } })
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ tipo: 'Fornecedor', fornecedorCasamentoId: 'v-buffet' })
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })

  it('[COMPONENTE] regenerar e revogar usam as rotas do link', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
      .mockResolvedValueOnce(respostaJson({ id: 'l-geral', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-10T12:00:00Z' }))
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
      .mockResolvedValueOnce(respostaVazia())
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
    const store = useLinksCronogramaStore()
    await store.carregar(ID)

    expect((await store.regenerar(ID, 'l-geral')).ok).toBe(true)
    expect((await store.revogar(ID, 'l-geral')).ok).toBe(true)

    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(`${ROTA}/l-geral/regenerar`)
    expect(fetchSimulado.mock.calls[3]![1]?.method).toBe('DELETE')
    expect(String(fetchSimulado.mock.calls[3]![0])).toBe(`${ROTA}/l-geral`)
  })

  it('[SEGURANÇA] 403 e 422 viram falhas tipadas e a lista é recarregada', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
      .mockResolvedValueOnce(respostaProblema(422, { title: 'Regra', detail: 'Escolha um fornecedor deste casamento.', campo: 'fornecedorCasamentoId' }))
      .mockResolvedValueOnce(respostaJson(linksExemplo()))
    const store = useLinksCronogramaStore()

    await store.carregar(ID)
    expect(store.falha?.tipo).toBe('semPermissao')

    const resultado = await store.gerar(ID, { tipo: 'Fornecedor', fornecedorCasamentoId: 'x' })
    expect(resultado).toMatchObject({
      ok: false,
      falha: { tipo: 'regra', errosCampos: { fornecedorCasamentoId: 'Escolha um fornecedor deste casamento.' } },
    })
    store.limpar()
    expect(store.links).toBeNull()
  })
})
