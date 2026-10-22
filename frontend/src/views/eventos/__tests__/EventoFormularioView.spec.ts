import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from './auxiliaresEventos'

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
