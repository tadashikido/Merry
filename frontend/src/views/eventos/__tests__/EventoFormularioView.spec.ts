import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS, TEXTOS_FORMULARIO_EVENTO } from '@/textos/eventos'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from './auxiliaresEventos'

await precarregarRotas('evento-novo', 'evento-editar')

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

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  return wrapper
}

function erroDe(campo: string) {
  return wrapper!.find(`#evento-${campo}-erro`)
}

function colunaDe(campo: string) {
  return wrapper!.get(`#evento-${campo}`).element.closest('.formulario-evento__colunas')
}

describe('EventoFormularioView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho e formulário dividem a largura de formulário', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('header').text()).toContain(TEXTOS_EVENTOS.tituloNovo)
    expect(pagina.find('[data-teste="formulario-evento"]').exists()).toBe(true)
    expect(pagina.find('[data-teste="a-partir-de-outro"]').exists()).toBe(true)
  })

  it('[COMPONENTE] quatro seções nomeadas no ritmo de bloco e grupo', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    const formulario = wrapper!.get('[data-teste="formulario-evento"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    expect(formulario.find('[data-teste="escolha-tipo-evento"]').exists()).toBe(true)
    const secoes = formulario.findAll('fieldset').filter((secao) => secao.attributes('data-teste') !== 'escolha-tipo-evento')
    expect(secoes).toHaveLength(4)
    for (const secao of secoes) {
      expect(secao.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
      expect(secao.get('legend').classes()).toContain('texto-rotulo')
    }
    expect(secoes.map((secao) => secao.get('legend').text())).toEqual([
      VOCABULARIO_TIPO_EVENTO.Casamento.homenageados.grupo,
      TEXTOS_EVENTOS.grupoQuando,
      TEXTOS_EVENTOS.grupoOnde,
      TEXTOS_EVENTOS.grupoPlanejamento,
    ])
  })

  it('[COMPONENTE] campos curtos formam pares na grade de duas colunas e observações ocupam a linha toda', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    expect(colunaDe('nomePrimeiraPessoa')).not.toBeNull()
    expect(colunaDe('nomePrimeiraPessoa')).toBe(colunaDe('nomeSegundaPessoa'))
    expect(colunaDe('data')).toBe(colunaDe('horario'))
    expect(colunaDe('localCerimonia')).toBe(colunaDe('localRecepcao'))
    expect(colunaDe('dataLimiteRsvp')).not.toBeNull()
    expect(colunaDe('dataLimiteRsvp')).not.toBe(colunaDe('data'))
    expect(colunaDe('convidadosEstimados')).not.toBeNull()
    expect(colunaDe('observacoes')).toBeNull()
  })

  it('[COMPONENTE] sair de um campo vazio antes de tentar salvar não mostra erro', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').trigger('blur')
    await wrapper!.get('#evento-convidadosEstimados').setValue('abc')
    await wrapper!.get('#evento-convidadosEstimados').trigger('blur')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(0)
  })

  it('[COMPONENTE] após a tentativa, digitar um valor válido remove o erro sem sair do campo', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()
    expect(erroDe('data').exists()).toBe(true)

    await wrapper!.get('#evento-data').setValue('2027-05-15')
    await flushPromises()

    expect(erroDe('data').exists()).toBe(false)
    expect(erroDe('nomePrimeiraPessoa').exists()).toBe(true)
  })

  it('[COMPONENTE] após a tentativa, sair de um campo inválido mostra o erro', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()
    expect(erroDe('convidadosEstimados').exists()).toBe(false)

    await wrapper!.get('#evento-convidadosEstimados').setValue('abc')
    await wrapper!.get('#evento-convidadosEstimados').trigger('blur')
    await flushPromises()

    expect(erroDe('convidadosEstimados').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] edição usa a mesma estrutura, preenchida, sem o atalho de duplicação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ localRecepcao: 'Casa Bela Vista' }))),
    )
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_EVENTOS.tituloEdicao)
    expect(pagina.find('header').text()).toContain('Ana Beatriz')
    expect(pagina.findAll('fieldset')).toHaveLength(5)
    expect((wrapper!.get('#evento-localRecepcao').element as HTMLInputElement).value).toBe('Casa Bela Vista')
    expect((wrapper!.get('#evento-data').element as HTMLInputElement).value).toBe('2027-05-15')
    expect(wrapper!.find('[data-teste="a-partir-de-outro"]').exists()).toBe(false)
    const salvar = wrapper!.findAllComponents(Button).find((botao) => botao.props('label') === TEXTOS_EVENTOS.salvarEdicao)
    expect(salvar).toBeDefined()
  })

  it('[COMPONENTE] erro ao carregar a edição fica dentro da largura de formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaProblema(500)))
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    expect(wrapper!.get('.pagina-formulario').find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="formulario-evento"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão ao salvar mostra a mensagem e desabilita Salvar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
      quando('PUT', `/api/eventos/${ID_EVENTO}`, () => respostaProblema(403)),
    )
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `/api/eventos/${ID_EVENTO}`)).toHaveLength(1)
    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_EVENTOS.semPermissao)
    expect(wrapper!.get('[data-teste="salvar-evento"]').attributes('disabled')).toBeDefined()
  })

  it('[UNITÁRIO] template valida no blur só após a tentativa e revalida ao digitar em todos os campos', () => {
    const fonte = readFileSync(resolve(__dirname, '../EventoFormularioView.vue'), 'utf-8')

    expect(fonte).not.toContain('formulario.validarCampo(')
    expect(fonte.match(/@blur="formulario\.validarAoSair\('\w+'\)"/g)).toHaveLength(9)
    expect(fonte.match(/@update:model-value="formulario\.revalidarAoDigitar\('\w+'\)"/g)).toHaveLength(9)
  })

  it('[UNITÁRIO] estilos usam só o ritmo e tokens, sem largura própria nem valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../EventoFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    const semContainer = estilo.replace(/@container[^{]+\{/g, '').replace(/1px solid/g, '')

    expect(estilo).toContain('gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao)')
    expect(estilo).toContain('margin-bottom: var(--p-ritmo-grupo)')
    expect(estilo).not.toContain('@media')
    expect(estilo).toContain('@container formulario-evento-campos (min-width: 36rem)')
    expect(estilo).toContain('@container formulario-evento (min-width: 64rem)')
    expect(estilo).not.toContain('--p-espaco-')
    expect(semContainer).not.toMatch(/\d+(px|rem|em)\b/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
  })
})

