import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('convidados-importar')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_PREVIA = `${ROTA_EVENTO}/convites/importacao/pre-visualizacao`
const ROTA_IMPORTACAO = `${ROTA_EVENTO}/convites/importacao`
const CAMINHO = `/eventos/${ID_EVENTO}/convidados/importar`

function lerArquivo(caminho: string): string {
  return readFileSync(resolve(__dirname, caminho), 'utf-8')
}

function estilo(conteudo: string): string {
  return conteudo.slice(conteudo.indexOf('<style scoped>'))
}

const ESTILO_VIEW = estilo(lerArquivo('../ImportarConvidadosView.vue'))
const ESTILO_PREVIA = estilo(lerArquivo('../../../componentes/convidados/PreviaImportacao.vue'))

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
  vi.unstubAllGlobals()
})

async function abrir(...rotas: Parameters<typeof rotearFetch>[1][]) {
  rotearFetch(fetchSimulado, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), ...rotas)
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

async function escolherArquivo(arquivo: File = new File(['Nome\nAna'], 'lista.csv', { type: 'text/csv' })) {
  const entrada = wrapper!.get('[data-teste="envio-arquivo-entrada"]')
  Object.defineProperty(entrada.element, 'files', { value: [arquivo], configurable: true })
  await entrada.trigger('change')
  await flushPromises()
}

describe('ImportarConvidadosView — reestruturação da fundação', () => {
  it('[COMPONENTE] etapa 1 agrupa envio e instruções em cartão na mesma grade', async () => {
    await abrir()

    const escolha = wrapper!.get('.importacao__escolha')
    expect(escolha.find('[data-teste="envio-arquivo"]').exists()).toBe(true)
    const instrucoes = escolha.get('[data-teste="como-montar"]')
    expect(instrucoes.classes()).toEqual(expect.arrayContaining(['cartao', 'pilha', 'pilha--grupo']))
    expect(instrucoes.get('.texto-corrido').text()).toBe(TEXTOS_IMPORTACAO.comoMontarTexto)
    expect(instrucoes.get('.texto-legenda').text()).toBe(TEXTOS_IMPORTACAO.dicaExcel)
    expect(instrucoes.findAll('dt')).toHaveLength(8)
    expect(wrapper!.get('.importacao').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
  })

  it('[COMPONENTE] etapa 2 separa lateral de resumo e coluna principal mantendo a ordem de leitura', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previaExemplo())))

    await escolherArquivo()

    const grade = wrapper!.get('.previa__grade')
    const filhos = Array.from(grade.element.children).map((elemento) => elemento.className)
    expect(filhos[0]).toContain('previa__abertura')
    expect(filhos[1]).toContain('previa__lateral')
    expect(filhos[2]).toContain('previa__principal')
    expect(grade.get('.previa__lateral').find('[data-teste="resumo-contagem"]').exists()).toBe(true)
    const principal = grade.get('.previa__principal')
    expect(principal.find('[data-teste="previa-problemas"]').exists()).toBe(true)
    expect(principal.find('[data-teste="previa-convites"]').exists()).toBe(true)
    expect(principal.find('[data-teste="baixar-correcao"]').exists()).toBe(true)
  })

  it('[COMPONENTE] sem convite pronto nem avisos a grade não reserva coluna lateral vazia', async () => {
    const previa = previaExemplo()
    previa.resumo.convitesValidos = 0
    previa.resumo.pessoasValidas = 0
    previa.colunasIgnoradas = []
    previa.convites = previa.convites.map((convite) => ({ ...convite, valido: false }))
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previa)))

    await escolherArquivo()

    const grade = wrapper!.get('.previa__grade')
    expect(grade.find('.previa__lateral').exists()).toBe(false)
    expect(grade.classes()).not.toContain('previa__grade--com-lateral')
  })

  it('[COMPONENTE] com resumo a grade ganha a coluna lateral', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previaExemplo())))

    await escolherArquivo()

    expect(wrapper!.get('.previa__grade').classes()).toContain('previa__grade--com-lateral')
    expect(ESTILO_PREVIA).toMatch(/\.previa__grade--com-lateral \{\s*grid-template-columns: minmax\(0, 1fr\) 20rem;/)
  })

  it('[COMPONENTE] etapa 3 usa o lacre padronizado em vez do selo colorido', async () => {
    const previa = previaExemplo({ linhasComProblema: [] })
    previa.convites = previa.convites.filter((convite) => convite.valido)
    await abrir(
      quando('POST', ROTA_PREVIA, () => respostaJson(previa)),
      quando('POST', ROTA_IMPORTACAO, () => respostaJson({ convitesCriados: 2, pessoasCriadas: 3 })),
    )
    await escolherArquivo()

    await wrapper!.get('[data-teste="importar"]').trigger('click')
    await flushPromises()

    const concluida = wrapper!.get('[data-teste="importacao-concluida"]')
    expect(concluida.classes()).toContain('cartao')
    expect(concluida.find('[data-teste="lacre-concluida"]').exists()).toBe(true)
    expect(concluida.find('.importacao__selo').exists()).toBe(false)
    expect(concluida.get('.importacao__titulo-concluida').text()).toBe(TEXTOS_IMPORTACAO.sucessoTitulo)
  })

  it('[SEGURANÇA] arquivo vazio continua recusado no navegador sem chamar a API', async () => {
    await abrir()

    await escolherArquivo(new File([], 'lista.csv', { type: 'text/csv' }))

    expect(wrapper!.get('[data-teste="envio-arquivo-erro"]').text()).toBe(TEXTOS_IMPORTACAO.erroVazio)
    expect(chamadas(fetchSimulado, 'POST', ROTA_PREVIA)).toHaveLength(0)
  })

  it('[UNITÁRIO] estilos ajustam por largura de contêiner, nunca por viewport', () => {
    expect(ESTILO_VIEW).not.toMatch(/@media/)
    expect(ESTILO_PREVIA).not.toMatch(/@media/)
    expect(ESTILO_VIEW).toContain('container: importacao / inline-size')
    expect(ESTILO_VIEW).toContain('@container importacao (min-width: 52rem)')
    expect(ESTILO_PREVIA).toContain('container: previa / inline-size')
    expect(ESTILO_PREVIA).toContain('@container previa (min-width: 56rem)')
  })

  it('[UNITÁRIO] estilos usam só tokens da fundação: ritmo, sem cor solta, sem sombra nem gradiente', () => {
    for (const css of [ESTILO_VIEW, ESTILO_PREVIA]) {
      expect(css).not.toMatch(/--p-espaco-/)
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(css).not.toMatch(/rgba?\(/)
      expect(css).not.toMatch(/box-shadow|gradient/)
      expect(css).not.toMatch(/margin[^:]*:\s*-/)
      expect(css).toMatch(/--p-ritmo-/)
    }
    expect(ESTILO_VIEW).toMatch(/\.importacao__titulo-concluida \{[^}]*--p-fonte-peso-leve/)
    expect(ESTILO_PREVIA).toMatch(/\.previa__frase \{[^}]*--p-fonte-peso-leve/)
  })
})
