import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { rotaRelatorioRestricoes, rotaRestricaoConvidado, useRestricoesAlimentaresStore } from '@/stores/restricoesAlimentares'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'

const EVENTO = '11111111-1111-4111-8111-111111111111'
const CONVITE = '33333333-3333-4333-8333-333333333333'
const CONVIDADO = '44444444-4444-4444-8444-444444444444'

const RELATORIO: RelatorioRestricoesAlimentaresDto = {
  totalPessoas: 1,
  totalConfirmados: 1,
  porTipo: [{ tipo: 'SemGluten', quantidade: 1 }],
  outrasRestricoes: 0,
  necessidadesEspeciais: 0,
  pessoas: [
    {
      convidadoId: CONVIDADO,
      conviteId: CONVITE,
      nome: 'Lia Souza',
      acompanhante: false,
      resposta: 'Confirmado',
      tipos: ['SemGluten'],
      outraRestricao: null,
      necessidadeEspecial: null,
      origemConsentimento: 'Convidado',
      consentidoEm: '2026-10-01T12:00:00Z',
    },
  ],
  diasRetencao: 30,
  dataExclusaoPrevista: '2027-06-14',
  dadosExcluidosEm: null,
  registrosIlegiveis: 0,
  podeRegistrar: true,
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useRestricoesAlimentaresStore', () => {
  it('[UNITÁRIO] monta rotas com ids codificados', () => {
    expect(rotaRelatorioRestricoes(EVENTO)).toBe(`/api/eventos/${EVENTO}/restricoes-alimentares`)
    expect(rotaRestricaoConvidado(EVENTO, CONVITE, CONVIDADO)).toBe(
      `/api/eventos/${EVENTO}/convites/${CONVITE}/convidados/${CONVIDADO}/restricao-alimentar`,
    )
  })

  it('[INTEGRAÇÃO] carrega o relatório do evento', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(RELATORIO))
    const store = useRestricoesAlimentaresStore()

    await store.carregar(EVENTO)

    expect(store.relatorio).toEqual(RELATORIO)
    expect(store.falha).toBeNull()
    expect(store.carregando).toBe(false)
  })

  it('[SEGURANÇA] sem permissão vira falha e limpa o relatório', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(403, { title: 'Proibido' }))
    const store = useRestricoesAlimentaresStore()

    await store.carregar(EVENTO)

    expect(store.relatorio).toBeNull()
    expect(store.falha?.tipo).toBe('semPermissao')
  })

  it('[INTEGRAÇÃO] erro de rede vira falha de conexão', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'))
    const store = useRestricoesAlimentaresStore()

    await store.carregar(EVENTO)

    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[INTEGRAÇÃO] salvar envia PUT com declaração de consentimento', async () => {
    fetchSimulado.mockResolvedValue(
      respostaJson({ tipos: ['Vegana'], outraRestricao: null, necessidadeEspecial: null, origemConsentimento: 'Cerimonialista', consentidoEm: 'x' }),
    )
    const store = useRestricoesAlimentaresStore()

    const resultado = await store.salvar(EVENTO, CONVITE, CONVIDADO, {
      tipos: ['Vegana'],
      outraRestricao: null,
      necessidadeEspecial: null,
      consentimentoObtido: true,
    })

    expect(resultado.ok).toBe(true)
    const chamada = fetchSimulado.mock.calls[0]!
    expect(String(chamada[0])).toBe(rotaRestricaoConvidado(EVENTO, CONVITE, CONVIDADO))
    expect(chamada[1]?.method).toBe('PUT')
    expect(corpoDaChamada(chamada)).toEqual({ tipos: ['Vegana'], outraRestricao: null, necessidadeEspecial: null, consentimentoObtido: true })
  })

  it('[INTEGRAÇÃO] salvar com regra violada devolve a mensagem do servidor', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(422, { title: 'Regra', detail: 'Confirme que a pessoa autorizou antes de salvar.' }))
    const store = useRestricoesAlimentaresStore()

    const resultado = await store.salvar(EVENTO, CONVITE, CONVIDADO, {
      tipos: ['Vegana'],
      outraRestricao: null,
      necessidadeEspecial: null,
      consentimentoObtido: true,
    })

    expect(resultado).toEqual({ ok: false, falha: expect.objectContaining({ tipo: 'regra', mensagem: 'Confirme que a pessoa autorizou antes de salvar.' }) })
  })

  it('[INTEGRAÇÃO] remover envia DELETE e trata 404', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaVazia()).mockResolvedValueOnce(respostaProblema(404, { title: 'Não encontrado' }))
    const store = useRestricoesAlimentaresStore()

    const primeira = await store.remover(EVENTO, CONVITE, CONVIDADO)
    const segunda = await store.remover(EVENTO, CONVITE, CONVIDADO)

    expect(primeira.ok).toBe(true)
    expect(fetchSimulado.mock.calls[0]![1]?.method).toBe('DELETE')
    expect(segunda.ok).toBe(false)
  })
})
