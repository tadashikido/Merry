import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import PainelInicioView from '@/views/painel/PainelInicioView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { PASSOS_ONBOARDING, PASSOS_PRIMEIRO_ACESSO } from '@/textos/proximosPassos'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_EVENTO, chamadas, quando, resumoEvento, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'
import { alertasExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { TEXTOS_ALERTAS_PAGAMENTOS } from '@/textos/financeiro'
import { pendenciasExemplo } from '@/__tests__/auxiliaresTarefas'
import { ROTA_PENDENCIAS_TAREFAS } from '@/stores/tarefas'
import { TEXTOS_PAINEL_INICIO } from '@/textos/painelInicio'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import type { SessaoDto } from '@/tipos/api'

await precarregarRotas('evento-novo', 'entrar', 'eventos')

const ROTA_ATIVOS = '/api/eventos?situacao=Ativos'

const SESSAO_ANFITRIAO_SEM_EVENTO: SessaoDto = {
  ...SESSAO_EXEMPLO,
  usuario: { ...SESSAO_EXEMPLO.usuario, nome: 'Lívia Moraes', papel: 'Anfitriao', eventoId: null },
}

const idDe = (indice: number) => `${indice}`.padStart(8, '0') + ID_EVENTO.slice(8)

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

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

  it('[COMPONENTE] saúda pelo primeiro nome, mostra a assessoria e o estado de primeiro acesso sem eventos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.get('h1').text()).toBe('Olá, Renata')
    expect(wrapper.text()).toContain('Albuquerque Assessoria')
    const primeiroAcesso = wrapper.get('[data-teste="estado-primeiro-acesso"]')
    expect(primeiroAcesso.text()).toContain(TEXTOS_PAINEL.primeiroAcessoTitulo)
    expect(primeiroAcesso.findAll('[data-teste="passo-primeiro-acesso"]').map((passo) => passo.text())).toEqual(PASSOS_PRIMEIRO_ACESSO.map((rotulo, indice) => `${indice + 1}${rotulo}`))
    expect(PASSOS_PRIMEIRO_ACESSO).toEqual(['Dados do evento', ...PASSOS_ONBOARDING.map((passo) => passo.rotulo)])
    expect(PASSOS_PRIMEIRO_ACESSO).toEqual(['Dados do evento', 'Convidar os anfitriões', 'Aplicar o checklist', 'Cadastrar convidados', 'Enviar convites'])
    expect(primeiroAcesso.get('[aria-current="step"]').text()).toContain('Dados do evento')
    expect(wrapper.find('[data-teste="novo-evento"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="estado-vazio"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="resumo-usuario"]').text()).toContain('Renata Albuquerque')
  })

  it('[COMPONENTE] mostra até 6 próximos eventos e ignora os já realizados', async () => {
    const lista = [
      ...Array.from({ length: 7 }, (_, indice) =>
        resumoEvento({ id: `${indice}`.padStart(8, '0') + ID_EVENTO.slice(8), nomePrimeiraPessoa: `Pessoa ${indice}`, diasRestantes: indice }),
      ),
      resumoEvento({ id: '99999999' + ID_EVENTO.slice(8), nomePrimeiraPessoa: 'Realizado', diasRestantes: -2, fase: 'Realizado' }),
    ]
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson(lista)))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const cartoes = wrapper.findAll('[data-teste="cartao-evento"]')
    expect(cartoes).toHaveLength(6)
    expect(cartoes[0]?.text()).toContain('Pessoa 0')
    expect(cartoes[0]?.text()).toContain('É hoje')
    expect(cartoes.map((cartao) => cartao.text()).join(' ')).not.toContain('Realizado')
    expect(wrapper.get('[data-teste="ver-todos"]').attributes('href')).toBe('/eventos')
  })

  it('[COMPONENTE] só com eventos realizados mostra o estado vazio e o link para todos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento({ diasRestantes: -10, fase: 'Realizado' })])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.text()).toContain(TEXTOS_EVENTOS.painelVazioTitulo)
    expect(wrapper.text()).toContain(TEXTOS_EVENTOS.painelVazioTexto)
    expect(TEXTOS_EVENTOS.painelVazioTexto).not.toMatch(/em breve|casamento/i)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha ao carregar mostra erro e permite tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaProblema(500)))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_EVENTOS.erroCarregarTitulo)
    await wrapper.get('[data-teste="tentar-novamente"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(2)
  })

  it('[SEGURANÇA] 403 informa falta de acesso sem tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaProblema(403)))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.text()).toContain(TEXTOS_EVENTOS.semAcesso)
    expect(wrapper.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] a ação do primeiro acesso leva ao formulário de novo evento', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    await wrapper.get('[data-teste="primeiro-acesso-continuar"]').trigger('click')

    await aguardarRota(montagem.roteador, 'evento-novo')
  })

  it('[INTEGRAÇÃO] com eventos, "Novo evento" no cabeçalho leva ao formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.find('[data-teste="estado-primeiro-acesso"]').exists()).toBe(false)
    await wrapper.get('[data-teste="novo-evento"]').trigger('click')

    await aguardarRota(montagem.roteador, 'evento-novo')
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
    await aguardarRota(montagem.roteador, 'entrar')
  })

  it('[COMPONENTE] o rail tem Dashboard e Eventos com rótulo acessível e Dashboard ativo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    const itens = wrapper.findAll('[data-teste="item-menu"]')
    expect(itens.map((item) => item.text())).toEqual(['Dashboard', TEXTOS_EVENTOS.menu, 'Fornecedores', 'Modelos'])
    expect(itens[0]?.attributes('aria-current')).toBe('page')
    expect(itens[1]?.attributes('href')).toBe('/eventos')
    expect(itens[1]?.attributes('aria-current')).toBeUndefined()
    expect(wrapper.find('[data-teste="workspace-evento"]').exists()).toBe(false)
  })
  it('[INTEGRAÇÃO] com eventos mostra o bloco consolidado de pagamentos ao lado das tarefas', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])),
      quando('GET', '/api/financeiro/alertas', () => respostaJson(alertasExemplo())),
    )
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const bloco = wrapper.get('[data-teste="bloco-alertas-pagamentos"]')
    expect(bloco.text()).toContain(TEXTOS_ALERTAS_PAGAMENTOS.titulo)
    expect(bloco.text()).toContain('2 vencidas em 2 eventos')
    expect(bloco.findAll('[data-teste="linha-parcela"]')).toHaveLength(3)
    expect(chamadas(fetchSimulado, 'GET', '/api/financeiro/alertas')).toHaveLength(1)
    expect(wrapper.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha nos pagamentos não derruba o dashboard e permite tentar de novo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const bloco = wrapper.get('[data-teste="bloco-alertas-pagamentos"]')
    expect(bloco.text()).toContain(TEXTOS_ALERTAS_PAGAMENTOS.erro)
    expect(wrapper.findAll('[data-teste="cartao-evento"]')).toHaveLength(1)
    await bloco.get('[data-teste="tentar-alertas"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', '/api/financeiro/alertas')).toHaveLength(2)
  })

  it('[COMPONENTE] organiza a página em seções do ritmo da fundação, com pendências lado a lado e a grade larga de eventos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])),
      quando('GET', ROTA_PENDENCIAS_TAREFAS, () => respostaJson(pendenciasExemplo())),
      quando('GET', '/api/financeiro/alertas', () => respostaJson(alertasExemplo())),
    )
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const secoes = wrapper.get('.pilha.pilha--secao')
    const pendencias = secoes.get('.painel-inicio__pendencias')
    expect(pendencias.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(true)
    expect(pendencias.find('[data-teste="bloco-alertas-pagamentos"]').exists()).toBe(true)
    const proximos = secoes.get('section[aria-labelledby="titulo-proximos"]')
    expect(proximos.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    const cabecalho = proximos.get('.cabecalho-secao')
    expect(cabecalho.get('h2#titulo-proximos').text()).toBe(TEXTOS_EVENTOS.proximosTitulo)
    expect(cabecalho.get('.texto-legenda').text()).toBe(TEXTOS_EVENTOS.proximosLegenda)
    expect(proximos.get('[data-teste="proximos-eventos"]').classes()).toEqual(expect.arrayContaining(['grade', 'grade--larga']))
  })

  it('[COMPONENTE] "Ver todos os eventos" é um link real com cara de botão secundário no cabeçalho da seção', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const verTodos = wrapper.get('.cabecalho-secao [data-teste="ver-todos"]')
    expect(verTodos.element.tagName).toBe('A')
    expect(verTodos.attributes('href')).toBe('/eventos')
    const botao = wrapper.findAllComponents(Button).find((componente) => componente.attributes('data-teste') === 'ver-todos')
    expect(botao?.props('severity')).toBe('secondary')
    expect(botao?.props('outlined')).toBe(true)
    expect(verTodos.text()).toBe(TEXTOS_EVENTOS.verTodos)
  })

  it('[INTEGRAÇÃO] acionar "Ver todos os eventos" leva à lista de eventos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento()])))
    const montagem = await prepararAplicacao('/')
    wrapper = await montarView(PainelInicioView, montagem)

    await wrapper.get('[data-teste="ver-todos"]').trigger('click')

    await aguardarRota(montagem.roteador, 'eventos')
  })

  it('[COMPONENTE] sem próximos eventos a legenda da seção não aparece', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento({ diasRestantes: -10, fase: 'Realizado' })])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.find('.cabecalho-secao .texto-legenda').exists()).toBe(false)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(true)
  })

  it('[UNITÁRIO] o estilo da tela usa só o ritmo e os tokens da fundação, sem espaços soltos', () => {
    const estilo = estiloDe(lerFonte('views/painel/PainelInicioView.vue'))

    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin-bottom/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/\b\d+px\b/)
    expect(estilo).toContain('container: painel-inicio / inline-size')
    expect(estilo).toContain('@container painel-inicio (max-width: 39.99rem)')
    expect(estilo).toContain('@container painel-inicio (min-width: 48rem)')
    expect(estilo).toContain('@container painel-inicio (min-width: 56rem)')
    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(estilo).toContain('var(--p-ritmo-cartao)')
    expect(estilo).toContain('var(--p-fonte-peso-leve)')
  })

  it('[UNITÁRIO] cartão de evento e blocos do painel seguem a fundação: sem sombra e com padding do ritmo de cartão', () => {
    const cartao = estiloDe(lerFonte('componentes/eventos/CartaoEvento.vue'))
    const tarefas = estiloDe(lerFonte('componentes/tarefas/BlocoPendenciasTarefas.vue'))
    const pagamentos = estiloDe(lerFonte('componentes/base/BlocoAlertasPagamentos.vue'))

    expect(cartao).not.toMatch(/box-shadow/)
    for (const estilo of [cartao, tarefas, pagamentos]) {
      expect(estilo).toContain('padding: var(--p-ritmo-cartao)')
    }
    expect(tarefas).toContain('container-type: inline-size')
    expect(tarefas).toMatch(/@container \(min-width: 52rem\)/)
    expect(tarefas).not.toMatch(/@media \(min-width: 1280px\)/)
  })

  it('[COMPONENTE] cada cartão mostra o tipo do evento para os 4 tipos', async () => {
    const lista = TIPOS_EVENTO.map((tipo, indice) => resumoEvento({ id: idDe(indice), tipo, nomeSegundaPessoa: null, diasRestantes: indice + 1 }))
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson(lista)))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const tipos = wrapper.findAll('[data-teste="cartao-evento"] [data-teste="tipo-evento"]').map((tipo) => tipo.text())
    expect(tipos).toEqual(['Casamento', '15 anos', 'Aniversário', 'Comemoração'])
  })

  it('[INTEGRAÇÃO] o resumo da carteira conta eventos pela frente por tipo, janelas de 7 e 30 dias e realizados para arquivar', async () => {
    const lista = [
      resumoEvento({ id: idDe(0), tipo: 'Casamento', diasRestantes: 3, fase: 'SemanaDoEvento' }),
      resumoEvento({ id: idDe(1), tipo: 'Casamento', diasRestantes: 90 }),
      resumoEvento({ id: idDe(2), tipo: 'QuinzeAnos', diasRestantes: 20 }),
      resumoEvento({ id: idDe(3), tipo: 'Aniversario', diasRestantes: -5, fase: 'Realizado' }),
    ]
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_ATIVOS, () => respostaJson(lista)),
      quando('GET', ROTA_PENDENCIAS_TAREFAS, () => respostaJson(pendenciasExemplo())),
      quando('GET', '/api/financeiro/alertas', () => respostaJson(alertasExemplo())),
    )
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)
    await flushPromises()

    const resumo = wrapper.get('[data-teste="resumo-carteira"]')
    expect(resumo.attributes('aria-label')).toBe(TEXTOS_PAINEL_INICIO.resumoRotulo)
    const pelaFrente = resumo.get('[data-teste="contagem-pela-frente"]')
    expect(pelaFrente.text()).toContain('3')
    expect(pelaFrente.text()).toContain(TEXTOS_PAINEL_INICIO.pelaFrente)
    expect(pelaFrente.text()).toContain('2 casamentos e 1 festa de 15 anos')
    const semana = resumo.get('[data-teste="contagem-proximos-7-dias"]')
    expect(semana.text()).toContain('1')
    expect(semana.classes()).toContain('resumo-contagem__item--destaque')
    expect(resumo.get('[data-teste="contagem-proximos-30-dias"]').text()).toContain('2')
    const realizados = resumo.get('[data-teste="contagem-realizados"]')
    expect(realizados.text()).toContain('1')
    expect(realizados.text()).toContain(TEXTOS_PAINEL_INICIO.realizadosDetalhe)
    expect(resumo.text()).not.toMatch(/Ana Beatriz|Bruno/)
    const ordem = wrapper.findAll('[data-teste="resumo-carteira"], .painel-inicio__pendencias, section[aria-labelledby="titulo-proximos"]')
    expect(ordem).toHaveLength(3)
    expect(ordem[0]?.attributes('data-teste')).toBe('resumo-carteira')
    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(1)
  })

  it('[COMPONENTE] sem eventos à frente o resumo não destaca a semana nem detalha tipos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([resumoEvento({ diasRestantes: -10, fase: 'Realizado' })])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const resumo = wrapper.get('[data-teste="resumo-carteira"]')
    expect(resumo.get('[data-teste="contagem-pela-frente"]').find('.resumo-contagem__detalhe').exists()).toBe(false)
    expect(resumo.get('[data-teste="contagem-proximos-7-dias"]').classes()).not.toContain('resumo-contagem__item--destaque')
  })

  it('[COMPONENTE] o primeiro acesso vem antes de tudo, sem a seção de próximos eventos, e ensina os 4 tipos', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_ATIVOS, () => respostaJson([])))
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    expect(wrapper.find('#titulo-proximos').exists()).toBe(false)
    expect(wrapper.find('[data-teste="resumo-carteira"]').exists()).toBe(false)
    const bloco = wrapper.get('[data-teste="secao-primeiro-acesso"]')
    expect(bloco.get('[data-teste="estado-primeiro-acesso"]').text()).toContain(
      'O Celebri organiza casamentos, festas de 15 anos, aniversários e comemorações.',
    )
    const tipos = bloco.get('[data-teste="tipos-organizar"]')
    expect(tipos.element.tagName).toBe('ASIDE')
    expect(tipos.attributes('aria-labelledby')).toBe('titulo-tipos-organizar')
    expect(tipos.get('h2#titulo-tipos-organizar').text()).toBe(TEXTOS_PAINEL_INICIO.tiposTitulo)
    for (const tipo of TIPOS_EVENTO) {
      const item = tipos.get(`[data-teste="tipo-organizar-${tipo}"]`)
      expect(item.get('h3').text()).toBe(VOCABULARIO_TIPO_EVENTO[tipo].rotulo)
      expect(item.text()).toContain(VOCABULARIO_TIPO_EVENTO[tipo].descricao)
    }
    expect(tipos.text()).toContain(TEXTOS_PAINEL_INICIO.tiposNota)
    expect(tipos.find('a, button').exists()).toBe(false)
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('[SEGURANÇA] anfitrião sem evento vinculado vê estado neutro, sem ações nem dados da assessoria', async () => {
    fetchSimulado.mockImplementation(async (entrada) => {
      const url = String(entrada)
      if (url === '/api/autenticacao/renovar') {
        return respostaJson(SESSAO_ANFITRIAO_SEM_EVENTO)
      }
      if (url === ROTA_ATIVOS) {
        return respostaJson([])
      }
      return respostaProblema(404)
    })
    const montagem = await prepararAplicacao('/')

    wrapper = await montarView(PainelInicioView, montagem)

    const vazio = wrapper.get('[data-teste="anfitriao-sem-evento"]')
    expect(vazio.text()).toContain(TEXTOS_PAINEL_INICIO.anfitriaoVazioTitulo)
    expect(vazio.text()).toContain(TEXTOS_PAINEL_INICIO.anfitriaoVazioTexto)
    expect(vazio.find('button, a').exists()).toBe(false)
    expect(wrapper.find('[data-teste="novo-evento"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="ver-todos"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="estado-primeiro-acesso"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="resumo-carteira"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PENDENCIAS_TAREFAS)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'GET', '/api/financeiro/alertas')).toHaveLength(0)
  })

  it('[UNITÁRIO] o título do primeiro acesso (componente compartilhado) usa o peso leve dos títulos', () => {
    const estilo = estiloDe(lerFonte('componentes/base/EstadoPrimeiroAcesso.vue'))

    expect(estilo).toMatch(/\.primeiro-acesso__titulo \{[^}]*font-weight: var\(--p-fonte-peso-leve\)/)
  })
})
