import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import AndamentoEvento from '@/componentes/eventos/AndamentoEvento.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_ANDAMENTO_EVENTO, descreverContagemAcessivel, legendaContagemDestaque } from '@/textos/eventos'
import { TIPO_EVENTO_NEUTRO, VOCABULARIO_TIPO_EVENTO, vocabularioOuNeutro } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { calcularPrazoConfirmacao } from '@/utilitarios/prazoConfirmacao'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, rotearFetch } from './auxiliaresEventos'

await precarregarRotas('evento')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`

const ESPERADO: Record<TipoEvento, { legenda: string; titulo: string; antes: string }> = {
  Casamento: { legenda: 'dias para o casamento', titulo: 'Andamento do casamento', antes: '10 dias antes do casamento' },
  QuinzeAnos: { legenda: 'dias para a festa de 15 anos', titulo: 'Andamento da festa de 15 anos', antes: '10 dias antes da festa de 15 anos' },
  Aniversario: { legenda: 'dias para o aniversário', titulo: 'Andamento do aniversário', antes: '10 dias antes do aniversário' },
  Comemoracao: { legenda: 'dias para a comemoração', titulo: 'Andamento da comemoração', antes: '10 dias antes da comemoração' },
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

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
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir(tipo: TipoEvento) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo, percentualChecklist: 45 }))),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}`)
  wrapper = await montarView(RaizRotas, montagem)
  return wrapper
}

