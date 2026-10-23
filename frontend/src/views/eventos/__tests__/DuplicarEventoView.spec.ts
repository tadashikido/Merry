import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import type { PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'
import { ID_EVENTO, RaizRotas, quando, resumoEvento, rotearFetch, type Rota } from './auxiliaresEventos'

await precarregarRotas('evento-duplicar')

const ROTA_PREVIA = `/api/eventos/${ID_EVENTO}/duplicacao/previa`
const CAMINHO_TELA = `/eventos/novo/a-partir-de-outro?origem=${ID_EVENTO}`
const CAMPOS = ['nomePrimeiraPessoa', 'nomeSegundaPessoa', 'data', 'horario', 'localCerimonia', 'localRecepcao']

function previa(): PreviaDuplicacaoDto {
  return {
    origem: resumoEvento({ nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João' }),
    tarefas: 29,
    tarefasDoChecklist: 26,
    tarefasNascemAtrasadas: 0,
    tarefasCanceladasIgnoradas: 0,
    fornecedores: 3,
    fornecedoresIgnorados: 0,
    itensCronograma: 7,
  }
}

function previaResponde(resposta: () => Response): Rota {
  return (url, init) => ((init?.method ?? 'GET') === 'GET' && url.startsWith(ROTA_PREVIA) ? resposta() : undefined)
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

async function abrir(caminho = CAMINHO_TELA) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function erroDe(campo: string) {
  return wrapper!.find(`#duplicacao-${campo}-erro`)
}

function colunaDe(campo: string) {
  return wrapper!.get(`#duplicacao-${campo}`).element.closest('.duplicar__colunas')
}

describe('DuplicarEventoView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho e formulário dividem a largura de formulário', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('header').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.titulo)
    expect(pagina.find('[data-teste="formulario-duplicacao"]').exists()).toBe(true)
    expect(pagina.get('[data-teste="resumo-origem"]').classes()).toContain('cartao')
  })

  it('[COMPONENTE] seções nomeadas no ritmo de bloco e grupo com legendas discretas', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    const formulario = wrapper!.get('[data-teste="formulario-duplicacao"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const secoes = formulario.findAll('fieldset')
    expect(secoes.map((secao) => secao.get('legend').text())).toEqual([
      TEXTOS_DUPLICACAO_EVENTO.grupoNovoAnfitriao,
      TEXTOS_EVENTOS.grupoQuando,
      TEXTOS_EVENTOS.grupoOnde,
      TEXTOS_DUPLICACAO_EVENTO.grupoLevar,
    ])
    for (const secao of secoes) {
      expect(secao.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
      expect(secao.get('legend').classes()).toContain('texto-rotulo')
    }
  })

  it('[COMPONENTE] campos curtos formam pares na grade de duas colunas', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    expect(colunaDe('nomePrimeiraPessoa')).not.toBeNull()
    expect(colunaDe('nomePrimeiraPessoa')).toBe(colunaDe('nomeSegundaPessoa'))
    expect(colunaDe('data')).toBe(colunaDe('horario'))
    expect(colunaDe('localCerimonia')).toBe(colunaDe('localRecepcao'))
    expect(colunaDe('localCerimonia')).not.toBe(colunaDe('data'))
  })

  it('[COMPONENTE] o que vai e o que fica formam um par lado a lado antes das ações', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    const reaproveitamento = wrapper!.get('[data-teste="reaproveitamento"]')
    expect(reaproveitamento.classes()).toContain('duplicar__reaproveitamento--par')
    expect(reaproveitamento.find('[data-teste="opcoes-copia"]').exists()).toBe(true)
    const fica = reaproveitamento.get('[data-teste="lista-nao-copiado"]')
    expect(fica.classes()).toContain('duplicar__fica')
    expect(fica.get('h2').classes()).toContain('texto-rotulo')
    expect(fica.get('h2').text()).toBe('Fica com Ana & João')
    expect(reaproveitamento.element.nextElementSibling?.classList.contains('duplicar__acoes')).toBe(true)
  })

  it('[COMPONENTE] sem origem escolhida a lista do que vai ocupa a linha toda', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento()])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
    )
    await abrir('/eventos/novo/a-partir-de-outro')

    const reaproveitamento = wrapper!.get('[data-teste="reaproveitamento"]')
    expect(reaproveitamento.classes()).not.toContain('duplicar__reaproveitamento--par')
    expect(reaproveitamento.find('[data-teste="lista-nao-copiado"]').exists()).toBe(false)
    expect(wrapper!.find('#duplicacao-origem').exists()).toBe(true)
  })

  it('[COMPONENTE] sair de um campo vazio antes de tentar criar não mostra erro', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    await wrapper!.get('#duplicacao-nomePrimeiraPessoa').trigger('blur')
    await wrapper!.get('#duplicacao-data').trigger('blur')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(0)
  })

  it('[COMPONENTE] após a tentativa, digitar um valor válido remove o erro sem sair do campo', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()
    expect(erroDe('nomeSegundaPessoa').exists()).toBe(true)

    await wrapper!.get('#duplicacao-nomeSegundaPessoa').setValue('Diego')
    await flushPromises()

    expect(erroDe('nomeSegundaPessoa').exists()).toBe(false)
    expect(erroDe('nomePrimeiraPessoa').exists()).toBe(true)
  })

  it('[COMPONENTE] após a tentativa, sair de um campo inválido mostra o erro', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaJson(previa())))
    await abrir()

    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()
    expect(erroDe('localCerimonia').exists()).toBe(false)

    await wrapper!.get('#duplicacao-localCerimonia').setValue('x'.repeat(300))
    await wrapper!.get('#duplicacao-localCerimonia').trigger('blur')
    await flushPromises()

    expect(erroDe('localCerimonia').exists()).toBe(true)
  })

  it('[SEGURANÇA] origem de outra organização mostra não encontrado dentro da largura de formulário', async () => {
    rotearFetch(fetchSimulado, previaResponde(() => respostaProblema(404)))
    await abrir()

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(pagina.find('[data-teste="voltar-eventos"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="formulario-duplicacao"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] template valida no blur só após a tentativa e revalida ao digitar em todos os campos', () => {
    const fonte = readFileSync(resolve(__dirname, '../DuplicarEventoView.vue'), 'utf-8')

    expect(fonte).not.toContain('formulario.validarCampo(')
    for (const campo of CAMPOS) {
      expect(fonte).toContain(`@blur="formulario.validarAoSair('${campo}')"`)
      expect(fonte).toContain(`@update:model-value="formulario.revalidarAoDigitar('${campo}')"`)
    }
  })

  it('[UNITÁRIO] estilos usam só o ritmo e tokens, sem largura própria nem valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../DuplicarEventoView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    const semMedia = estilo.replace(/@media[^{]+\{/g, '').replace(/1px solid/g, '')

    expect(estilo).toContain('grid-template-columns: minmax(0, 3fr) minmax(0, 2fr)')
    expect(estilo).not.toContain('max-width')
    expect(estilo).not.toContain('--p-espaco-')
    expect(semMedia).not.toMatch(/\d+(px|rem|em)\b/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
  })
})
