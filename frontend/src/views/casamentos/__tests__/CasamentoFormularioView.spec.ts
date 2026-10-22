import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, rotearFetch } from './auxiliaresCasamentos'

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
  return wrapper!.find(`#casamento-${campo}-erro`)
}

function colunaDe(campo: string) {
  return wrapper!.get(`#casamento-${campo}`).element.closest('.formulario-casamento__colunas')
}

describe('CasamentoFormularioView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho e formulário dividem a largura de formulário', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('header').text()).toContain(TEXTOS_CASAMENTOS.tituloNovo)
    expect(pagina.find('[data-teste="formulario-casamento"]').exists()).toBe(true)
    expect(pagina.find('[data-teste="a-partir-de-outro"]').exists()).toBe(true)
  })

  it('[COMPONENTE] quatro seções nomeadas no ritmo de bloco e grupo', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    const formulario = wrapper!.get('[data-teste="formulario-casamento"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const secoes = formulario.findAll('fieldset')
    expect(secoes).toHaveLength(4)
    for (const secao of secoes) {
      expect(secao.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
      expect(secao.get('legend').classes()).toContain('texto-rotulo')
    }
    expect(secoes.map((secao) => secao.get('legend').text())).toEqual([
      TEXTOS_CASAMENTOS.grupoCasal,
      TEXTOS_CASAMENTOS.grupoQuando,
      TEXTOS_CASAMENTOS.grupoOnde,
      TEXTOS_CASAMENTOS.grupoPlanejamento,
    ])
  })

  it('[COMPONENTE] campos curtos formam pares na grade de duas colunas e observações ocupam a linha toda', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

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
    await abrir('/casamentos/novo')

    await wrapper!.get('#casamento-nomePrimeiraPessoa').trigger('blur')
    await wrapper!.get('#casamento-convidadosEstimados').setValue('abc')
    await wrapper!.get('#casamento-convidadosEstimados').trigger('blur')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(0)
  })

  it('[COMPONENTE] após a tentativa, digitar um valor válido remove o erro sem sair do campo', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()
    expect(erroDe('data').exists()).toBe(true)

    await wrapper!.get('#casamento-data').setValue('2027-05-15')
    await flushPromises()

    expect(erroDe('data').exists()).toBe(false)
    expect(erroDe('nomePrimeiraPessoa').exists()).toBe(true)
  })

  it('[COMPONENTE] após a tentativa, sair de um campo inválido mostra o erro', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()
    expect(erroDe('convidadosEstimados').exists()).toBe(false)

    await wrapper!.get('#casamento-convidadosEstimados').setValue('abc')
    await wrapper!.get('#casamento-convidadosEstimados').trigger('blur')
    await flushPromises()

    expect(erroDe('convidadosEstimados').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] edição usa a mesma estrutura, preenchida, sem o atalho de duplicação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto({ localRecepcao: 'Casa Bela Vista' }))),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_CASAMENTOS.tituloEdicao)
    expect(pagina.find('header').text()).toContain('Ana Beatriz')
    expect(pagina.findAll('fieldset')).toHaveLength(4)
    expect((wrapper!.get('#casamento-localRecepcao').element as HTMLInputElement).value).toBe('Casa Bela Vista')
    expect((wrapper!.get('#casamento-data').element as HTMLInputElement).value).toBe('2027-05-15')
    expect(wrapper!.find('[data-teste="a-partir-de-outro"]').exists()).toBe(false)
    const salvar = wrapper!.findAllComponents(Button).find((botao) => botao.props('label') === TEXTOS_CASAMENTOS.salvarEdicao)
    expect(salvar).toBeDefined()
  })

  it('[COMPONENTE] erro ao carregar a edição fica dentro da largura de formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaProblema(500)))
    await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    expect(wrapper!.get('.pagina-formulario').find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="formulario-casamento"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão ao salvar mostra a mensagem e desabilita Salvar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
      quando('PUT', `/api/casamentos/${ID_CASAMENTO}`, () => respostaProblema(403)),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `/api/casamentos/${ID_CASAMENTO}`)).toHaveLength(1)
    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_CASAMENTOS.semPermissao)
    expect(wrapper!.get('[data-teste="salvar-casamento"]').attributes('disabled')).toBeDefined()
  })

  it('[UNITÁRIO] template valida no blur só após a tentativa e revalida ao digitar em todos os campos', () => {
    const fonte = readFileSync(resolve(__dirname, '../CasamentoFormularioView.vue'), 'utf-8')

    expect(fonte).not.toContain('formulario.validarCampo(')
    expect(fonte.match(/@blur="formulario\.validarAoSair\('\w+'\)"/g)).toHaveLength(9)
    expect(fonte.match(/@update:model-value="formulario\.revalidarAoDigitar\('\w+'\)"/g)).toHaveLength(9)
  })

  it('[UNITÁRIO] estilos usam só o ritmo e tokens, sem largura própria nem valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../CasamentoFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    const semMedia = estilo.replace(/@media[^{]+\{/g, '')

    expect(estilo).toContain('gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao)')
    expect(estilo).toContain('margin-bottom: var(--p-ritmo-grupo)')
    expect(estilo).not.toContain('max-width')
    expect(estilo).not.toContain('--p-espaco-')
    expect(semMedia).not.toMatch(/\d+(px|rem|em)\b/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
  })
})
