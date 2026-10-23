import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch, type Montagem } from '@/__tests__/auxiliaresAutenticacao'
import { exportacaoExemplo, painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONFIRMACOES, TEXTOS_PREVIA_RSVP } from '@/textos/confirmacoes'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'
import * as arquivo from '@/utilitarios/arquivo'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('painel-confirmacoes', 'impressao-buffet')

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
const ROTA_CONVITE = `${ROTA_EVENTO}/convites/${ID_LIMA}`
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

function relatorio(dados: Partial<RelatorioRestricoesAlimentaresDto> = {}): RelatorioRestricoesAlimentaresDto {
  return {
    totalPessoas: 1,
    totalConfirmados: 1,
    porTipo: [{ tipo: 'SemGluten', quantidade: 3 }],
    outrasRestricoes: 1,
    necessidadesEspeciais: 0,
    pessoas: [],
    diasRetencao: 30,
    dataExclusaoPrevista: '2027-06-21',
    dadosExcluidosEm: null,
    registrosIlegiveis: 0,
    podeRegistrar: true,
    ...dados,
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined
let janela: { opener: unknown; location: { href: string }; close: ReturnType<typeof vi.fn> }

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
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir(): Promise<Montagem> {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/confirmacoes`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

function rotas(painel = painelExemplo(), arquivado = false) {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado, data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' }))),
    quando('GET', ROTA_PAINEL, () => respostaJson(painel)),
    quando('GET', ROTA_RESTRICOES, () => respostaJson(relatorio())),
  ]
}

describe('PainelConfirmacoesView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] mostra prazo, pessoas, estimativa, caminho dos convites, restrições e pendentes', async () => {
    rotearFetch(fetchSimulado, ...rotas())
    await abrir()

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CONFIRMACOES.titulo)
    expect(wrapper!.get('[data-teste="indicador-prazo"]').text()).toContain('Respostas até 12 de maio')
    expect(wrapper!.get('[data-teste="indicador-prazo"]').text()).toContain('faltam 5 dias')
    expect(wrapper!.get('[data-teste="contagem-confirmadas"]').text()).toContain('4')
    expect(wrapper!.get('[data-teste="contagem-confirmadas"]').text()).toContain('3 adultos e 1 criança')
    expect(wrapper!.get('[data-teste="contagem-pendentes"]').text()).toContain('1')
    expect(wrapper!.get('[data-teste="contagem-recusadas"]').text()).toContain('1')
    expect(wrapper!.get('[data-teste="contagem-pessoas"]').text()).toContain('6')
    expect(wrapper!.get('[data-teste="comparacao-estimativa"]').text()).toBe('6 de 150 estimados · 144 abaixo')
    expect(wrapper!.get('[data-teste="legenda-naoEnviados"] dd').text()).toBe('1')
    expect(wrapper!.get('[data-teste="legenda-enviados"] dd').text()).toBe('1')
    expect(wrapper!.get('[data-teste="legenda-visualizados"] dd').text()).toBe('1')
    expect(wrapper!.get('[data-teste="respondidos"]').text()).toBe('2 respondidos · 1 aguardando resposta')
    expect(wrapper!.get('[data-teste="cardapio-SemGluten"] dd').text()).toBe('3')
    expect(wrapper!.get('[data-teste="ver-restricoes"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/restricoes-alimentares`)
    const pendente = wrapper!.get('[data-teste="pendente"]')
    expect(pendente.text()).toContain('Família Lima')
    expect(pendente.text()).toContain('Bia Lima')
    expect(pendente.text()).toContain('1 de 2 sem resposta')
    expect(wrapper!.text()).not.toContain('11987654321')
    expect(document.title).toContain('Confirmações')
  })

  it('[COMPONENTE] sem estimativa não mostra comparação e sem pendentes mostra mensagem de sucesso', async () => {
    rotearFetch(fetchSimulado, ...rotas(painelExemplo({ convidadosEstimados: null, pendentes: [] })))
    await abrir()

    expect(wrapper!.find('[data-teste="comparacao-estimativa"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="pendentes-vazio"]').text()).toContain(TEXTOS_CONFIRMACOES.pendentesVazio)
  })

  it('[COMPONENTE] evento sem convites mostra vazio e esconde exportação', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(painelExemplo({ convites: { total: 0, naoEnviados: 0, enviados: 0, visualizados: 0, respondidos: 0, aguardandoResposta: 0 }, pendentes: [] })),
    )
    await abrir()

    expect(wrapper!.get('[data-teste="painel-vazio"]').text()).toContain(TEXTOS_CONFIRMACOES.vazioTitulo)
    expect(wrapper!.find('[data-teste="baixar-planilha"]').exists()).toBe(false)
  })

  it('[COMPONENTE] erro ao carregar oferece tentar de novo e recarrega', async () => {
    let falhar = true
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_PAINEL, () => (falhar ? respostaProblema(500) : respostaJson(painelExemplo()))),
      quando('GET', ROTA_RESTRICOES, () => respostaJson(relatorio())),
    )
    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_CONFIRMACOES.erroCarregar)
    falhar = false
    const botao = wrapper!.findAll('button').find((item) => item.text().includes('Tentar'))
    await botao!.trigger('click')
    await flushPromises()

    expect(wrapper!.find('[data-teste="indicador-prazo"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] evento de outra organização mostra não encontrado', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaProblema(404)),
      quando('GET', ROTA_PAINEL, () => respostaProblema(404)),
      quando('GET', ROTA_RESTRICOES, () => respostaProblema(404)),
    )
    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_CONFIRMACOES.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="voltar-eventos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha só nas restrições não derruba o painel', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_PAINEL, () => respostaJson(painelExemplo())),
      quando('GET', ROTA_RESTRICOES, () => respostaProblema(500)),
    )
    await abrir()

    expect(wrapper!.get('[data-teste="erro-restricoes"]').text()).toContain(TEXTOS_CONFIRMACOES.erroRestricoes)
    expect(wrapper!.find('[data-teste="indicador-prazo"]').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] Baixar planilha exporta em CSV, baixa o arquivo sem contato e avisa', async () => {
    const baixar = vi.spyOn(arquivo, 'baixarTexto').mockImplementation(() => undefined)
    rotearFetch(fetchSimulado, ...rotas(), quando('GET', `${ROTA_EVENTO}/exportacao-buffet?formato=csv`, () => respostaJson(exportacaoExemplo())))
    await abrir()

    await wrapper!.get('[data-teste="baixar-planilha"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', `${ROTA_EVENTO}/exportacao-buffet?formato=csv`)).toHaveLength(1)
    expect(baixar).toHaveBeenCalledTimes(1)
    const [nome, conteudo] = baixar.mock.calls[0]!
    expect(nome).toBe('buffet-ana-beatriz-e-bruno-2027-05-22.csv')
    expect(conteudo).toContain('Família Souza;Lia Souza;Criança')
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_CONFIRMACOES.csvBaixado)
  })

  it('[COMPONENTE] erro na exportação avisa sem baixar', async () => {
    const baixar = vi.spyOn(arquivo, 'baixarTexto').mockImplementation(() => undefined)
    rotearFetch(fetchSimulado, ...rotas(), quando('GET', `${ROTA_EVENTO}/exportacao-buffet?formato=csv`, () => respostaProblema(500)))
    await abrir()

    await wrapper!.get('[data-teste="baixar-planilha"]').trigger('click')
    await flushPromises()

    expect(baixar).not.toHaveBeenCalled()
    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_CONFIRMACOES.erroExportar)
  })

  it('[COMPONENTE] versão para impressão abre a ficha em nova aba sem navegar a aba atual', async () => {
    rotearFetch(fetchSimulado, ...rotas())
    const montagem = await abrir()

    await wrapper!.get('[data-teste="abrir-impressao"]').trigger('click')
    await flushPromises()

    expect(window.open).toHaveBeenCalledWith(`/eventos/${ID_EVENTO}/confirmacoes/buffet`, '_blank')
    expect(janela.opener).toBeNull()
    expect(montagem.roteador.currentRoute.value.name).toBe('painel-confirmacoes')
  })

  it('[COMPONENTE] com pop-up bloqueado a ficha abre na própria aba', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    rotearFetch(fetchSimulado, ...rotas(), quando('GET', `${ROTA_EVENTO}/exportacao-buffet?formato=impressao`, () => respostaJson(exportacaoExemplo())))
    const montagem = await abrir()

    await wrapper!.get('[data-teste="abrir-impressao"]').trigger('click')
    await flushPromises()

    await aguardarRota(montagem.roteador, 'impressao-buffet')
  })

  it('[INTEGRAÇÃO] reenviar pelo WhatsApp a partir do pendente marca enviado e recarrega o painel', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(),
      quando('POST', `${ROTA_CONVITE}/link-rsvp`, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })),
      quando('POST', `${ROTA_CONVITE}/envio`, () => respostaJson({})),
    )
    await abrir()

    await wrapper!.get('[data-teste="enviar-whatsapp"]').trigger('click')
    await flushPromises()

    const destino = new URL(janela.location.href)
    expect(destino.origin + destino.pathname).toBe('https://wa.me/5511987654321')
    expect(destino.searchParams.get('text')).toContain('Olá, Família Lima!')
    expect(destino.searchParams.get('text')).toContain(`/rsvp/${TOKEN}`)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CONVITE}/envio`)).toHaveLength(1)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PAINEL)).toHaveLength(2)
  })

  it('[INTEGRAÇÃO] pré-visualizar abre o link com previa=1 sem marcar envio', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('POST', `${ROTA_CONVITE}/link-rsvp`, () => respostaJson({ token: TOKEN, geradoEm: '2026-09-29T12:00:00Z' })))
    await abrir()

    await wrapper!.get('[data-teste="menu-acoes"]').trigger('click')
    await flushPromises()
    const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((elemento) => elemento.textContent?.includes(TEXTOS_PREVIA_RSVP.acao))
    ;((item!.querySelector('a, div') ?? item) as HTMLElement).click()
    await flushPromises()

    expect(janela.location.href).toBe(`${window.location.origin}/rsvp/${TOKEN}?previa=1`)
    expect(janela.opener).toBeNull()
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CONVITE}/envio`)).toHaveLength(0)
  })

  it('[COMPONENTE] evento arquivado mostra aviso, esconde WhatsApp e alterar prazo, mas exporta', async () => {
    rotearFetch(fetchSimulado, ...rotas(painelExemplo({ eventoArquivado: true, prazo: { dataLimite: '2027-05-12', diasRestantes: 5, aceitaRespostas: false } }), true))
    await abrir()

    expect(wrapper!.find('[data-teste="aviso-arquivado"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="enviar-whatsapp"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="alterar-prazo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="baixar-planilha"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="indicador-prazo"]').text()).toContain('Prazo encerrado')
  })
})