const ROTA_MODELOS_CHECKLIST = '/api/modelos-checklist'
const ROTA_MODELOS_CRONOGRAMA = '/api/modelos-cronograma'

function modelo(id: string, nome: string, tipoEvento: TipoEvento | null, sugerido: boolean, quantidadeItens: number) {
  return { id, nome, descricao: null, sugerido, quantidadeItens, atualizadoEm: '2026-10-01T12:00:00Z', tipoEvento, horarioReferencia: '16:00' }
}

const MODELOS_CHECKLIST = [
  modelo('c1', 'Checklist de casamento', 'Casamento', true, 52),
  modelo('c2', 'Checklist de aniversário', 'Aniversario', true, 40),
  modelo('c3', 'Checklist da casa', null, false, 12),
]
const MODELOS_CRONOGRAMA = [modelo('r1', 'Roteiro do casamento', 'Casamento', true, 1)]

function rotearComModelos() {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_MODELOS_CHECKLIST, () => respostaJson(MODELOS_CHECKLIST)),
    quando('GET', ROTA_MODELOS_CRONOGRAMA, () => respostaJson(MODELOS_CRONOGRAMA)),
  )
}

async function escolherTipo(tipo: TipoEvento) {
  await wrapper!.get(`[data-teste="tipo-evento-${tipo}"]`).setValue(true)
  await flushPromises()
}

function lateral() {
  return wrapper!.get('[data-teste="lateral-formulario-evento"]')
}

