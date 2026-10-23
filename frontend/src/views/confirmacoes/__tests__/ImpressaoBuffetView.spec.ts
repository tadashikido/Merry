import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { exportacaoExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { TEXTOS_PREPARO_BUFFET } from '@/textos/dadosSensiveis'
import type { EventoDto } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('impressao-buffet')

const ROTA_IMPRESSAO = `/api/eventos/${ID_EVENTO}/exportacao-buffet?formato=impressao`
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  window.history.replaceState(null, '')
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/confirmacoes/buffet`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function rotasComEvento(evento: Partial<EventoDto> | null, exportacao = exportacaoExemplo()) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_IMPRESSAO, () => respostaJson(exportacao)),
    quando('GET', ROTA_EVENTO, () =>
      evento ? respostaJson(eventoCompleto({ localCerimonia: 'Salão Aurora', localRecepcao: 'Igreja Matriz', ...evento })) : respostaProblema(404),
    ),
  )
}

function detalhe(ficha: ReturnType<VueWrapper['get']>, chave: string): string {
  const item = ficha.get(`[data-teste="ficha-detalhe-${chave}"]`)
  return `${item.get('dt').text()} ${item.get('dd').text()}`
}

function exportacaoComAlergia() {
  const base = exportacaoExemplo()
  return {
    ...base,
    restricoes: {
      ...base.restricoes,
      porTipo: [
        { tipo: 'SemGluten' as const, quantidade: 1 },
        { tipo: 'AlergiaAmendoimCastanhas' as const, quantidade: 1 },
      ],
    },
  }
}

describe('ImpressaoBuffetView', () => {
  it('[COMPONENTE] monta a ficha com anfitriões, contagem, restrições e confirmados por convite', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => respostaJson(exportacaoExemplo())))
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.get('h1').text()).toBe('Ana Beatriz & Bruno')
    expect(ficha.text()).toContain('Espaço Jardim')
    expect(ficha.text()).toContain('16:30')
    expect(ficha.get('[data-teste="cardapio-adultos"] dd').text()).toBe('3')
    expect(ficha.get('[data-teste="cardapio-criancas"] dd').text()).toBe('1')
    expect(ficha.get('[data-teste="cardapio-total"] dd').text()).toBe('4')
    expect(ficha.get('[data-teste="ficha-pendentes"]').text()).toBe('2 pessoas ainda sem resposta.')
    expect(ficha.get('[data-teste="ficha-restricoes-pessoas"]').text()).toContain('Sem glúten, sem porco; necessidade especial: cadeira alta')
    const convites = ficha.findAll('[data-teste="ficha-convite"]')
    expect(convites).toHaveLength(2)
    expect(convites[0]!.text()).toContain('Família Souza (3)')
    expect(convites[0]!.text()).toContain('Lia Souza, criança')
    expect(convites[0]!.text()).toContain('Pedro Lima, acompanhante')
    expect(ficha.text()).toContain(TEXTOS_FICHA_BUFFET.rodape)
    expect(chamadas(fetchSimulado, 'GET', ROTA_IMPRESSAO)).toHaveLength(1)
    expect(document.title).toContain('Ficha para o buffet')
  })

  it('[COMPONENTE] convites e pessoas homônimos aparecem todos', async () => {
    const base = exportacaoExemplo()
    const pessoa = { nome: 'José Silva', faixaEtaria: 'Adulto' as const, acompanhante: false, tipos: [], outraRestricao: null, necessidadeEspecial: null }
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_IMPRESSAO, () =>
        respostaJson({ ...base, convites: [{ nome: 'Família Silva', pessoas: [pessoa, pessoa] }, { nome: 'Família Silva', pessoas: [pessoa] }] }),
      ),
    )
    await abrir()

    const convites = wrapper!.findAll('[data-teste="ficha-convite"]')
    expect(convites).toHaveLength(2)
    expect(convites[0]!.findAll('li')).toHaveLength(2)
    expect(convites[1]!.findAll('li')).toHaveLength(1)
  })

  it('[COMPONENTE] imprimir chama a impressão do navegador', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => respostaJson(exportacaoExemplo())))
    await abrir()

    await wrapper!.get('[data-teste="imprimir"]').trigger('click')

    expect(imprimir).toHaveBeenCalledTimes(1)
    expect(wrapper!.get('[data-teste="voltar-painel"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/confirmacoes`)
  })

  it('[COMPONENTE] sem confirmados e com registros ilegíveis mostra avisos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_IMPRESSAO, () =>
        respostaJson(
          exportacaoExemplo({
            convites: [],
            pendentes: 0,
            restricoes: { porTipo: [], outrasRestricoes: 0, necessidadesEspeciais: 0, pessoas: [], registrosIlegiveis: 2, dadosExcluidosEm: null },
          }),
        ),
      ),
    )
    await abrir()

    const texto = wrapper!.text()
    expect(texto).toContain(TEXTOS_FICHA_BUFFET.semConfirmados)
    expect(texto).toContain(TEXTOS_FICHA_BUFFET.semRestricoes)
    expect(texto).toContain('2 restrições não puderam ser lidas')
    expect(wrapper!.find('[data-teste="ficha-pendentes"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] outra organização mostra não encontrado e desabilita imprimir', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => respostaProblema(404)))
    await abrir()

    expect(wrapper!.find('[data-teste="ficha-buffet"]').exists()).toBe(false)
    expect(wrapper!.text()).toContain('Evento não encontrado')
    expect(wrapper!.get('[data-teste="imprimir"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] erro de servidor permite tentar de novo', async () => {
    let falhar = true
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => (falhar ? respostaProblema(500) : respostaJson(exportacaoExemplo()))))
    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_FICHA_BUFFET.erroCarregar)
    falhar = false
    const botao = wrapper!.findAll('button').find((item) => item.text().includes('Tentar'))
    await botao!.trigger('click')
    await flushPromises()

    expect(wrapper!.find('[data-teste="ficha-buffet"]').exists()).toBe(true)
  })
  it('[COMPONENTE] cabeçalho identifica o documento, resumos ficam juntos e a tabela ocupa a largura toda', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => respostaJson(exportacaoExemplo())))
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    const cabecalho = ficha.get('header')
    expect(cabecalho.text()).toContain(TEXTOS_FICHA_BUFFET.documento)
    expect(cabecalho.text()).toContain('Gerada em')
    expect(cabecalho.findAll('h1')).toHaveLength(1)
    const resumos = ficha.get('.ficha__resumos')
    expect(resumos.find('[data-teste="resumo-cardapio"]').exists()).toBe(true)
    expect(resumos.find('#ficha-restricoes').exists()).toBe(true)
    expect(resumos.find('[data-teste="ficha-restricoes-pessoas"]').exists()).toBe(false)
    const tabela = ficha.get('[data-teste="ficha-restricoes-pessoas"]')
    expect(tabela.get('caption').text()).toBe(TEXTOS_FICHA_BUFFET.restricoesPorPessoa)
    expect(tabela.findAll('th[scope="col"]')).toHaveLength(3)
  })

  it('[SEGURANÇA] aviso de dado de saúde sempre presente e nenhum contato de convidado', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_IMPRESSAO, () => respostaJson(exportacaoExemplo())))
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.get('[data-teste="ficha-aviso-saude"]').text()).toBe(TEXTOS_FICHA_BUFFET.rodape)
    expect(ficha.text()).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i)
    expect(ficha.text()).not.toMatch(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/)
    expect(ficha.html()).not.toContain('<script')
  })

  it('[COMPONENTE] restrições apagadas pela política mostram a data e omitem a tabela', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_IMPRESSAO, () =>
        respostaJson(
          exportacaoExemplo({
            restricoes: { porTipo: [], outrasRestricoes: 0, necessidadesEspeciais: 0, pessoas: [], registrosIlegiveis: 0, dadosExcluidosEm: '2027-06-01T12:00:00Z' },
          }),
        ),
      ),
    )
    await abrir()

    const texto = wrapper!.text()
    expect(texto).toContain('foram apagadas em 01/06/2027')
    expect(wrapper!.find('[data-teste="ficha-restricoes-pessoas"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="ficha-aviso-saude"]').exists()).toBe(true)
  })

  it('[COMPONENTE] estilo usa tokens, @container na tela e regras de impressão A4', () => {
    const fonte = readFileSync(resolve(__dirname, '../ImpressaoBuffetView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    expect(estilo).toContain('container: ficha / inline-size')
    expect(estilo).toContain('@container ficha (min-width: 36rem)')
    expect(estilo).toContain('@media print')
    expect(estilo).toContain('display: table-header-group')
    expect(estilo).toContain('break-inside: avoid')
    expect(estilo).not.toMatch(/@media \(min-width/)
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    expect(estilo.replace(/1px (solid|dotted)/g, '')).not.toMatch(/\d+(px|mm|pt)\b/)
    expect(estilo).not.toMatch(/background:\s*var\(--p-cor/)
    expect(estilo).not.toContain('box-shadow')
  })

  it('[COMPONENTE] festa de 15 anos identifica o tipo e rotula horário e locais sem falar de casamento', async () => {
    rotasComEvento({ tipo: 'QuinzeAnos', nomePrimeiraPessoa: 'Valentina', nomeSegundaPessoa: null })
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.get('[data-teste="ficha-tipo"]').text()).toBe('Festa de 15 anos')
    expect(detalhe(ficha, 'horario')).toBe('Horário da festa 16:30')
    expect(detalhe(ficha, 'localPrincipal')).toBe('Festa Salão Aurora')
    expect(detalhe(ficha, 'localSecundario')).toBe('Outro local Igreja Matriz')
    expect(ficha.get('[data-teste="ficha-orientacao-SemGluten"] dd').text()).toContain('o bolo e a mesa de doces')
    expect(ficha.text()).not.toMatch(/casamento|cerimônia|recepção|noiv/i)
    expect(chamadas(fetchSimulado, 'GET', ROTA_EVENTO)).toHaveLength(1)
  })

  it('[COMPONENTE] casamento mantém cerimônia e recepção e os doces do casamento', async () => {
    rotasComEvento({ tipo: 'Casamento', localCerimonia: 'Capela São José', localRecepcao: 'Espaço Jardim' })
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.get('[data-teste="ficha-tipo"]').text()).toBe('Casamento')
    expect(detalhe(ficha, 'localPrincipal')).toBe('Cerimônia Capela São José')
    expect(detalhe(ficha, 'localSecundario')).toBe('Recepção Espaço Jardim')
    expect(ficha.get('[data-teste="ficha-orientacao-SemGluten"] dd').text()).toContain('o bolo e os bem-casados')
  })

  it.each([
    ['Aniversario', 'Aniversário', 'o bolo e os docinhos'],
    ['Comemoracao', 'Comemoração', 'a sobremesa'],
  ] as const)('[COMPONENTE] %s mostra o tipo e os doces do vocabulário', async (tipo, rotulo, doces) => {
    rotasComEvento({ tipo })
    await abrir()

    expect(wrapper!.get('[data-teste="ficha-tipo"]').text()).toBe(rotulo)
    expect(wrapper!.get('[data-teste="ficha-orientacao-SemGluten"] dd').text()).toContain(doces)
  })

  it('[COMPONENTE] tipo desconhecido não cai em casamento', async () => {
    rotasComEvento({ tipo: 'Corporativo' as EventoDto['tipo'] })
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.find('[data-teste="ficha-tipo"]').exists()).toBe(false)
    expect(detalhe(ficha, 'localPrincipal')).toBe('Local Salão Aurora')
    expect(ficha.get('[data-teste="ficha-orientacao-SemGluten"] dd').text()).toContain('a sobremesa')
    expect(ficha.text()).not.toMatch(/casamento|cerimônia|recepção|bem-casados/i)
  })

  it('[COMPONENTE] sem o evento a ficha continua completa com os dados da exportação', async () => {
    rotasComEvento(null)
    await abrir()

    const ficha = wrapper!.get('[data-teste="ficha-buffet"]')
    expect(ficha.find('[data-teste="ficha-tipo"]').exists()).toBe(false)
    expect(detalhe(ficha, 'localPrincipal')).toBe('Local Espaço Jardim')
    expect(detalhe(ficha, 'horario')).toBe('Horário do evento 16:30')
    expect(detalhe(ficha, 'data')).toContain('sábado, 22 de maio de 2027')
    expect(ficha.findAll('[data-teste="ficha-convite"]')).toHaveLength(2)
  })

  it('[COMPONENTE] contagem mostra até quantas pessoas se todos que faltam vierem', async () => {
    rotasComEvento({ tipo: 'Casamento' })
    await abrir()

    expect(wrapper!.get('[data-teste="ficha-maximo"]').text()).toBe('Se todos que faltam vierem: até 6 pessoas.')
  })

  it('[COMPONENTE] para o buffet conferir traz orientações, notas e o alerta de alergia antes da tabela', async () => {
    rotasComEvento({ tipo: 'Casamento' }, exportacaoComAlergia())
    await abrir()

    const conferir = wrapper!.get('[data-teste="ficha-conferir"]')
    expect(conferir.get('h2').text()).toBe(TEXTOS_FICHA_BUFFET.conferirTitulo)
    expect(conferir.attributes('aria-labelledby')).toBe('ficha-conferir')
    expect(conferir.get('[data-teste="ficha-alergia"]').text()).toContain(TEXTOS_PREPARO_BUFFET.alergiaTitulo)
    expect(conferir.find('[data-teste="ficha-orientacao-AlergiaAmendoimCastanhas"]').exists()).toBe(true)
    expect(conferir.get('[data-teste="ficha-conferir-outras"]').text()).toBe(TEXTOS_PREPARO_BUFFET.outras(2))
    expect(conferir.get('[data-teste="ficha-conferir-necessidades"]').text()).toBe(TEXTOS_PREPARO_BUFFET.necessidades(2))
    const blocos = wrapper!.get('[data-teste="ficha-buffet"]').element.querySelectorAll('[data-teste="ficha-conferir"], [data-teste="ficha-restricoes-pessoas"]')
    expect([...blocos].map((elemento) => elemento.getAttribute('data-teste'))).toEqual(['ficha-conferir', 'ficha-restricoes-pessoas'])
  })

  it('[COMPONENTE] sem alergia entre os confirmados não há alerta', async () => {
    rotasComEvento({ tipo: 'Casamento' })
    await abrir()

    expect(wrapper!.find('[data-teste="ficha-conferir"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="ficha-alergia"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem restrições confirmadas nem notas o bloco de conferência some', async () => {
    rotasComEvento(
      { tipo: 'Casamento' },
      exportacaoExemplo({
        restricoes: { porTipo: [], outrasRestricoes: 0, necessidadesEspeciais: 0, pessoas: [], registrosIlegiveis: 0, dadosExcluidosEm: null },
      }),
    )
    await abrir()

    expect(wrapper!.find('[data-teste="ficha-conferir"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] restrições apagadas não geram orientação nem alerta', async () => {
    const base = exportacaoComAlergia()
    rotasComEvento({ tipo: 'Casamento' }, { ...base, restricoes: { ...base.restricoes, dadosExcluidosEm: '2027-06-01T12:00:00Z' } })
    await abrir()

    expect(wrapper!.find('[data-teste="ficha-conferir"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="ficha-alergia"]').exists()).toBe(false)
  })

  it('[COMPONENTE] aberta a partir das restrições alimentares volta para elas', async () => {
    window.history.replaceState({ back: `/eventos/${ID_EVENTO}/restricoes-alimentares` }, '')
    rotasComEvento({ tipo: 'Casamento' })
    await abrir()

    const voltar = wrapper!.get('[data-teste="voltar-painel"]')
    expect(voltar.text()).toBe(TEXTOS_FICHA_BUFFET.voltarRestricoes)
    expect(voltar.attributes('href')).toBe(`/eventos/${ID_EVENTO}/restricoes-alimentares`)
  })

  it('[SEGURANÇA] origem de outro evento volta às confirmações', async () => {
    window.history.replaceState({ back: '/eventos/22222222-2222-4222-8222-222222222222/restricoes-alimentares' }, '')
    rotasComEvento({ tipo: 'Casamento' })
    await abrir()

    const voltar = wrapper!.get('[data-teste="voltar-painel"]')
    expect(voltar.text()).toBe(TEXTOS_FICHA_BUFFET.voltar)
    expect(voltar.attributes('href')).toBe(`/eventos/${ID_EVENTO}/confirmacoes`)
  })
})
