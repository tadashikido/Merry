import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type { ListaConvitesDto } from '@/tipos/convidados'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

const ID_CONVITE = '33333333-3333-4333-8333-333333333333'
const ID_LIA = '44444444-4444-4444-8444-444444444444'
const ID_RUI = '55555555-5555-4555-8555-555555555555'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_RELATORIO = `${ROTA_EVENTO}/restricoes-alimentares`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const ROTA_LIA = `${ROTA_CONVITES}/${ID_CONVITE}/convidados/${ID_LIA}/restricao-alimentar`
const ROTA_RUI = `${ROTA_CONVITES}/${ID_CONVITE}/convidados/${ID_RUI}/restricao-alimentar`

function relatorio(dados: Partial<RelatorioRestricoesAlimentaresDto> = {}): RelatorioRestricoesAlimentaresDto {
  return {
    totalPessoas: 2,
    totalConfirmados: 2,
    porTipo: [
      { tipo: 'SemGluten', quantidade: 2 },
      { tipo: 'Vegana', quantidade: 1 },
    ],
    outrasRestricoes: 1,
    necessidadesEspeciais: 1,
    pessoas: [
      {
        convidadoId: ID_LIA,
        conviteId: ID_CONVITE,
        nome: 'Lia Souza',
        acompanhante: false,
        resposta: 'Confirmado',
        tipos: ['SemGluten', 'Vegana'],
        outraRestricao: 'sem porco',
        necessidadeEspecial: 'Cadeira de rodas',
        origemConsentimento: 'Convidado',
        consentidoEm: '2026-10-01T12:00:00Z',
      },
      {
        convidadoId: '66666666-6666-4666-8666-666666666666',
        conviteId: ID_CONVITE,
        nome: 'Pedro Lima',
        acompanhante: true,
        resposta: 'Confirmado',
        tipos: ['SemGluten'],
        outraRestricao: null,
        necessidadeEspecial: null,
        origemConsentimento: 'Cerimonialista',
        consentidoEm: '2026-10-02T12:00:00Z',
      },
    ],
    diasRetencao: 30,
    dataExclusaoPrevista: '2027-06-14',
    dadosExcluidosEm: null,
    registrosIlegiveis: 0,
    podeRegistrar: true,
    ...dados,
  }
}