describe('EventoFormularioView com orientação por tipo de evento', () => {
  it('[COMPONENTE] formulário vem antes da lateral, que é um aside nomeado pelo título do tipo', async () => {
    rotearComModelos()
    await abrir('/eventos/novo')

    const filhos = Array.from(wrapper!.get('.formulario-evento__corpo').element.children)
    expect(filhos[0]?.querySelector('[data-teste="formulario-evento"]')).not.toBeNull()
    expect(filhos[1]?.getAttribute('data-teste')).toBe('lateral-formulario-evento')
    const aside = lateral().get('aside')
    const titulo = lateral().get(`#${aside.attributes('aria-labelledby')}`)
    expect(titulo.element.tagName).toBe('H2')
    expect(titulo.text()).toBe('Como organizar o casamento')
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] orientação acompanha o tipo %s com o vocabulário dele', async (tipo) => {
    rotearComModelos()
    await abrir('/eventos/novo')
    await escolherTipo(tipo)

    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]
    expect(lateral().get('aside h2').text()).toBe(TEXTOS_FORMULARIO_EVENTO.orientacaoTitulo(vocabulario.referencia.artigo))
    expect(lateral().get('[data-teste="orientacao-costuma-ter"]').text()).toContain(vocabulario.comoCostumaSer)
    expect(lateral().get('[data-teste="orientacao-homenageados"] h3').text()).toBe(vocabulario.homenageados.grupo)
    expect(lateral().get('[data-teste="orientacao-horario"] h3').text()).toBe(vocabulario.horario)
    expect(lateral().get('[data-teste="orientacao-local"] h3').text()).toBe(vocabulario.locais.campoPrincipal)
    expect(lateral().get('[data-teste="modelos-para-comecar"]').text()).toContain(vocabulario.referencia.contracaoDe)
  })

  it('[UNITÁRIO] cada tipo tem sua frase do que costuma ter, sem citar casamento fora do Casamento', () => {
    const frases = TIPOS_EVENTO.map((tipo) => VOCABULARIO_TIPO_EVENTO[tipo].comoCostumaSer)
    expect(new Set(frases).size).toBe(TIPOS_EVENTO.length)
    for (const tipo of TIPOS_EVENTO.filter((outro) => outro !== 'Casamento')) {
      expect(VOCABULARIO_TIPO_EVENTO[tipo].comoCostumaSer.toLowerCase()).not.toMatch(/casamento|noiv/)
    }
    const textosFixos = Object.values(TEXTOS_FORMULARIO_EVENTO).filter((texto) => typeof texto === 'string')
    expect(textosFixos.join(' ')).not.toMatch(/casamento|noiv|casal/i)
  })

  it('[INTEGRAÇÃO] mostra o modelo pré-selecionado do tipo com a quantidade e os outros disponíveis', async () => {
    rotearComModelos()
    await abrir('/eventos/novo')

    const checklist = lateral().get('[data-teste="modelo-checklist"]')
    expect(checklist.get('dt').text()).toBe(TEXTOS_FORMULARIO_EVENTO.checklist)
    expect(checklist.text()).toContain('Checklist de casamento')
    expect(checklist.text()).toContain('52 tarefas')
    expect(checklist.text()).toContain('mais 1 modelo disponível')
    const cronograma = lateral().get('[data-teste="modelo-cronograma"]')
    expect(cronograma.text()).toContain('Roteiro do casamento')
    expect(cronograma.text()).toContain('1 item')
    expect(cronograma.text()).not.toContain('mais')
    expect(lateral().get('[data-teste="modelos-para-comecar"]').text()).toContain('Nada é criado automaticamente.')

    await escolherTipo('Aniversario')
    expect(lateral().get('[data-teste="modelo-checklist"]').text()).toContain('Checklist de aniversário')
    expect(lateral().get('[data-teste="modelo-checklist"]').text()).toContain('40 tarefas')
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS_CHECKLIST)).toHaveLength(1)
  })

  it('[INTEGRAÇÃO] sem modelo para o tipo, a linha ensina onde criar', async () => {
    rotearComModelos()
    await abrir('/eventos/novo')
    await escolherTipo('QuinzeAnos')

    expect(lateral().get('[data-teste="modelo-checklist"]').text()).toContain('Checklist da casa')
    expect(lateral().get('[data-teste="sem-modelo-cronograma"]').text()).toBe(TEXTOS_FORMULARIO_EVENTO.semModeloCronograma)
  })

  it('[INTEGRAÇÃO] falha ao carregar modelos omite o bloco e não bloqueia o formulário', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS_CHECKLIST, () => respostaProblema(500)),
      quando('GET', ROTA_MODELOS_CRONOGRAMA, () => respostaProblema(500)),
    )
    await abrir('/eventos/novo')

    expect(lateral().find('[data-teste="modelos-para-comecar"]').exists()).toBe(false)
    expect(lateral().find('[data-teste="orientacao-tipo-evento"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="salvar-evento"]').attributes('disabled')).toBeUndefined()
    expect(document.activeElement?.id).toBe('evento-tipo-Casamento')
  })

  it('[INTEGRAÇÃO] edição mostra a orientação do tipo do evento sem buscar modelos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ tipo: 'Comemoracao', nomeSegundaPessoa: null }))),
    )
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    expect(lateral().get('aside h2').text()).toBe('Como organizar a comemoração')
    expect(lateral().find('[data-teste="modelos-para-comecar"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS_CHECKLIST)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS_CRONOGRAMA)).toHaveLength(0)
  })

  it('[UNITÁRIO] variação por tipo vem do vocabulário, sem condicional de tipo na tela nem na lateral', () => {
    const view = readFileSync(resolve(__dirname, '../EventoFormularioView.vue'), 'utf-8')
    const lateralFonte = readFileSync(resolve(__dirname, '../../../componentes/eventos/LateralFormularioEvento.vue'), 'utf-8')
    for (const fonte of [view, lateralFonte]) {
      expect(fonte).not.toMatch(new RegExp(`===\\s*'(${TIPOS_EVENTO.join('|')})'`))
      expect(fonte).not.toContain('@media')
    }
    expect(lateralFonte).not.toContain('<a ')
    expect(lateralFonte).not.toContain('RouterLink')
  })
})
