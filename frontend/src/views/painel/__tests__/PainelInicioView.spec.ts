import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import PainelInicioView from '@/views/painel/PainelInicioView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_CASAMENTO, chamadas, quando, resumoCasamento, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'
import { alertasExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { TEXTOS_ALERTAS_PAGAMENTOS } from '@/textos/financeiro'

const ROTA_ATIVOS = '/api/casamentos?situacao=Ativos'

describe('PainelInicioView', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    fetchSimulado = simularFetch()
    simularMatchMedia(false)
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    registrarProvedorAutenticacao(null)
  })

  it('[COMPONENTE] saúda pelo primeiro nome, mostra a assessoria e o estado de primeiro acesso sem casamentos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.get('h1').text()).toBe('Olá, Renata')
    expect(wrapper.text()).toContain('Albuquerque Assessoria')
    const primeiroAcesso = wrapper.get('[data-teste="estado-primeiro-acesso"]')
    expect(primeiroAcesso.text()).toContain(TEXTOS_PAINEL.primeiroAcessoTitulo)
    expect(primeiroAcesso.findAll('[data-teste="passo-primeiro-acesso"]').map((passo) => passo.text())).toEqual(['1Dados do casamento', '2Convidar o casal', '3Checklist', '4Convidados'])
    expect(primeiroAcesso.get('[aria-current="step"]').text()).toContain('Dados do casamento')
    expect(wrapper.find('[data-teste="novo-casamento"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="estado-vazio"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="resumo-usuario"]').text()).toContain('Renata Albuquerque')
  })

  it('[COMPONENTE] mostra até 6 próximos casamentos e ignora os já realizados', async () => {
    const lista = [
      ...Array.from({ length: 7 }, (_, indice) =>
        resumoCasamento({ id: `${indice}`.padStart(8, '0') + ID_CASAMENTO.slice(8), nomePrimeiraPessoa: `Pessoa ${indice}`, diasRestantes: indice }),
      ),
      resumoCasamento({ id: '99999999' + ID_CASAMENTO.slice(8), nomePrimeiraPessoa: 'Realizado', diasRestantes: -2, fase: 'Realizado' }),
    ]
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson(lista)))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const cartoes = wrapper.findAll('[data-teste="cartao-casamento"]')
    expect(cartoes).toHaveLength(6)
    expect(cartoes[0]?.text()).toContain('Pessoa 0')
    expect(cartoes[0]?.text()).toContain('É hoje')
    expect(wrapper.text()).not.toContain('Realizado')
    expect(wrapper.get('[data-teste="ver-todos"]').attributes('href')).toBe('/casamentos')
  })

  it('[COMPONENTE] só com casamentos realizados mostra o estado vazio e o link para todos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoCasamento({ diasRestantes: -10, fase: 'Realizado' })])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.text()).toContain(TEXTOS_CASAMENTOS.painelVazioTitulo)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha ao carregar mostra erro e permite tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaProblema(500)))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_CASAMENTOS.erroCarregarTitulo)
    await wrapper.get('[data-teste="tentar-novamente"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(2)
  })

  it('[SEGURANÇA] 403 informa falta de acesso sem tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaProblema(403)))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.text()).toContain(TEXTOS_CASAMENTOS.semAcesso)
    expect(wrapper.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] a ação do primeiro acesso leva ao formulário de novo casamento', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    await wrapper.get('[data-teste="primeiro-acesso-continuar"]').trigger('click')

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento-novo'))
  })

  it('[INTEGRAÇÃO] com casamentos, "Novo casamento" no cabeçalho leva ao formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoCasamento()])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.find('[data-teste="estado-primeiro-acesso"]').exists()).toBe(false)
    await wrapper.get('[data-teste="novo-casamento"]').trigger('click')

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento-novo'))
  })

  it('[INTEGRAÇÃO] sair revoga a sessão na API e leva para entrar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_ATIVOS, () => respostaJson([])),
      quando('POST', '/api/autenticacao/sair', () => respostaVazia()),
    )
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    await wrapper.get('[data-teste="sair"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', '/api/autenticacao/sair')).toHaveLength(1)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('entrar'))
  })

  it('[COMPONENTE] o rail tem Dashboard e Casamentos com rótulo acessível e Dashboard ativo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    const itens = wrapper.findAll('[data-teste="item-menu"]')
    expect(itens.map((item) => item.text())).toEqual(['Dashboard', TEXTOS_CASAMENTOS.menu, 'Fornecedores', 'Modelos'])
    expect(itens[0]?.attributes('aria-current')).toBe('page')
    expect(itens[1]?.attributes('href')).toBe('/casamentos')
    expect(itens[1]?.attributes('aria-current')).toBeUndefined()
    expect(wrapper.find('[data-teste="workspace-casamento"]').exists()).toBe(false)
  })
  it('[INTEGRAÇÃO] com casamentos mostra o bloco consolidado de pagamentos ao lado das tarefas', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_ATIVOS, () => respostaJson([resumoCasamento()])),
      quando('GET', '/api/financeiro/alertas', () => respostaJson(alertasExemplo())),
    )
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const bloco = wrapper.get('[data-teste="bloco-alertas-pagamentos"]')
    expect(bloco.text()).toContain(TEXTOS_ALERTAS_PAGAMENTOS.titulo)
    expect(bloco.text()).toContain('2 vencidas em 2 casamentos')
    expect(bloco.findAll('[data-teste="linha-parcela"]')).toHaveLength(3)
    expect(chamadas(fetchSimulado, 'GET', '/api/financeiro/alertas')).toHaveLength(1)
    expect(wrapper.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha nos pagamentos não derruba o dashboard e permite tentar de novo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoCasamento()])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const bloco = wrapper.get('[data-teste="bloco-alertas-pagamentos"]')
    expect(bloco.text()).toContain(TEXTOS_ALERTAS_PAGAMENTOS.erro)
    expect(wrapper.findAll('[data-teste="cartao-casamento"]')).toHaveLength(1)
    await bloco.get('[data-teste="tentar-alertas"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', '/api/financeiro/alertas')).toHaveLength(2)
  })
})
