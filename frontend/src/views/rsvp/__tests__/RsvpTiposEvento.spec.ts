import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { TEXTOS_RSVP } from '@/textos/rsvp'
import type { TipoEvento } from '@/tipos/eventos'
import type { EventoRsvpDto, RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('rsvp')

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'
const ROTA_RESPOSTA = '/api/rsvp/resposta'

function dados(evento: Partial<EventoRsvpDto> = {}, extra: Partial<RsvpPublicoDto> = {}): RsvpPublicoDto {
  return {
    evento: {
      tipo: 'Casamento',
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localCerimonia: 'Igreja São José',
      localRecepcao: 'Espaço Jardim',
      ...evento,
    },
    nomeConvite: 'Família Souza',
    limiteAcompanhantes: 0,
    dataLimiteResposta: '2027-05-12',
    podeResponder: true,
    respondidoEm: null,
    pessoas: [
      { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
      { id: 'p2', nome: 'Antônio Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
    ],
    acompanhantes: [],
    privacidade: { versaoTermo: '2026-09-29', diasRetencao: 30 },
    ...extra,
  }
}

function respondido(base: RsvpPublicoDto, podeResponder = true): RsvpPublicoDto {
  return {
    ...base,
    podeResponder,
    respondidoEm: '2027-05-01T12:00:00Z',
    pessoas: base.pessoas.map((pessoa) => ({ ...pessoa, resposta: 'Confirmado' as const })),
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-05-02T15:00:00Z'))
  fetchSimulado = simularFetch()
  simularMatchMedia(true)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

async function abrir(token = TOKEN) {
  const montagem = await prepararAplicacao(`/rsvp/${token}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

describe('RsvpView — convite por tipo de evento', () => {
  it.each([
    ['Casamento', 'Bruno', 'vão se casar', 'Para o dia do casamento', 'Faltam 20 dias para o casamento.', /comemora|festa de 15/i],
    ['QuinzeAnos', null, 'vai comemorar os 15 anos', 'Para o dia da festa de 15 anos', 'Faltam 20 dias para a festa de 15 anos.', /casamento|cerimônia|recepção/i],
    ['Aniversario', null, 'vai comemorar o aniversário', 'Para o dia do aniversário', 'Faltam 20 dias para o aniversário.', /casamento|cerimônia|recepção/i],
    ['Comemoracao', 'Rui', 'vão celebrar', 'Para o dia da comemoração', 'Faltam 20 dias para a comemoração.', /casamento|cerimônia|recepção/i],
  ] as const)('[COMPONENTE] %s: celebração no convite e bloco Para o dia depois do formulário', async (tipo, segundo, celebracao, titulo, contagem, proibido) => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados({ tipo, nomeSegundaPessoa: segundo }))))

    await abrir()

    expect(wrapper!.get('[data-teste="cabecalho-convite-celebracao"]').text()).toBe(celebracao)
    const bloco = wrapper!.get('[data-teste="rsvp-para-o-dia"]')
    expect(bloco.get('h2').text()).toBe(titulo)
    expect(bloco.get('[data-teste="rsvp-contagem"]').text()).toBe(contagem)
    expect(bloco.find('[data-teste="rsvp-nota-prazo"]').exists()).toBe(true)
    const formulario = wrapper!.get('[data-teste="rsvp-formulario"]').element
    expect(formulario.compareDocumentPosition(bloco.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper!.get('.rsvp').text()).not.toMatch(proibido)
  })

  it('[COMPONENTE] tipo desconhecido: neutro, sem anéis e sem casamento/cerimônia/comemoração', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () =>
        respostaJson(dados({ tipo: 'Formatura' as unknown as TipoEvento, nomePrimeiraPessoa: 'Turma de Medicina', nomeSegundaPessoa: null, localRecepcao: null })),
      ),
    )

    await abrir()

    const texto = wrapper!.get('.rsvp').text()
    expect(wrapper!.get('[data-teste="cabecalho-convite-celebracao"]').text()).toBe('vai celebrar')
    expect(wrapper!.find('.cabecalho-convite__aneis').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="rsvp-para-o-dia"] h2').text()).toBe('Para o dia do evento')
    expect(texto).not.toMatch(/casamento|cerimônia|comemoração/i)
  })

  it('[E2E] confirmar o convite inteiro continua com 2 toques e o bloco perde a nota de prazo no resumo', async () => {
    const base = dados({ tipo: 'QuinzeAnos', nomePrimeiraPessoa: 'Júlia', nomeSegundaPessoa: null })
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(base)),
      quando('PUT', ROTA_RESPOSTA, () => respostaJson(respondido(base))),
    )
    await abrir()

    await wrapper!.get('[data-teste="rsvp-todos-vao"]').trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="rsvp-formulario"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)).toHaveLength(1)
    expect(wrapper!.get('.selo-confirmacao__titulo').text()).toBe(TEXTOS_RSVP.enviada)
    expect(wrapper!.find('[data-teste="rsvp-para-o-dia"] [data-teste="rsvp-nota-prazo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="rsvp-nota-link"]').exists()).toBe(true)
  })

  it('[COMPONENTE] já respondeu com prazo aberto: resumo com Alterar e bloco sem nota de prazo', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(respondido(dados()))))

    await abrir()

    expect(wrapper!.find('[data-teste="rsvp-alterar"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="rsvp-nota-prazo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="rsvp-nota-link"]').exists()).toBe(true)
  })

  it('[COMPONENTE] prazo encerrado: aviso do prazo e bloco sem promessa de resposta', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(respondido(dados({ tipo: 'Aniversario', nomeSegundaPessoa: null }), false))))

    await abrir()

    expect(wrapper!.find('[data-teste="rsvp-prazo-encerrado"]').exists()).toBe(true)
    const bloco = wrapper!.get('[data-teste="rsvp-para-o-dia"]')
    expect(bloco.find('[data-teste="rsvp-nota-prazo"]').exists()).toBe(false)
    expect(bloco.find('[data-teste="rsvp-nota-link"]').exists()).toBe(false)
    expect(bloco.findAll('[data-teste="rsvp-abrir-mapa"]')).toHaveLength(2)
  })

  it('[SEGURANÇA] token inválido e link inativo: erro neutro, sem bloco nem dados do evento', async () => {
    await abrir('curto')
    expect(wrapper!.text()).toContain(TEXTOS_RSVP.linkInativoTitulo)
    expect(wrapper!.find('[data-teste="rsvp-para-o-dia"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="cabecalho-convite"]').exists()).toBe(false)
    wrapper!.unmount()
    wrapper = undefined

    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(404)))
    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_RSVP.linkInativoTitulo)
    expect(wrapper!.find('[data-teste="rsvp-para-o-dia"]').exists()).toBe(false)
    expect(wrapper!.text()).not.toMatch(/Igreja|Espaço Jardim/)
  })

  it('[SEGURANÇA] o bloco não mostra nomes de convidados nem telefone ou e-mail', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))

    await abrir()

    const bloco = wrapper!.get('[data-teste="rsvp-para-o-dia"]').text()
    expect(bloco).not.toMatch(/Célia|Antônio|Família Souza|@|\(\d{2}\)/)
  })
})
