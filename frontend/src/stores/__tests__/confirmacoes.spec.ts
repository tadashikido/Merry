import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { rotaExportacaoBuffet, rotaPainelConfirmacoes, useConfirmacoesStore } from '@/stores/confirmacoes'
import { useRsvpStore } from '@/stores/rsvp'
import { exportacaoExemplo, painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'

const CASAMENTO = '11111111-1111-4111-8111-111111111111'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useConfirmacoesStore', () => {
  it('[UNITÁRIO] monta rotas do painel e da exportação', () => {
    expect(rotaPainelConfirmacoes(CASAMENTO)).toBe(`/api/casamentos/${CASAMENTO}/painel-confirmacoes`)
    expect(rotaExportacaoBuffet(CASAMENTO, 'csv')).toBe(`/api/casamentos/${CASAMENTO}/exportacao-buffet?formato=csv`)
    expect(rotaExportacaoBuffet(CASAMENTO, 'impressao')).toBe(`/api/casamentos/${CASAMENTO}/exportacao-buffet?formato=impressao`)
  })

  it('[INTEGRAÇÃO] carrega o painel do casamento', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(painelExemplo()))
    const store = useConfirmacoesStore()

    await store.carregar(CASAMENTO)

    expect(store.painel?.convites.total).toBe(3)
    expect(store.casamentoId).toBe(CASAMENTO)
    expect(store.carregando).toBe(false)
    expect(store.falha).toBeNull()
  })

  it('[INTEGRAÇÃO] falha 404 vira naoEncontrado e limpa o painel', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(404))
    const store = useConfirmacoesStore()

    await store.carregar(CASAMENTO)

    expect(store.painel).toBeNull()
    expect(store.falha?.tipo).toBe('naoEncontrado')
  })

  it('[INTEGRAÇÃO] erro de rede vira conexao', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('rede'))
    const store = useConfirmacoesStore()

    await store.carregar(CASAMENTO)

    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[INTEGRAÇÃO] exporta no formato pedido e devolve resultado', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(exportacaoExemplo()))
    const store = useConfirmacoesStore()

    const resultado = await store.exportar(CASAMENTO, 'impressao')

    expect(resultado.ok).toBe(true)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`/api/casamentos/${CASAMENTO}/exportacao-buffet?formato=impressao`)
  })

  it('[SEGURANÇA] exportação sem permissão devolve semPermissao', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(403))
    const store = useConfirmacoesStore()

    const resultado = await store.exportar(CASAMENTO, 'csv')

    expect(resultado.ok).toBe(false)
    expect(resultado.ok ? null : resultado.falha.tipo).toBe('semPermissao')
  })
})

describe('useRsvpStore — pré-visualização', () => {
  const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

  it('[SEGURANÇA] consulta normal é sempre anônima e não renova sessão', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({}))
    const store = useRsvpStore()

    await store.consultar(TOKEN)

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    const cabecalhos = fetchSimulado.mock.calls[0]![1]!.headers as Record<string, string>
    expect(cabecalhos.Authorization).toBeUndefined()
  })

  it('[INTEGRAÇÃO] pré-visualização renova a sessão e envia o token de acesso', async () => {
    fetchSimulado.mockImplementation(async (entrada) =>
      String(entrada) === '/api/autenticacao/renovar'
        ? respostaJson({ tokenAcesso: 'token-equipe', expiraEm: '2026-09-28T12:15:00Z', usuario: { id: 'u1', nome: 'R', email: 'r@x.com', papel: 'Dono', organizacao: { id: 'o1', nome: 'O' } } })
        : respostaJson({ preVisualizacao: true }),
    )
    const store = useRsvpStore()

    await store.consultar(TOKEN, { preVisualizacao: true })

    const consulta = fetchSimulado.mock.calls.find(([entrada]) => String(entrada) === '/api/rsvp/consulta')!
    expect((consulta[1]!.headers as Record<string, string>).Authorization).toBe('Bearer token-equipe')
    expect(store.dados?.preVisualizacao).toBe(true)
  })

  it('[SEGURANÇA] pré-visualização sem sessão segue anônima', async () => {
    fetchSimulado.mockImplementation(async (entrada) =>
      String(entrada) === '/api/autenticacao/renovar' ? respostaProblema(401) : respostaJson({ preVisualizacao: false }),
    )
    const store = useRsvpStore()

    await store.consultar(TOKEN, { preVisualizacao: true })

    const consulta = fetchSimulado.mock.calls.find(([entrada]) => String(entrada) === '/api/rsvp/consulta')!
    expect((consulta[1]!.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(store.falha).toBeNull()
  })
})
