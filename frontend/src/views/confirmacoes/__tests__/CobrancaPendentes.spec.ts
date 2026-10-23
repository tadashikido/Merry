import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_COBRANCA } from '@/textos/confirmacoes'
import type { ConvitePendenteDto, PainelConfirmacoesDto } from '@/tipos/confirmacoes'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('painel-confirmacoes')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_PAINEL = `${ROTA_EVENTO}/painel-confirmacoes`
const ROTA_RESTRICOES = `${ROTA_EVENTO}/restricoes-alimentares`
const ID_LIMA = '33333333-3333-4333-8333-333333333333'
const ID_SOUZA = '44444444-4444-4444-8444-444444444444'
const ROTA_LIMA = `${ROTA_EVENTO}/convites/${ID_LIMA}`
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

function pendente(dados: Partial<ConvitePendenteDto> = {}): ConvitePendenteDto {
  return {
    conviteId: ID_LIMA,
    nome: 'Família Lima',
    grupo: 'Amigos',
    statusEnvio: 'Enviado',
    telefone: '11987654321',
    pessoasPendentes: ['Bia Lima'],
    totalPessoas: 2,
    cobravel: true,
    ultimaCobrancaEm: null,
    quantidadeCobrancas: 0,
    ...dados,
  }
}

function painelCobravel(dados: Partial<PainelConfirmacoesDto> = {}): PainelConfirmacoesDto {
  return painelExemplo({
    pendentes: [
      pendente(),
      pendente({ conviteId: ID_SOUZA, nome: 'Família Souza', statusEnvio: 'NaoEnviado', cobravel: false, pessoasPendentes: ['Célia'] }),
    ],
    ...dados,
  })
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined
let janela: { opener: unknown; location: { href: string }; close: ReturnType<typeof vi.fn> }
let escreverTexto: ReturnType<typeof vi.fn>

beforeEach(() => {
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
  escreverTexto = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escreverTexto }, configurable: true })
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