const LISTA: ListaConvitesDto = {
  convites: [
    {
      id: ID_CONVITE,
      nome: 'Família Souza',
      grupo: null,
      limiteAcompanhantes: 1,
      statusEnvio: 'Enviado',
      convidados: [
        { id: ID_LIA, nome: 'Lia Souza', telefone: null, email: null, faixaEtaria: 'Crianca', resposta: 'Confirmado', acompanhante: false, possuiRestricao: true },
        { id: ID_RUI, nome: 'Rui Souza', telefone: '11987654321', email: null, faixaEtaria: 'Adulto', resposta: 'Pendente', acompanhante: false, possuiRestricao: false },
        { id: 'recusou', nome: 'Ana Recusou', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Recusado', acompanhante: false, possuiRestricao: false },
      ],
      criadoEm: '2026-09-01T00:00:00Z',
      atualizadoEm: '2026-09-01T00:00:00Z',
      respondidoEm: null,
    },
  ],
  totais: {
    convites: 1,
    pessoas: 3,
    adultos: 2,
    criancas: 1,
    acompanhantesPermitidos: 1,
    pendentes: { adultos: 1, criancas: 0, total: 1 },
    confirmados: { adultos: 0, criancas: 1, total: 1 },
    recusados: { adultos: 1, criancas: 0, total: 1 },
  },
  convidadosEstimados: null,
  eventoArquivado: false,
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

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/restricoes-alimentares`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

function rotas(corpo: () => Response = () => respostaJson(relatorio())) {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_RELATORIO, corpo),
    quando('GET', ROTA_CONVITES, () => respostaJson(LISTA)),
  ]
}

async function selecionarNoMenu(rotulo: string) {
  await wrapper!.findAll('[data-teste="menu-acoes"]')[0]!.trigger('click')
  await flushPromises()
  const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((elemento) => elemento.textContent?.includes(rotulo))
  expect(item).toBeTruthy()
  ;((item!.querySelector('a, div') ?? item) as HTMLElement).click()
  await flushPromises()
}

function noCorpo(seletor: string): HTMLElement {
  const elemento = document.body.querySelector<HTMLElement>(seletor)
  if (!elemento) {
    throw new Error(`Elemento ${seletor} não encontrado`)
  }
  return elemento
}

describe('RestricoesAlimentaresView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] mostra cardápio para o buffet, lista nominal sem contato e data de exclusão', async () => {
    rotearFetch(fetchSimulado, ...rotas())
    await abrir()

    const texto = wrapper!.text()
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_DADOS_SENSIVEIS.tituloPainel)
    expect(wrapper!.get('[data-teste="cardapio-SemGluten"]').text()).toContain('Sem glúten')
    expect(wrapper!.get('[data-teste="cardapio-SemGluten"] dd').text()).toBe('2')
    expect(wrapper!.get('[data-teste="cardapio-outras"] dd').text()).toBe('1')
    expect(wrapper!.get('[data-teste="cardapio-necessidades"] dd').text()).toBe('1')
    expect(texto).toContain('2 pessoas com restrição, 2 confirmadas')
    expect(texto).toContain('Lia Souza')
    expect(texto).toContain('Sem glúten, Vegana, sem porco')
    expect(texto).toContain('Cadeira de rodas')
    expect(texto).toContain('acompanhante')
    expect(texto).toContain('Registrada pela assessoria')
    expect(texto).not.toContain('98765')
    expect(wrapper!.get('[data-teste="restricoes-exclusao-prevista"]').text()).toContain('14/06/2027')
    expect(document.title).toContain('Restrições alimentares')
  })

  it('[COMPONENTE] vazio convida a registrar', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => respostaJson(relatorio({ totalPessoas: 0, totalConfirmados: 0, porTipo: [], pessoas: [], outrasRestricoes: 0, necessidadesEspeciais: 0 }))))
    await abrir()

    expect(wrapper!.get('[data-teste="restricoes-vazio"]').text()).toContain(TEXTOS_DADOS_SENSIVEIS.vazioTitulo)
  })

  it('[COMPONENTE] depois da retenção mostra dados excluídos e esconde o registro', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(() =>
        respostaJson(
          relatorio({
            totalPessoas: 0,
            totalConfirmados: 0,
            porTipo: [],
            pessoas: [],
            dadosExcluidosEm: '2027-06-15T09:00:00Z',
            podeRegistrar: false,
          }),
        ),
      ),
    )
    await abrir()

    expect(wrapper!.get('[data-teste="restricoes-excluidas"]').text()).toContain(TEXTOS_DADOS_SENSIVEIS.dadosExcluidosTitulo)
    expect(wrapper!.get('[data-teste="restricoes-excluidas"]').text()).toContain('15/06/2027')
    expect(wrapper!.find('[data-teste="registrar-restricao"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="restricoes-exclusao-prevista"]').exists()).toBe(false)
  })

  it('[COMPONENTE] registros ilegíveis geram alerta', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => respostaJson(relatorio({ registrosIlegiveis: 2 }))))
    await abrir()

    expect(wrapper!.get('[data-teste="restricoes-ilegiveis"]').text()).toContain('2 restrições não puderam ser lidas')
  })

  it('[SEGURANÇA] sem permissão mostra estado de erro sem tentar de novo', async () => {
    rotearFetch(fetchSimulado, ...rotas(() => respostaProblema(403, { title: 'Proibido' })))
    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_DADOS_SENSIVEIS.semAcesso)
  })

  it('[INTEGRAÇÃO] erro de carregamento permite tentar de novo', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      ...rotas(() => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(relatorio())
      }),
    )
    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_DADOS_SENSIVEIS.erroCarregar)

    const botao = wrapper!.findAll('button').find((item) => item.text() === 'Tentar novamente')!
    await botao.trigger('click')
    await flushPromises()

    expect(wrapper!.text()).toContain('Lia Souza')
  })

  it('[SEGURANÇA] editar exige a declaração de consentimento antes de salvar', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(),
      quando('PUT', ROTA_LIA, () =>
        respostaJson({ tipos: ['Vegana'], outraRestricao: null, necessidadeEspecial: null, origemConsentimento: 'Cerimonialista', consentidoEm: 'x' }),
      ),
    )
    await abrir()

    await selecionarNoMenu(TEXTOS_DADOS_SENSIVEIS.editar)

    expect(noCorpo('[data-teste="dialogo-restricao"]').textContent).toContain('Editar restrição de Lia Souza')
    expect(noCorpo('[data-teste="restricao-tipo-SemGluten"]').getAttribute('aria-pressed')).toBe('true')

    noCorpo('[data-teste="restricao-salvar"]').click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', ROTA_LIA)).toHaveLength(0)
    expect(noCorpo('[data-teste="consentimento-erro"]').textContent).toContain(TEXTOS_DADOS_SENSIVEIS.erroConsentimentoObtido)

    const caixa = noCorpo('[data-teste="consentimento-entrada"]') as HTMLInputElement
    caixa.click()
    await flushPromises()
    noCorpo('[data-teste="restricao-salvar"]').click()
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_LIA)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      tipos: ['SemGluten', 'Vegana'],
      outraRestricao: 'sem porco',
      necessidadeEspecial: 'Cadeira de rodas',
      consentimentoObtido: true,
    })
    expect(document.body.querySelector('[data-teste="dialogo-restricao"]')).toBeNull()
    expect(chamadas(fetchSimulado, 'GET', ROTA_RELATORIO).length).toBeGreaterThanOrEqual(2)
  })

  it('[INTEGRAÇÃO] 422 do servidor aparece dentro do diálogo', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotas(),
      quando('PUT', ROTA_LIA, () => respostaProblema(422, { title: 'Regra', detail: TEXTOS_DADOS_SENSIVEIS.retencaoEncerrada })),
    )
    await abrir()
    await selecionarNoMenu(TEXTOS_DADOS_SENSIVEIS.editar)
    ;(noCorpo('[data-teste="consentimento-entrada"]') as HTMLInputElement).click()
    await flushPromises()

    noCorpo('[data-teste="restricao-salvar"]').click()
    await flushPromises()

    expect(noCorpo('[data-teste="restricao-dialogo-erro"]').textContent).toContain(TEXTOS_DADOS_SENSIVEIS.retencaoEncerrada)
  })

  it('[COMPONENTE] registrar nova oferece só pessoas sem restrição que não recusaram e valida campos', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('PUT', ROTA_RUI, () => respostaJson({})))
    await abrir()

    await wrapper!.get('[data-teste="registrar-restricao"]').trigger('click')
    await flushPromises()
    noCorpo('[data-teste="restricao-salvar"]').click()
    await flushPromises()

    const dialogo = noCorpo('[data-teste="dialogo-restricao"]')
    expect(dialogo.textContent).toContain(TEXTOS_DADOS_SENSIVEIS.erroSemPessoa)
    expect(dialogo.textContent).toContain(TEXTOS_DADOS_SENSIVEIS.erroSemConteudo)
    expect(dialogo.textContent).toContain(TEXTOS_DADOS_SENSIVEIS.erroConsentimentoObtido)
    expect(chamadas(fetchSimulado, 'PUT', ROTA_RUI)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES)).toHaveLength(1)
  })

  it('[COMPONENTE] remover pede confirmação e recarrega', async () => {
    rotearFetch(fetchSimulado, ...rotas(), quando('DELETE', ROTA_LIA, () => respostaVazia()))
    const montagem = await abrir()

    await selecionarNoMenu(TEXTOS_DADOS_SENSIVEIS.remover)

    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)
    expect(confirmacao.nomeItem).toBe('restrição de Lia Souza')
    await confirmacao.confirmar()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', ROTA_LIA)).toHaveLength(1)
    expect(chamadas(fetchSimulado, 'GET', ROTA_RELATORIO).length).toBeGreaterThanOrEqual(2)
  })
})
