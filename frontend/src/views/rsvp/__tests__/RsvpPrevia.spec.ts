import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_PREVIA_RSVP } from '@/textos/confirmacoes'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('rsvp')

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'

function dados(preVisualizacao: boolean): RsvpPublicoDto {
  return {
    evento: {
      tipo: 'Casamento',
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localCerimonia: 'Igreja São José',
      localRecepcao: 'Espaço Jardim',
    },
    nomeConvite: 'Família Souza',
    limiteAcompanhantes: 0,
    dataLimiteResposta: '2027-05-12',
    podeResponder: true,
    respondidoEm: null,
    pessoas: [{ id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false }],
    acompanhantes: [],
    privacidade: { versaoTermo: '2026-09-29', diasRetencao: 30 },
    preVisualizacao,
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(true)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('RsvpView — pré-visualização da assessoria', () => {
  it('[INTEGRAÇÃO] com previa=1 renova a sessão, envia o token de acesso e mostra a faixa', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados(true))))

    await abrir(`/rsvp/${TOKEN}?previa=1`)

    expect(chamadas(fetchSimulado, 'POST', '/api/autenticacao/renovar')).toHaveLength(1)
    const consulta = chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)[0]!
    expect((consulta[1]!.headers as Record<string, string>).Authorization).toBe('Bearer token-de-acesso')
    expect(wrapper!.get('[data-teste="rsvp-previa"]').text()).toContain(TEXTOS_PREVIA_RSVP.faixa)
  })

  it('[SEGURANÇA] link normal do convidado não renova sessão nem envia token e não mostra a faixa', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados(false))))

    await abrir(`/rsvp/${TOKEN}`)

    expect(chamadas(fetchSimulado, 'POST', '/api/autenticacao/renovar')).toHaveLength(0)
    const consulta = chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)[0]!
    expect((consulta[1]!.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(wrapper!.find('[data-teste="rsvp-previa"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] faixa depende da resposta do servidor, não só do parâmetro', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados(false))))

    await abrir(`/rsvp/${TOKEN}?previa=1`)

    expect(wrapper!.find('[data-teste="rsvp-previa"]').exists()).toBe(false)
  })
})
