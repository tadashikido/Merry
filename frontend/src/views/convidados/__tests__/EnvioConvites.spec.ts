import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_PREVIA_RSVP } from '@/textos/confirmacoes'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import type { ConviteDto, ListaConvitesDto, TotaisConvidadosDto } from '@/tipos/convidados'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-convidados')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

function notificado(texto: string): boolean {
  return [...notificacoes.sucesso.mock.calls, ...notificacoes.erro.mock.calls].some((chamada) => chamada.some((argumento) => argumento === texto))
}

const ID_CONVITE = '33333333-3333-4333-8333-333333333333'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const ROTA_CONVITE = `${ROTA_CONVITES}/${ID_CONVITE}`
const ROTA_LINK = `${ROTA_CONVITE}/link-rsvp`
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

const TOTAIS: TotaisConvidadosDto = {
  convites: 1,
  pessoas: 2,
  adultos: 2,
  criancas: 0,
  acompanhantesPermitidos: 0,
  confirmados: { adultos: 2, criancas: 0, total: 2 },
  pendentes: { adultos: 0, criancas: 0, total: 0 },
  recusados: { adultos: 0, criancas: 0, total: 0 },
}

function convite(dados: Partial<ConviteDto> = {}): ConviteDto {
  return {
    id: ID_CONVITE,
    nome: 'Família Souza',
    grupo: null,
    limiteAcompanhantes: 1,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false },
      { id: 'p2', nome: 'Pedro Lima', telefone: '11987654321', email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: true, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
    ...dados,
  }
}

