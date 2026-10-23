import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { HOJE_TESTE, ID_VINCULO_FINANCEIRO, financeiroExemplo, fornecedorFinanceiro, parcelaExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FINANCEIRO, TEXTOS_GERADOR_PARCELAS, TEXTOS_PAGAMENTO, TEXTOS_PARCELA } from '@/textos/financeiro'
import type { SessaoDto } from '@/tipos/api'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-financeiro')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_FINANCEIRO = `${ROTA_EVENTO}/financeiro`
const ROTA_PARCELAS = `${ROTA_EVENTO}/fornecedores/${ID_VINCULO_FINANCEIRO}/parcelas`

const SESSAO_ANFITRIAO: SessaoDto = {
  tokenAcesso: 'token-anfitriao',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-anfitriao',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Anfitriao',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    eventoId: ID_EVENTO,
  },
}

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(sessao)
    }
    for (const rota of rotas) {
      const resposta = rota(url, init)
      if (resposta) {
        return resposta
      }
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
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

async function abrir(caminho = `/eventos/${ID_EVENTO}/financeiro`) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function botaoDoDialogo(rotulo: string): HTMLButtonElement {
  return Array.from(document.body.querySelectorAll('[role="alertdialog"] button, [role="dialog"] button')).find(
    (botao) => botao.textContent?.trim() === rotulo,
  ) as HTMLButtonElement
}

function texto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

describe('FinanceiroEventoView — assessoria', () => {
  it('[COMPONENTE] mostra o resumo pago de contratado, a faixa de alertas e o livro cortado pela linha do hoje', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo())),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('h1').text()).toBe(TEXTOS_FINANCEIRO.titulo)
    expect(texto(wrapper.get('[data-teste="resumo-frase"]').text())).toBe('R$ 6.000,00 pagos de R$ 18.500,00 contratados')
    expect(wrapper.get('[data-teste="faixa-alertas"]').text()).toContain('1 parcela vencida (R$ 3.250,00) · 1 vence em 7 dias')
    const livro = wrapper.get('[data-teste="livro-vencimentos"]')
    const ordem = livro.findAll('[data-teste="grupo-vencidas"], [data-teste="linha-hoje"], [data-teste="grupo-proximas"], [data-teste="grupo-depois"], [data-teste="grupo-pagas"]')
    expect(ordem.map((elemento) => elemento.attributes('data-teste'))).toEqual(['grupo-vencidas', 'linha-hoje', 'grupo-proximas', 'grupo-depois', 'grupo-pagas'])
    expect(livro.get('[data-teste="linha-hoje"]').attributes('aria-label')).toBe('Hoje, 30 set')
    expect(livro.get('[data-teste="grupo-vencidas"]').text()).toContain('Buffet São João · 2/4')
    expect(livro.get('[data-teste="grupo-proximas"]').text()).toContain('Vence em 2 dias')
    const alternar = livro.get('[data-teste="alternar-pagas"]')
    expect(alternar.attributes('aria-expanded')).toBe('false')
    await alternar.trigger('click')
    expect(alternar.attributes('aria-expanded')).toBe('true')
    expect(livro.get('#lista-pagas').text()).toContain('Paga em 29 ago')
    expect(wrapper.find('[data-teste="adicionar-parcela"]').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(4)
  })

  it('[INTEGRAÇÃO] marca como paga pela data padrão de hoje e oferece desfazer no toast', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo())),
      quando('PUT', `${ROTA_PARCELAS}/vencida/pagamento`, () =>
        respostaJson(parcelaExemplo({ id: 'vencida', numero: 2, totalParcelas: 4, situacao: 'Paga', pagaEm: HOJE_TESTE })),
      ),
      quando('DELETE', `${ROTA_PARCELAS}/vencida/pagamento`, () => respostaJson(parcelaExemplo({ id: 'vencida' }))),
    )
    const { wrapper } = await abrir()

    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'pagar')
    await flushPromises()
    expect(document.body.querySelector('[data-teste="resumo-pagamento"]')!.textContent).toContain('Buffet São João · 2/4 · R$ 3.250,00')
    botaoDoDialogo(TEXTOS_PAGAMENTO.confirmar).click()
    await flushPromises()

    const pagamento = chamadas(fetchSimulado, 'PUT', `${ROTA_PARCELAS}/vencida/pagamento`)
    expect(pagamento).toHaveLength(1)
    expect(corpoDaChamada(pagamento[0]!)).toEqual({ pagaEm: HOJE_TESTE })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_PARCELA.sucessoPaga(2, 4, 'Buffet São João'), expect.objectContaining({ desfazer: expect.any(Function) }))
    expect(chamadas(fetchSimulado, 'GET', ROTA_FINANCEIRO).length).toBeGreaterThanOrEqual(2)

    const opcoes = notificacoes.sucesso.mock.calls[0]![1] as { desfazer: () => Promise<void> }
    await opcoes.desfazer()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_PARCELAS}/vencida/pagamento`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenLastCalledWith(TEXTOS_PARCELA.sucessoDesfeito)
  })

  it('[COMPONENTE] data do pagamento só é validada no blur depois de confirmar e o erro some ao corrigir', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo())),
      quando('PUT', `${ROTA_PARCELAS}/vencida/pagamento`, () =>
        respostaJson(parcelaExemplo({ id: 'vencida', numero: 2, totalParcelas: 4, situacao: 'Paga', pagaEm: HOJE_TESTE })),
      ),
    )
    const { wrapper } = await abrir()
    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'pagar')
    await flushPromises()
    const campo = document.body.querySelector<HTMLInputElement>('[data-teste="campo-data-pagamento"]')!
    const dialogo = () => document.body.querySelector('[data-teste="dialogo-pagamento"]')!.textContent ?? ''

    campo.value = ''
    campo.dispatchEvent(new Event('input'))
    campo.dispatchEvent(new Event('blur'))
    await flushPromises()
    expect(dialogo()).not.toContain(TEXTOS_PARCELA.erroDataPagamento)

    botaoDoDialogo(TEXTOS_PAGAMENTO.confirmar).click()
    await flushPromises()
    expect(dialogo()).toContain(TEXTOS_PARCELA.erroDataPagamento)
    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_PARCELAS}/vencida/pagamento`)).toHaveLength(0)

    campo.value = HOJE_TESTE
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(dialogo()).not.toContain(TEXTOS_PARCELA.erroDataPagamento)

    botaoDoDialogo(TEXTOS_PAGAMENTO.confirmar).click()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_PARCELAS}/vencida/pagamento`)).toHaveLength(1)
  })

  it('[INTEGRAÇÃO] gera parcelas pela prévia com centavos na última', async () => {
    const semParcelas = financeiroExemplo({ fornecedores: [fornecedorFinanceiro()] })
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(semParcelas)),
      quando('POST', `${ROTA_PARCELAS}/geracao`, () =>
        respostaJson({ fornecedorEventoId: ID_VINCULO_FINANCEIRO, valorContratado: 18500, parcelado: 18500, pago: 0, saldoAParcelar: 0, parcelas: [] }),
      ),
    )
    const { wrapper } = await abrir()

    expect(wrapper.find('[data-teste="visao-fornecedores"]').exists()).toBe(true)
    await wrapper.get('[data-teste="gerar-parcelas"]').trigger('click')
    await flushPromises()
    const dialogo = wrapper.findComponent({ name: 'DialogoGerarParcelas' })
    dialogo.findAllComponents({ name: 'InputNumber' })[0]!.vm.$emit('update:modelValue', 3)
    const data = document.body.querySelector<HTMLInputElement>('[data-teste="campo-primeiro-vencimento"]')!
    data.value = '2027-01-31'
    data.dispatchEvent(new Event('input'))
    await flushPromises()

    const itens = Array.from(document.body.querySelectorAll('[data-teste="previa-item"]')).map((item) =>
      texto(Array.from(item.children).map((parte) => parte.textContent ?? '').join(' ')),
    )
    expect(itens).toEqual(['1/3 31 jan 2027 R$ 6.166,66', '2/3 28 fev 2027 R$ 6.166,66', '3/3 31 mar 2027 R$ 6.166,68'])
    botaoDoDialogo(TEXTOS_GERADOR_PARCELAS.confirmar(3)).click()
    await flushPromises()

    const geracao = chamadas(fetchSimulado, 'POST', `${ROTA_PARCELAS}/geracao`)
    expect(corpoDaChamada(geracao[0]!)).toEqual({ quantidade: 3, valorTotal: 18500, primeiroVencimento: '2027-01-31', observacao: null })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_GERADOR_PARCELAS.sucesso(3, 'Buffet São João'))
  })

  it('[COMPONENTE] impede na tela a parcela que passa do contratado', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo())),
    )
    const { wrapper } = await abrir()

    await wrapper.get('[data-teste="adicionar-parcela"]').trigger('click')
    await flushPromises()
    const dialogo = wrapper.findComponent({ name: 'DialogoParcela' })
    dialogo.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', ID_VINCULO_FINANCEIRO)
    dialogo.findComponent({ name: 'InputNumber' }).vm.$emit('update:modelValue', 1)
    const vencimento = document.body.querySelector<HTMLInputElement>('[data-teste="campo-vencimento-parcela"]')!
    vencimento.value = '2026-12-01'
    vencimento.dispatchEvent(new Event('input'))
    await flushPromises()
    botaoDoDialogo(TEXTOS_PARCELA.salvarNova).click()
    await flushPromises()

    expect(document.body.textContent).toContain(TEXTOS_PARCELA.erroSomaExcede('R$ 1,00'))
    expect(chamadas(fetchSimulado, 'POST', ROTA_PARCELAS)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] remove parcela pendente com confirmação destrutiva', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo())),
      quando('DELETE', `${ROTA_PARCELAS}/vencida`, () => respostaVazia()),
    )
    const { wrapper } = await abrir()

    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'remover')
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_PARCELA.confirmarRemoverTitulo(2, 4, 'Buffet São João'))
    botaoDoDialogo(TEXTOS_PARCELA.confirmarRemover).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_PARCELAS}/vencida`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_PARCELA.sucessoRemovida)
  })

  it('[COMPONENTE] sem fornecedor contratado orienta o primeiro acesso', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo({ fornecedores: [] }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.find('[data-teste="financeiro-primeiro-acesso"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(TEXTOS_FINANCEIRO.irFornecedores)
  })

  it('[COMPONENTE] erro de conexão mostra estado de erro com nova tentativa', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaProblema(500, { title: 'Erro' })),
    )

    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain(TEXTOS_FINANCEIRO.erroTitulo)
    expect(wrapper.find('[data-teste="livro-vencimentos"]').exists()).toBe(false)
  })
})

describe('FinanceiroEventoView — anfitriões', () => {
  it('[SEGURANÇA] vê resumo e parcelas sem ações de escrita e pode baixar o comprovante', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiroExemplo({ somenteLeitura: true }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(wrapper.find('[data-teste="adicionar-parcela"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="rodape-anfitriao"]').text()).toBe(TEXTOS_FINANCEIRO.rodapeAnfitriao)
    await wrapper.get('[data-teste="alternar-pagas"]').trigger('click')
    expect(wrapper.get('[data-teste="baixar-comprovante"]').attributes('aria-label')).toContain('Baixar comprovante da parcela 1/4 de Buffet São João')
    expect(wrapper.find('[data-teste="entrada-comprovante"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] financeiro de outro evento mostra não encontrado', async () => {
    rotear(fetchSimulado, SESSAO_ANFITRIAO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())))

    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain(TEXTOS_FINANCEIRO.naoEncontradoTitulo)
    expect(wrapper.get('[data-teste="voltar"]').text()).toBe(TEXTOS_FINANCEIRO.voltarNossoEvento)
  })
})
