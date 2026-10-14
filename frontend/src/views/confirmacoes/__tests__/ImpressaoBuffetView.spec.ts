import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { exportacaoExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { ID_CASAMENTO, RaizRotas, chamadas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const ROTA_IMPRESSAO = `/api/casamentos/${ID_CASAMENTO}/exportacao-buffet?formato=impressao`

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
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir() {
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/confirmacoes/buffet`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('ImpressaoBuffetView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] monta a ficha com casal, contagem, restrições e confirmados por convite', async () => {
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
    expect(wrapper!.get('[data-teste="voltar-painel"]').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/confirmacoes`)
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
    expect(wrapper!.text()).toContain('Casamento não encontrado')
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
})
