import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { alertasExemplo, financeiroExemplo, ID_VINCULO_FINANCEIRO, parcelaExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoFinanceiro, caminhoParcelas, ROTA_ALERTAS_PAGAMENTOS, useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_COMPROVANTE } from '@/textos/financeiro'

const EVENTO = '11111111-1111-4111-8111-111111111111'
const ROTA_FINANCEIRO = `/api/eventos/${EVENTO}/financeiro`
const ROTA_PARCELAS = `/api/eventos/${EVENTO}/fornecedores/${ID_VINCULO_FINANCEIRO}/parcelas`

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
  vi.unstubAllGlobals()
})

describe('useFinanceiroStore', () => {
  it('[UNITÁRIO] monta as rotas codificando os identificadores', () => {
    expect(caminhoFinanceiro(EVENTO)).toBe(ROTA_FINANCEIRO)
    expect(caminhoFinanceiro(EVENTO, true)).toBe(`${ROTA_FINANCEIRO}/alertas`)
    expect(caminhoParcelas('a/b', 'v/1', 'p/2', 'pagamento')).toBe('/api/eventos/a%2Fb/fornecedores/v%2F1/parcelas/p%2F2/pagamento')
    expect(caminhoParcelas(EVENTO, ID_VINCULO_FINANCEIRO, undefined, 'geracao')).toBe(`${ROTA_PARCELAS}/geracao`)
  })

  it('[UNITÁRIO] carrega o financeiro e guarda falhas de permissão e conexão', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(financeiroExemplo()))
      .mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar(EVENTO)
    expect(store.financeiro?.fornecedores).toHaveLength(1)
    await store.carregar(EVENTO)
    expect(store.financeiro).toBeNull()
    expect(store.falha?.tipo).toBe('semPermissao')
    await store.carregar(EVENTO)
    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[INTEGRAÇÃO] criar envia o corpo e recarrega o financeiro do servidor', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(financeiroExemplo()))
      .mockResolvedValueOnce(respostaJson(parcelaExemplo(), 201))
      .mockResolvedValueOnce(respostaJson(financeiroExemplo({ somenteLeitura: true })))
    await store.carregar(EVENTO)

    const resultado = await store.criarParcela(EVENTO, ID_VINCULO_FINANCEIRO, { valor: 100, vencimento: '2026-10-10', observacao: 'Pix' })

    expect(resultado.ok).toBe(true)
    const [url, init] = fetchSimulado.mock.calls[1]!
    expect(url).toBe(ROTA_PARCELAS)
    expect(init?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ valor: 100, vencimento: '2026-10-10', observacao: 'Pix' })
    expect(String(fetchSimulado.mock.calls[2]![0])).toBe(ROTA_FINANCEIRO)
    expect(store.financeiro?.somenteLeitura).toBe(true)
  })

  it('[UNITÁRIO] 422 com campo vira erro do campo e não recarrega', async () => {
    const store = useFinanceiroStore()
    fetchSimulado.mockResolvedValueOnce(
      respostaProblema(422, { title: 'Regra', detail: 'As parcelas passariam do valor contratado em R$ 1,00. Ajuste o valor.', campo: 'valor' }),
    )

    const resultado = await store.criarParcela(EVENTO, ID_VINCULO_FINANCEIRO, { valor: 1, vencimento: '2026-10-10', observacao: null })

    expect(resultado).toMatchObject({ ok: false, falha: { tipo: 'regra', errosCampos: { valor: expect.stringContaining('R$ 1,00') } } })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('[UNITÁRIO] 409 recarrega para mostrar o estado atual', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(financeiroExemplo()))
      .mockResolvedValueOnce(respostaProblema(409, { title: 'O registro foi alterado por outra operação.' }))
      .mockResolvedValueOnce(respostaJson(financeiroExemplo()))
    await store.carregar(EVENTO)

    const resultado = await store.atualizarParcela(EVENTO, ID_VINCULO_FINANCEIRO, 'p1', { valor: 1, vencimento: '2026-10-10', observacao: null })

    expect(resultado.ok).toBe(false)
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })

  it('[UNITÁRIO] pagamento, desfazer, gerar e remover usam os verbos e rotas certos', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(parcelaExemplo({ situacao: 'Paga' })))
      .mockResolvedValueOnce(respostaJson(parcelaExemplo()))
      .mockResolvedValueOnce(respostaJson({ fornecedorEventoId: ID_VINCULO_FINANCEIRO, valorContratado: 1, parcelado: 1, pago: 0, saldoAParcelar: 0, parcelas: [] }))
      .mockResolvedValueOnce(respostaVazia())

    await store.registrarPagamento(EVENTO, ID_VINCULO_FINANCEIRO, 'p1', { pagaEm: '2026-09-30' })
    await store.desfazerPagamento(EVENTO, ID_VINCULO_FINANCEIRO, 'p1')
    await store.gerarParcelas(EVENTO, ID_VINCULO_FINANCEIRO, { quantidade: 3, valorTotal: 100, primeiroVencimento: '2027-01-31', observacao: null })
    await store.removerParcela(EVENTO, ID_VINCULO_FINANCEIRO, 'p1')

    const chamadas = fetchSimulado.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${String(url)}`)
    expect(chamadas).toEqual([
      `PUT ${ROTA_PARCELAS}/p1/pagamento`,
      `DELETE ${ROTA_PARCELAS}/p1/pagamento`,
      `POST ${ROTA_PARCELAS}/geracao`,
      `DELETE ${ROTA_PARCELAS}/p1`,
    ])
  })

  it('[SEGURANÇA] comprovante vai por multipart e 413/429 viram mensagens próprias', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(413, { title: 'Grande' }))
      .mockResolvedValueOnce(respostaProblema(429, { title: 'Limite' }))

    const grande = await store.enviarComprovante(EVENTO, ID_VINCULO_FINANCEIRO, 'p1', new File(['%PDF-'], 'a.pdf'))
    const limite = await store.enviarComprovante(EVENTO, ID_VINCULO_FINANCEIRO, 'p1', new File(['%PDF-'], 'a.pdf'))

    const init = fetchSimulado.mock.calls[0]![1]!
    expect(init.method).toBe('PUT')
    expect(init.body).toBeInstanceOf(FormData)
    expect(grande.ok || grande.falha.mensagem).toBe(TEXTOS_COMPROVANTE.erroTamanho)
    expect(limite.ok || limite.falha.mensagem).toBe(TEXTOS_COMPROVANTE.erroLimite)
  })

  it('[UNITÁRIO] alertas da organização e do evento têm estados próprios', async () => {
    const store = useFinanceiroStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(alertasExemplo()))
      .mockResolvedValueOnce(respostaProblema(500, { title: 'Erro' }))

    await store.carregarAlertasOrganizacao()
    await store.carregarAlertasEvento(EVENTO)

    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(ROTA_ALERTAS_PAGAMENTOS)
    expect(store.alertasOrganizacao?.totalVencidas).toBe(2)
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(`${ROTA_FINANCEIRO}/alertas`)
    expect(store.alertasEvento).toBeNull()
    expect(store.falhaAlertasEvento?.tipo).toBe('inesperado')
    store.limpar()
    expect(store.alertasOrganizacao).toBeNull()
  })
})