function lista(dados: Partial<ConviteDto> = {}, arquivado = false): ListaConvitesDto {
  return { convites: [convite(dados)], totais: TOTAIS, convidadosEstimados: null, eventoArquivado: arquivado }
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined
let janela: { opener: unknown; location: { href: string }; close: ReturnType<typeof vi.fn> }
let escreverTexto: ReturnType<typeof vi.fn>

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  janela = { opener: {}, location: { href: 'about:blank' }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window)
  escreverTexto = vi.fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escreverTexto }, configurable: true })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/convidados`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function rotas(listaConvites = lista(), arquivado = false) {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado, data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' }))),
    quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites)),
  ]
}

async function selecionarNoMenu(rotulo: string) {
  await wrapper!.get('[data-teste="menu-acoes"]').trigger('click')
  await flushPromises()
  const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((elemento) => elemento.textContent?.includes(rotulo))
  expect(item).toBeTruthy()
  ;((item!.querySelector('a, div') ?? item) as HTMLElement).click()
  await flushPromises()
}

describe('ConvidadosView — envio de convites', { timeout: 20_000 }, () => {
  it('[COMPONENTE] mostra status de envio, respondido em e marcação de acompanhante', async () => {
    rotearFetch(fetchSimulado, ...rotas(lista({ statusEnvio: 'Visualizado', respondidoEm: '2026-10-02T15:00:00Z' })))

    await abrir()

    const texto = wrapper!.text()
    expect(texto).toContain('Visualizado')
    expect(wrapper!.get('[data-teste="respondido-em"]').text()).toBe('Respondeu em 02/10/2026')
    expect(texto).toContain(TEXTOS_ENVIO_CONVITE.acompanhante)
  })

  it('[INTEGRAÇÃO] Enviar pelo WhatsApp gera o link, abre wa.me com telefone e mensagem e marca enviado', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(),
      quando('POST', ROTA_LINK, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })),
      quando('POST', `${ROTA_CONVITE}/envio`, () => respostaJson(convite({ statusEnvio: 'Enviado' }))),
    )
    await abrir()

    await wrapper!.get('[data-teste="enviar-whatsapp"]').trigger('click')
    await flushPromises()

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(janela.opener).toBeNull()
    const destino = new URL(janela.location.href)
    expect(destino.origin + destino.pathname).toBe('https://wa.me/5511987654321')
    const mensagem = destino.searchParams.get('text')!
    expect(mensagem).toContain('Olá, Família Souza! Ana Beatriz e Bruno vão se casar em 22 de maio de 2027')
    expect(mensagem).toContain('até 12 de maio')
    expect(mensagem).toContain(`/rsvp/${TOKEN}`)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CONVITE}/envio`)).toHaveLength(1)
    expect(wrapper!.text()).toContain('Enviado')
  })

  it('[COMPONENTE] falha ao gerar o link fecha a janela e não marca enviado', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('POST', ROTA_LINK, () => respostaProblema(403, { title: 'Proibido' })))
    await abrir()

    await wrapper!.get('[data-teste="enviar-whatsapp"]').trigger('click')
    await flushPromises()

    expect(janela.close).toHaveBeenCalled()
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CONVITE}/envio`)).toHaveLength(0)
    expect(notificado(TEXTOS_ENVIO_CONVITE.semPermissao)).toBe(true)
  })

  it('[COMPONENTE] Copiar link copia a URL pública sem marcar enviado', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('POST', ROTA_LINK, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })))
    await abrir()

    await selecionarNoMenu(TEXTOS_ENVIO_CONVITE.copiarLink)

    expect(escreverTexto).toHaveBeenCalledWith(`${window.location.origin}/rsvp/${TOKEN}`)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CONVITE}/envio`)).toHaveLength(0)
    expect(notificado(TEXTOS_ENVIO_CONVITE.linkCopiado)).toBe(true)
  })

  it('[COMPONENTE] Copiar mensagem copia o texto pronto', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('POST', ROTA_LINK, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })))
    await abrir()

    await selecionarNoMenu(TEXTOS_ENVIO_CONVITE.copiarMensagem)

    expect(escreverTexto.mock.calls[0]![0]).toContain('Confirme a presença por este link até 12 de maio')
  })

  it('[COMPONENTE] link irrecuperável (409) orienta a gerar novo link', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('POST', ROTA_LINK, () => respostaProblema(409, { title: 'Conflito' })))
    await abrir()

    await selecionarNoMenu(TEXTOS_ENVIO_CONVITE.copiarLink)

    expect(escreverTexto).not.toHaveBeenCalled()
    expect(notificado(TEXTOS_ENVIO_CONVITE.linkIrrecuperavel)).toBe(true)
  })

  it('[COMPONENTE] Desativar link pede confirmação antes de chamar a API', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('DELETE', ROTA_LINK, () => respostaVazia()))
    await abrir()

    await selecionarNoMenu(TEXTOS_ENVIO_CONVITE.revogarLink)
    expect(chamadas(fetchSimulado, 'DELETE', ROTA_LINK)).toHaveLength(0)
    expect(document.body.textContent).toContain(TEXTOS_ENVIO_CONVITE.confirmarRevogarTitulo)

    const confirmar = Array.from(document.body.querySelectorAll('button')).find(
      (botao) => botao.textContent?.trim() === TEXTOS_ENVIO_CONVITE.confirmarRevogarAcao,
    )
    confirmar!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', ROTA_LINK)).toHaveLength(1)
    expect(notificado(TEXTOS_ENVIO_CONVITE.linkRevogado)).toBe(true)
  })

  it('[COMPONENTE] Gerar novo link chama regenerar após confirmação', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(),
      quando('POST', `${ROTA_LINK}/regenerar`, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })),
    )
    await abrir()

    await selecionarNoMenu(TEXTOS_ENVIO_CONVITE.regenerarLink)
    const confirmar = Array.from(document.body.querySelectorAll('button')).find(
      (botao) => botao.textContent?.trim() === TEXTOS_ENVIO_CONVITE.confirmarRegenerarAcao,
    )
    confirmar!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LINK}/regenerar`)).toHaveLength(1)
    expect(notificado(TEXTOS_ENVIO_CONVITE.linkRegenerado)).toBe(true)
  })

  it('[COMPONENTE] evento arquivado só permite copiar, consultando o link sem gerar', async () => {
    rotearFetch(fetchSimulado, ...rotas(lista({}, true), true), quando('GET', ROTA_LINK, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })))
    await abrir()

    expect(wrapper!.find('[data-teste="enviar-whatsapp"]').exists()).toBe(false)
    await wrapper!.get('[data-teste="menu-acoes"]').trigger('click')
    await flushPromises()
    const itens = Array.from(document.body.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent?.trim())
    expect(itens).toEqual([TEXTOS_ENVIO_CONVITE.copiarLink, TEXTOS_ENVIO_CONVITE.copiarMensagem, TEXTOS_PREVIA_RSVP.acao])

    ;((document.body.querySelector('[role="menuitem"] a, [role="menuitem"] div') ?? document.body.querySelector('[role="menuitem"]')) as HTMLElement).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_LINK)).toHaveLength(1)
    expect(chamadas(fetchSimulado, 'POST', ROTA_LINK)).toHaveLength(0)
  })
})