function montarAndamento(dados: Partial<InstanceType<typeof AndamentoEvento>['$props']> = {}) {
  return mount(AndamentoEvento, {
    props: {
      eventoId: ID_EVENTO,
      tipo: 'Casamento',
      data: '2027-05-15',
      diasRestantes: 42,
      dataLimiteRsvpEfetiva: '2027-05-05',
      percentualChecklist: 45,
      exibirChecklist: true,
      ...dados,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('Visão do evento — variação por tipo', () => {
  it.each(TIPOS_EVENTO)('[COMPONENTE] %s: contagem e andamento usam a referência do tipo', async (tipo) => {
    const tela = await abrir(tipo)

    const contagem = tela.get('[data-teste="contagem-regressiva"]')
    expect(contagem.get('.contagem__legenda').text()).toBe(ESPERADO[tipo].legenda)
    expect(contagem.attributes('aria-label')).toBe(`Faltam 42 ${ESPERADO[tipo].legenda}`)
    const andamento = tela.get('[data-teste="andamento-evento"]')
    expect(andamento.get('h2').text()).toBe(ESPERADO[tipo].titulo)
    expect(andamento.get('[data-teste="andamento-confirmacao-antes"]').text()).toBe(ESPERADO[tipo].antes)
    expect(tela.get('[data-teste="tipo-evento"]').text()).toBe(VOCABULARIO_TIPO_EVENTO[tipo].rotulo)
  })

  it('[UNITÁRIO] textos de casamento não aparecem em eventos de outros tipos', async () => {
    const tela = await abrir('Aniversario')
    expect(tela.text().toLocaleLowerCase('pt-BR')).not.toContain('casamento')
  })

  it('[UNITÁRIO] tipo desconhecido usa o vocabulário neutro, nunca Casamento', () => {
    expect(TIPO_EVENTO_NEUTRO).toBe('Comemoracao')
    expect(vocabularioOuNeutro(null).referencia.artigo).toBe('a comemoração')
    expect(vocabularioOuNeutro('Desconhecido' as TipoEvento).referencia.contracaoDe).toBe('da comemoração')
    expect(vocabularioOuNeutro('QuinzeAnos').referencia.artigo).toBe('a festa de 15 anos')
  })

  it('[UNITÁRIO] contagem regressiva mantém "o evento" por padrão e aceita a referência', () => {
    expect(legendaContagemDestaque(42)).toBe('dias para o evento')
    expect(legendaContagemDestaque(1, 'a festa de 15 anos')).toBe('dia para a festa de 15 anos')
    expect(descreverContagemAcessivel(42, 'o aniversário')).toBe('Faltam 42 dias para o aniversário')
    expect(descreverContagemAcessivel(0, 'o aniversário')).toBe('É hoje')

    const padrao = mount(ContagemRegressiva, { props: { dias: 3, variante: 'destaque' } })
    expect(padrao.get('.contagem__legenda').text()).toBe('dias para o evento')
  })
})

describe('Andamento do evento', () => {
  it('[COMPONENTE] checklist mostra percentual, barra acessível e atalho para o checklist', () => {
    const andamento = montarAndamento()

    const item = andamento.get('[data-teste="andamento-checklist"]')
    expect(item.text()).toContain('45%')
    const barra = item.get('[role="progressbar"]')
    expect(barra.attributes('aria-valuenow')).toBe('45')
    expect(barra.attributes('aria-label')).toBe(TEXTOS_ANDAMENTO_EVENTO.checklistAria(45))
    const atalho = andamento.findAllComponents(RouterLinkStub).find((link) => link.text() === TEXTOS_ANDAMENTO_EVENTO.abrirChecklist)
    expect(atalho?.props('to')).toEqual({ name: 'evento-checklist', params: { id: ID_EVENTO } })
  })

  it('[COMPONENTE] sem checklist aplicado, ensina e oferece aplicar um modelo', () => {
    const andamento = montarAndamento({ percentualChecklist: null, tipo: 'QuinzeAnos' })

    const item = andamento.get('[data-teste="andamento-checklist"]')
    expect(item.text()).toContain(TEXTOS_ANDAMENTO_EVENTO.checklistVazioTitulo)
    expect(item.text()).toContain('tarefas da festa de 15 anos')
    expect(item.find('[role="progressbar"]').exists()).toBe(false)
    expect(item.get('[data-teste="andamento-aplicar-checklist"]').text()).toBe(TEXTOS_ANDAMENTO_EVENTO.aplicarChecklist)
  })

  it('[SEGURANÇA] checklist some quando não deve ser exibido ou quando o percentual não vem no contrato', () => {
    expect(montarAndamento({ exibirChecklist: false }).find('[data-teste="andamento-checklist"]').exists()).toBe(false)
    expect(montarAndamento({ percentualChecklist: undefined }).find('[data-teste="andamento-checklist"]').exists()).toBe(false)
  })

  it('[COMPONENTE] prazo de confirmação aberto mostra dias restantes, data e atalho para Confirmações', () => {
    const andamento = montarAndamento()

    const item = andamento.get('[data-teste="andamento-confirmacao"]')
    expect(item.get('[data-teste="andamento-confirmacao-valor"]').text()).toBe('32 dias')
    expect(item.text()).toContain('Respostas até 5 de maio')
    expect(item.get('.somente-leitor-tela').text()).toBe('Respostas até 5 de maio, faltam 32 dias')
    const atalho = item.findComponent(RouterLinkStub)
    expect(atalho.props('to')).toEqual({ name: 'painel-confirmacoes', params: { id: ID_EVENTO } })
    expect(atalho.text()).toBe(TEXTOS_ANDAMENTO_EVENTO.verConfirmacoes)
  })

  it('[COMPONENTE] prazo encerrado e prazo no dia do evento', () => {
    const encerrado = montarAndamento({ diasRestantes: 5 })
    const item = encerrado.get('[data-teste="andamento-confirmacao"]')
    expect(item.classes()).toContain('andamento__item--encerrado')
    expect(item.get('[data-teste="andamento-confirmacao-valor"]').text()).toBe(TEXTOS_ANDAMENTO_EVENTO.prazoEncerradoCurto)
    expect(item.text()).toContain('Prazo encerrado em 5 de maio')

    const noDia = montarAndamento({ tipo: 'Aniversario', dataLimiteRsvpEfetiva: '2027-05-15', diasRestantes: 0 })
    expect(noDia.get('[data-teste="andamento-confirmacao-antes"]').text()).toBe('No dia do aniversário')
    expect(noDia.get('[data-teste="andamento-confirmacao-valor"]').text()).toBe('Último dia')
  })

  it('[UNITÁRIO] calcula o prazo a partir da data do evento e dos dias restantes', () => {
    expect(calcularPrazoConfirmacao({ data: '2027-05-15', diasRestantes: 42, dataLimiteRsvpEfetiva: '2027-05-05' })).toEqual({
      diasAntesDoEvento: 10,
      diasRestantes: 32,
      encerrado: false,
    })
    expect(calcularPrazoConfirmacao({ data: '2027-05-15', diasRestantes: 10, dataLimiteRsvpEfetiva: '2027-05-05' })?.encerrado).toBe(false)
    expect(calcularPrazoConfirmacao({ data: '2027-05-15', diasRestantes: 9, dataLimiteRsvpEfetiva: '2027-05-05' })?.encerrado).toBe(true)
    expect(calcularPrazoConfirmacao({ data: 'invalida', diasRestantes: 9, dataLimiteRsvpEfetiva: '2027-05-05' })).toBeNull()
  })

  it('[UNITÁRIO] estilos do andamento usam ritmo e só @container para colunas', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const fonte = readFileSync(resolve(__dirname, '../../../componentes/eventos/AndamentoEvento.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).not.toMatch(/@media \((min|max)-width/)
    expect(estilo).toMatch(/@container andamento \(min-width: 34rem\)/)
    expect(estilo).not.toMatch(/--p-espaco-/)
  })
})
