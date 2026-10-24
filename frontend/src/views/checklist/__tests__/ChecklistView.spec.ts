import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import {
  DATA_EVENTO,
  ID_MODELO,
  aplicacaoExemplo,
  checklistExemplo,
  itemModelo,
  modeloCompleto,
  resumoModelo,
  tarefaChecklist,
} from '@/__tests__/auxiliaresChecklist'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import type { ChecklistEventoDto } from '@/tipos/checklist'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-checklist')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CHECKLIST = `${ROTA_EVENTO}/checklist`
const ROTA_PREVIA = `${ROTA_CHECKLIST}/previa?modeloId=${ID_MODELO}`
const ROTA_APLICACOES = `${ROTA_CHECKLIST}/aplicacoes`
const ROTA_MODELOS = '/api/modelos-checklist'

const LOCAL = tarefaChecklist({ id: 'a', titulo: 'Reservar local', prazo: '2026-12-12', status: 'Concluida', concluidaEm: '2026-09-01T12:00:00Z', concluidaPor: 'Assessoria' })
const BUFFET = tarefaChecklist({ id: 'b', titulo: 'Contratar buffet', prazo: '2026-12-12' })
const PROVA = tarefaChecklist({ id: 'c', titulo: 'Prova final dos trajes', prazo: '2027-11-12', responsavel: 'Anfitriao', categoria: 'TrajesBeleza' })

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

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
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/checklist`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

describe('ChecklistView', () => {
  it('[COMPONENTE] evento sem checklist oferece o modelo sugerido com prévia e aplica', async () => {
    let checklist: ChecklistEventoDto = checklistExemplo([])
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklist)),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ id: 'outro', nome: 'Outro', sugerido: false }), resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 26, nascemAtrasadas: 3 }))),
      quando('POST', ROTA_APLICACOES, () => {
        checklist = checklistExemplo([BUFFET, PROVA])
        return respostaJson(aplicacaoExemplo({ tarefasCriadas: 26, nascemAtrasadas: 3 }))
      }),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('h1').text()).toBe(TEXTOS_CHECKLIST.titulo)
    expect(wrapper.text()).toContain('O casamento ainda não tem checklist')
    expect(wrapper.get('[data-teste="aplicar-modelo"]').text()).toBe('Aplicar checklist')
    const previa = wrapper.get('[data-teste="previa-aplicacao"]')
    expect(previa.attributes('aria-live')).toBe('polite')
    expect(previa.text()).toContain('Vai criar 26 tarefas.')
    expect(previa.text()).toContain('3 nascem atrasadas')

    await wrapper.get('[data-teste="aplicar-modelo"]').trigger('click')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_APLICACOES)
    expect(corpoDaChamada(chamada!)).toEqual({ modeloId: ID_MODELO })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('26 tarefas criadas no checklist. 3 já nascem atrasadas.')
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="regua-marcos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] agrupa as tarefas por marco, mostra o percentual e o indicador na navegação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, BUFFET, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="percentual-checklist"]').text()).toBe('33%')
    expect(wrapper.get('[data-teste="frase-progresso"]').text()).toBe('1 de 3 concluídas')
    expect(wrapper.find('[data-teste="marco-dozeMeses"]').text()).toContain('Contratar buffet')
    expect(wrapper.find('[data-teste="marco-trintaDias"]').text()).toContain('Prova final dos trajes')
    expect(wrapper.find('[data-teste="marco-seisMeses"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(false)
    const item = wrapper.findAll('[data-teste="item-evento"]').find((atual) => atual.text().startsWith('Checklist'))!
    expect(item.attributes('aria-current')).toBe('page')
    expect(item.get('[data-teste="indicador-modulo"]').text()).toContain('33%')
    expect(wrapper.get('[data-teste="ver-tarefas"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/tarefas`)

    await wrapper.get('[data-teste="abrir-aplicar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(true)
  })

  it('[COMPONENTE] concluir pelo anel atualiza a tarefa e oferece Desfazer', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('PATCH', `${ROTA_EVENTO}/tarefas/b/status`, () => respostaJson({ ...BUFFET, status: 'Concluida', concluidaPor: 'Assessoria', concluidaEm: '2026-09-30T12:00:00Z' })),
    )
    const { wrapper } = await abrir()

    await wrapper.get('[data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PATCH', `${ROTA_EVENTO}/tarefas/b/status`)
    expect(corpoDaChamada(chamada!)).toEqual({ status: 'Concluida' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Tarefa concluída.', expect.objectContaining({ desfazer: expect.any(Function) }))
  })

  it('[COMPONENTE] limite de 500 bloqueia a aplicação com mensagem clara', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 30, tarefasNoEvento: 480, excedeLimite: true }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="previa-limite"]').text()).toContain('passaria de 500 tarefas (hoje tem 480, o modelo cria 30)')
    expect(wrapper.get('[data-teste="aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] reaplicar sem itens novos desabilita o botão', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 0, jaAplicadas: 26 }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="previa-aplicacao"]').text()).toContain(TEXTOS_CHECKLIST.previaNada)
    expect(wrapper.get('[data-teste="aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] 422 na aplicação aparece no painel', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo())),
      quando('POST', ROTA_APLICACOES, () => respostaProblema(422, { title: 'Regra', detail: 'Este evento está arquivado.' })),
    )
    const { wrapper } = await abrir()

    await wrapper.get('[data-teste="aplicar-modelo"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-teste="erro-aplicacao"]').text()).toContain('Este evento está arquivado.')
  })

  it('[COMPONENTE] prazos desatualizados pedem confirmação antes de recalcular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET], { prazosDesatualizados: 1 }))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('POST', `${ROTA_CHECKLIST}/recalculo-prazos`, () => respostaJson({ tarefas: 1 })),
    )
    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="aviso-prazos"]').text()).toContain('1 prazo não acompanha a data do evento.')
    await wrapper.get('[data-teste="recalcular-prazos"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CHECKLIST}/recalculo-prazos`)).toHaveLength(0)

    const confirmar = document.body.querySelector<HTMLButtonElement>('[data-teste="dialogo-confirmacao-confirmar"]')!
    confirmar.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CHECKLIST}/recalculo-prazos`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Prazo de 1 tarefa recalculado.')
  })

  it('[COMPONENTE] evento arquivado fica em leitura', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO, arquivado: true }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET], { eventoArquivado: true, prazosDesatualizados: 1 }))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_CHECKLIST.arquivado)
    expect(wrapper.find('[data-teste="aviso-prazos"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="abrir-aplicar"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem permissão e erro de rede usam os estados padrão', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CHECKLIST, () => respostaProblema(403, { title: 'Proibido' })),
      quando('GET', ROTA_MODELOS, () => respostaJson([])),
    )
    const { wrapper } = await abrir()
    expect(wrapper.text()).toContain(TEXTOS_CHECKLIST.semAcesso)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CHECKLIST, () => respostaProblema(500, { title: 'Erro' })),
      quando('GET', ROTA_MODELOS, () => respostaJson([])),
    )
    const segunda = await abrir()
    expect(segunda.wrapper.text()).toContain(TEXTOS_CHECKLIST.erroTitulo)
  })
})

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

describe('ChecklistView — reestruturação da fundação', () => {
  it('[COMPONENTE] lateral de progresso vem antes da régua e resume cada marco', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, BUFFET, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    const lateral = wrapper.get('[data-teste="lateral-checklist"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-labelledby')).toBe('titulo-progresso-checklist')
    const titulo = lateral.get('#titulo-progresso-checklist')
    expect(titulo.text()).toBe(TEXTOS_CHECKLIST.progressoTitulo)
    expect(titulo.classes()).toContain('texto-rotulo')
    expect(lateral.get('[data-teste="percentual-checklist"]').text()).toBe('33%')
    expect(lateral.get('[data-teste="barra-checklist"]').attributes('role')).toBe('progressbar')
    expect(lateral.get('.checklist__progresso').classes()).toContain('cartao')

    const porMarco = lateral.get('[data-teste="progresso-por-marco"]')
    expect(porMarco.get('h3').text()).toBe(TEXTOS_CHECKLIST.porMarcoTitulo)
    expect(porMarco.get('dl').attributes('aria-labelledby')).toBe('titulo-por-marco')
    expect(porMarco.get('[data-teste="resumo-marco-dozeMeses"] dt').text()).toBe('12 meses')
    expect(porMarco.get('[data-teste="resumo-marco-dozeMeses"] dd').text()).toBe('1 de 2 concluídas')
    expect(porMarco.get('[data-teste="resumo-marco-trintaDias"] dd').text()).toBe('0 de 1 concluída')
    expect(porMarco.findAll('dt')).toHaveLength(2)
    expect(lateral.find('[data-teste="ver-tarefas"]').exists()).toBe(true)

    const filhos = Array.from(wrapper.get('.checklist__corpo').element.children)
    expect(filhos[0]?.getAttribute('data-teste')).toBe('lateral-checklist')
    expect(filhos[1]?.classList.contains('checklist__principal')).toBe(true)
    expect(filhos[1]?.querySelector('[data-teste="regua-marcos"]')).not.toBeNull()
  })

  it('[COMPONENTE] cada marco lista as tarefas em cartão e o marco encerrado aparece concluído na régua e na lateral', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    const doze = wrapper.get('[data-teste="marco-dozeMeses"]')
    expect(doze.classes()).toContain('regua__marco--concluido')
    const lista = doze.get('ul')
    expect(lista.classes()).toEqual(expect.arrayContaining(['checklist__lista', 'cartao']))
    expect(lista.attributes('aria-labelledby')).toBe(doze.get('h2').attributes('id'))
    expect(wrapper.get('[data-teste="marco-trintaDias"]').classes()).not.toContain('regua__marco--concluido')
    expect(wrapper.get('[data-teste="resumo-marco-dozeMeses"]').classes()).toContain('checklist__marco--concluido')
    expect(wrapper.get('[data-teste="resumo-marco-trintaDias"]').classes()).not.toContain('checklist__marco--concluido')
  })

  it('[COMPONENTE] sem checklist a lateral explica os marcos depois da coluna principal e o painel de aplicar fica em cartão', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo())),
    )

    const { wrapper } = await abrir()

    const lateral = wrapper.get('[data-teste="lateral-checklist"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-labelledby')).toBe('titulo-como-organiza')
    expect(lateral.get('#titulo-como-organiza').text()).toBe(TEXTOS_CHECKLIST.comoOrganizaTitulo)
    expect(lateral.get('[data-teste="como-organiza"]').text()).toContain('a partir da data do casamento: 12 meses')
    expect(lateral.find('[data-teste="progresso-por-marco"]').exists()).toBe(false)
    expect(lateral.find('[data-teste="ver-tarefas"]').exists()).toBe(false)
    const filhos = Array.from(wrapper.get('.checklist__corpo').element.children)
    expect(filhos[0]?.classList.contains('checklist__principal')).toBe(true)
    expect(filhos[1]?.getAttribute('data-teste')).toBe('lateral-checklist')

    const painel = wrapper.get('.checklist__principal [data-teste="painel-aplicar"]')
    expect(painel.classes()).toContain('cartao')
    expect(painel.attributes('aria-labelledby')).toBe('titulo-aplicar-modelo')
    expect(wrapper.find('[data-teste="regua-marcos"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos usam a largura do painel, o ritmo da fundação e verde de sucesso no concluído', () => {
    const view = estiloDe(lerFonte('views/checklist/ChecklistView.vue'))
    expect(view).not.toContain('--p-dimensao-largura-leitura')
    expect(view).not.toMatch(/--p-espaco-\d/)
    expect(view).not.toMatch(/margin[^;]*:\s*-/)
    expect(view).not.toContain('--p-cor-primaria')
    expect(view).toContain('container: checklist com-lateral / inline-size')
    expect(view).toContain('@container com-lateral (min-width: 52rem)')
    expect(view).not.toContain('position: sticky')
    expect(view).not.toContain('@media')
    expect(view).toContain('@container aplicar-modelo (min-width: 28rem)')
    expect(view).toMatch(/@container checklist \(max-width: 35\.99rem\) \{\s*\.checklist__por-marco \{\s*display: none;/)

    const regua = estiloDe(lerFonte('componentes/base/ReguaMarcos.vue'))
    expect(regua).toMatch(/\.regua__marco--concluido \.regua__no \{\s*background: var\(--p-cor-sucesso\);\s*border-color: var\(--p-cor-sucesso\);/)
    expect(regua).not.toContain('--p-cor-primaria')
    expect(regua).toMatch(/\.regua__numero \{[^}]*font-weight: var\(--p-fonte-peso-leve\)/)
    expect(regua).not.toContain('@media')
    expect(regua).toContain('container: regua / inline-size')
    expect(regua).toContain('@container regua (min-width: 36rem)')

    const modelo = estiloDe(lerFonte('views/modelosChecklist/ModeloChecklistView.vue'))
    expect(modelo).toMatch(/@container modelo \(max-width: 35\.99rem\) \{\s*\.modelo__bloco--por-marco \{\s*display: none;/)

    const progresso = estiloDe(lerFonte('componentes/base/ProgressoChecklist.vue'))
    expect(progresso).not.toContain('--p-cor-primaria')
    expect(progresso).toMatch(/\.progresso-checklist__percentual \{[^}]*color: var\(--p-cor-sucesso-texto\)/)
    expect(progresso).toMatch(/\.progresso-checklist__preenchimento \{[^}]*background: var\(--p-cor-sucesso\)/)
    expect(progresso).not.toMatch(/:\s*\d+px;/)
  })
})

describe('ChecklistView — evoluída para eventos', () => {
  const ROTA_MODELO = `${ROTA_MODELOS}/${ID_MODELO}`
  const CASOS = [
    { tipo: 'Casamento', artigo: 'o casamento', contracaoDe: 'do casamento', vazio: 'O casamento ainda não tem checklist' },
    { tipo: 'QuinzeAnos', artigo: 'a festa de 15 anos', contracaoDe: 'da festa de 15 anos', vazio: 'A festa de 15 anos ainda não tem checklist' },
    { tipo: 'Aniversario', artigo: 'o aniversário', contracaoDe: 'do aniversário', vazio: 'O aniversário ainda não tem checklist' },
    { tipo: 'Comemoracao', artigo: 'a comemoração', contracaoDe: 'da comemoração', vazio: 'A comemoração ainda não tem checklist' },
  ] as const

  const NO_DIA = tarefaChecklist({ id: 'd', titulo: 'Receber convidados', prazo: DATA_EVENTO })
  const ATRASADA = tarefaChecklist({ id: 'e', titulo: 'Fechar decoração', prazo: '2026-12-12', atrasada: true })

  it.each(CASOS)('[COMPONENTE] $tipo: falta para o evento, nota dos marcos e complemento do dia usam o vocabulário', async (caso) => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO, tipo: caso.tipo, diasRestantes: 42 }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, NO_DIA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ tipoEvento: caso.tipo })])),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="falta-para-evento"]').text()).toBe(`Faltam 42 dias para ${caso.artigo}.`)
    expect(wrapper.get('[data-teste="nota-marcos"]').text()).toBe(
      `Cada tarefa entra no marco do seu prazo, contado a partir da data ${caso.contracaoDe}.`,
    )
    expect(wrapper.get('[data-teste="marco-noDia"] h2').text()).toContain(caso.contracaoDe)
    expect(wrapper.get('main').text()).not.toMatch(caso.tipo === 'Casamento' ? /casal/i : /casamento|casal/i)
  })

  it.each(CASOS)('[COMPONENTE] $tipo: estado vazio cita o evento e mostra as tarefas do modelo selecionado sem link', async (caso) => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO, tipo: caso.tipo }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ tipoEvento: caso.tipo })])),
      quando('GET', ROTA_MODELO, () =>
        respostaJson(
          modeloCompleto([itemModelo(), itemModelo({ id: 'i2', titulo: 'Contratar fotografia', diasAntesDoEvento: 300 })], {
            tipoEvento: caso.tipo,
          }),
        ),
      ),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo())),
    )

    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain(caso.vazio)
    expect(wrapper.text()).toContain(`com prazos contados a partir da data ${caso.contracaoDe}.`)
    const sugestao = wrapper.get('[data-teste="lateral-checklist"] [data-teste="sugestao-tarefas-modelo"]')
    expect(sugestao.text()).toContain(
      `O modelo selecionado cria estas tarefas, com prazos contados a partir da data ${caso.contracaoDe}.`,
    )
    expect(sugestao.findAll('[data-teste="sugestao-item"]').map((item) => item.text())).toEqual([
      'Reservar local da cerimônia e da recepção',
      'Contratar fotografia',
    ])
    expect(sugestao.find('[data-teste="sugestao-aplicar"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="aplicar-modelo"]').text()).toBe(TEXTOS_CHECKLIST.aplicarPrimeiro)
  })

  it('[COMPONENTE] por marco mostra o que falta com atrasadas e marca o marco atual como Agora na lateral e na régua', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO, diasRestantes: 42 }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, BUFFET, ATRASADA, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    const doze = wrapper.get('[data-teste="resumo-marco-dozeMeses"]')
    expect(doze.get('dd').text()).toBe('1 de 3 concluídas')
    expect(doze.get('[data-teste="falta-marco"]').text()).toBe('Faltam 2, 1 atrasada')
    expect(doze.find('[data-teste="marco-agora"]').exists()).toBe(false)

    const trinta = wrapper.get('[data-teste="resumo-marco-trintaDias"]')
    expect(trinta.get('[data-teste="marco-agora"]').text()).toBe('Agora')
    expect(trinta.find('[data-teste="falta-marco"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-teste="marco-agora"]')).toHaveLength(1)

    expect(wrapper.get('[data-teste="marco-trintaDias"]').classes()).toContain('regua__marco--atual')
    expect(wrapper.get('[data-teste="marco-trintaDias"] [data-teste="regua-destaque"]').text()).toBe('Agora')
    expect(wrapper.get('[data-teste="marco-dozeMeses"]').classes()).not.toContain('regua__marco--atual')
    expect(wrapper.get('[data-teste="marco-dozeMeses"]').text()).toContain('1 de 3 concluídas, 1 atrasada')
  })

  it('[COMPONENTE] abrir Aplicar outro modelo leva o foco ao painel e Cancelar devolve ao botão; o progresso não repete rótulo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: DATA_EVENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo())),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('.checklist__progresso').attributes('aria-label')).toBeUndefined()

    await wrapper.get('[data-teste="abrir-aplicar"]').trigger('click')
    await flushPromises()
    const titulo = wrapper.get('#titulo-aplicar-modelo')
    expect(titulo.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(titulo.element)

    await wrapper.get('[data-teste="fechar-aplicar"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-teste="abrir-aplicar"]').element)
  })
})