function rotas(painel: () => PainelConfirmacoesDto, arquivado = false) {
  return [
    quando('GET', ROTA_EVENTO, () =>
      respostaJson(eventoCompleto({ arquivado, data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12', nomePrimeiraPessoa: 'Ana Beatriz', nomeSegundaPessoa: 'Bruno' })),
    ),
    quando('GET', ROTA_PAINEL, () => respostaJson(painel())),
    quando('GET', ROTA_RESTRICOES, () => respostaJson({ totalPessoas: 0, totalConfirmados: 0, porTipo: [], outrasRestricoes: 0, necessidadesEspeciais: 0, pessoas: [], diasRetencao: 30, dataExclusaoPrevista: null, dadosExcluidosEm: null, registrosIlegiveis: 0, podeRegistrar: true })),
  ]
}

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/confirmacoes`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

async function abrirDialogo() {
  await wrapper!.get('[data-teste="abrir-cobranca"]').trigger('click')
  await flushPromises()
}

function noDialogo(seletor: string): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(`[data-teste="dialogo-cobranca"] ${seletor}`)
}

async function clicar(seletor: string) {
  noDialogo(seletor)!.click()
  await flushPromises()
}

describe('Cobrar pendentes', { timeout: 20_000 }, () => {
  it('[COMPONENTE] botão mostra só os cobráveis e o diálogo lista a fila com última cobrança', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => painelCobravel()))
    await abrir()

    expect(wrapper!.get('[data-teste="abrir-cobranca"]').text()).toBe(TEXTOS_COBRANCA.acaoAbrir(1))
    await abrirDialogo()

    const itens = document.body.querySelectorAll('[data-teste="dialogo-cobranca"] [data-teste="cobranca-item"]')
    expect(itens).toHaveLength(1)
    expect(itens[0]!.textContent).toContain('Família Lima')
    expect(itens[0]!.textContent).toContain('Falta: Bia Lima')
    expect(noDialogo('[data-teste="cobranca-ultima"]')!.textContent).toContain(TEXTOS_COBRANCA.nuncaCobrado)
    expect(noDialogo('[data-teste="cobranca-resumo"]')!.textContent).toBe('1 para cobrar · 0 cobrados hoje')
    expect(noDialogo('.cobranca__fila')!.textContent).not.toContain('Família Souza')
  })

  it('[COMPONENTE] prévia do lembrete não busca nem mostra o token', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => painelCobravel()))
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-alternar-previa"]')

    const previa = noDialogo('[data-teste="cobranca-previa"]')!.textContent!
    expect(previa).toContain('Oi, Família Lima!')
    expect(previa).toContain('Ana Beatriz e Bruno')
    expect(previa).toContain('12 de maio')
    expect(previa).toContain(TEXTOS_COBRANCA.previaLink)
    expect(noDialogo('[data-teste="cobranca-alternar-previa"]')!.getAttribute('aria-expanded')).toBe('true')
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_LIMA}/link-rsvp`)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] Abrir WhatsApp usa o link existente, abre sem opener e registra a cobrança', async () => {
    let cobrado = false
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('GET', `${ROTA_LIMA}/link-rsvp`, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })),
      quando('POST', `${ROTA_LIMA}/cobranca`, () => {
        cobrado = true
        return respostaJson({ conviteId: ID_LIMA, ultimaCobrancaEm: new Date().toISOString(), quantidadeCobrancas: 1 })
      }),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-whatsapp"]')

    const destino = new URL(janela.location.href)
    expect(destino.origin + destino.pathname).toBe('https://wa.me/5511987654321')
    expect(destino.searchParams.get('text')).toContain('Passando para lembrar')
    expect(destino.searchParams.get('text')).toContain(`/rsvp/${TOKEN}`)
    expect(janela.opener).toBeNull()
    expect(cobrado).toBe(true)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/link-rsvp`)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/link-rsvp/regenerar`)).toHaveLength(0)
    expect(noDialogo('[data-teste="cobranca-ultima"]')!.textContent).toContain(TEXTOS_COBRANCA.cobradoAgora)
    expect(noDialogo('[role="status"]')!.textContent).toContain(TEXTOS_COBRANCA.anuncioRegistrado('Família Lima'))
  })

  it('[INTEGRAÇÃO] Copiar lembrete copia a mensagem com link e não registra cobrança', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('GET', `${ROTA_LIMA}/link-rsvp`, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-copiar"]')

    expect(escreverTexto).toHaveBeenCalledTimes(1)
    const texto = escreverTexto.mock.calls[0]![0] as string
    expect(texto).toContain('Oi, Família Lima!')
    expect(texto).toContain(`/rsvp/${TOKEN}`)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_COBRANCA.lembreteCopiado)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/cobranca`)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] Marcar lembrete enviado registra e avisa', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('POST', `${ROTA_LIMA}/cobranca`, () => respostaJson({ conviteId: ID_LIMA, ultimaCobrancaEm: new Date().toISOString(), quantidadeCobrancas: 3 })),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-registrar"]')

    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/cobranca`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_COBRANCA.lembreteRegistrado)
    expect(noDialogo('[data-teste="cobranca-ultima"]')!.textContent).toContain(TEXTOS_COBRANCA.quantidade(3))
  })

  it('[COMPONENTE] convite que respondeu no meio do caminho gera aviso e recarrega o painel', async () => {
    let respondeu = false
    rotearFetch(
      fetchSimulado,
      ...rotas(() => (respondeu ? painelExemplo({ pendentes: [] }) : painelCobravel())),
      quando('POST', `${ROTA_LIMA}/cobranca`, () => {
        respondeu = true
        return respostaProblema(422, { detail: 'Este convite já respondeu ou ainda não foi enviado, então não pode ser cobrado.' })
      }),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-registrar"]')

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_COBRANCA.naoCobravel)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PAINEL)).toHaveLength(2)
    expect(noDialogo('[data-teste="cobranca-vazia"]')).not.toBeNull()
  })

  it('[SEGURANÇA] link revogado depois do carregamento não gera link novo e avisa', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('GET', `${ROTA_LIMA}/link-rsvp`, () => respostaProblema(404)),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-whatsapp"]')

    expect(janela.close).toHaveBeenCalled()
    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_COBRANCA.naoCobravel)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/link-rsvp`)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LIMA}/cobranca`)).toHaveLength(0)
  })

  it('[SEGURANÇA] sem permissão mostra mensagem específica', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('POST', `${ROTA_LIMA}/cobranca`, () => respostaProblema(403)),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-registrar"]')

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_COBRANCA.semPermissao)
  })

  it('[COMPONENTE] erro de rede ao registrar avisa sem conexão', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel()),
      quando('POST', `${ROTA_LIMA}/cobranca`, () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    await abrir()
    await abrirDialogo()

    await clicar('[data-teste="cobranca-registrar"]')

    expect(notificacoes.erro).toHaveBeenCalledTimes(1)
    expect([TEXTOS_COBRANCA.semConexao, TEXTOS_COBRANCA.erroGenerico]).toContain(notificacoes.erro.mock.calls[0]![0])
  })

  it('[COMPONENTE] prazo encerrado esconde a ação e explica', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() =>
        painelCobravel({
          prazo: { dataLimite: '2027-05-12', diasRestantes: -1, aceitaRespostas: false },
          pendentes: [pendente({ cobravel: false })],
        }),
      ),
    )
    await abrir()

    expect(wrapper!.find('[data-teste="abrir-cobranca"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="cobranca-prazo-encerrado"]').text()).toBe(TEXTOS_COBRANCA.prazoEncerrado)
  })

  it('[COMPONENTE] sem convites cobráveis não mostra a ação', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => painelExemplo()))
    await abrir()

    expect(wrapper!.find('[data-teste="abrir-cobranca"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="cobranca-prazo-encerrado"]').exists()).toBe(false)
  })

  it('[COMPONENTE] evento arquivado não oferece cobrança', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() => painelCobravel({ eventoArquivado: true, prazo: { dataLimite: '2027-05-12', diasRestantes: 5, aceitaRespostas: false } }), true),
    )
    await abrir()

    expect(wrapper!.find('[data-teste="abrir-cobranca"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="cobranca-prazo-encerrado"]').exists()).toBe(false)
  })
})
