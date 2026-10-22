import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { ID_VINCULO_FINANCEIRO, financeiroExemplo, fornecedorFinanceiro, resumoPagamentos } from '@/__tests__/auxiliaresFinanceiro'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FINANCEIRO, TEXTOS_PARCELA } from '@/textos/financeiro'
import type { SessaoDto } from '@/tipos/api'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, quando, type Rota } from '../../casamentos/__tests__/auxiliaresCasamentos'

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_FINANCEIRO = `${ROTA_CASAMENTO}/financeiro`

const SESSAO_CASAL: SessaoDto = {
  tokenAcesso: 'token-casal',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-casal',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Casal',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    casamentoId: ID_CASAMENTO,
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

async function abrir(sessao: SessaoDto, financeiro: ReturnType<typeof financeiroExemplo>) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
    quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiro)),
  )
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/financeiro`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function texto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

function errosNoDialogo(): string[] {
  return Array.from(document.body.querySelectorAll('[role="dialog"] [data-teste="erro-campo"]')).map((erro) => texto(erro.textContent ?? ''))
}

function lerFonte(caminho: string): string {
  return readFileSync(resolve(__dirname, caminho), 'utf-8')
}

describe('FinanceiroCasamentoView — indicadores e lateral', () => {
  it('[COMPONENTE] mostra pago, a pagar, vencido e a parcelar, somando só o saldo dos contratados', async () => {
    const financeiro = financeiroExemplo({
      fornecedores: [
        financeiroExemplo().fornecedores[0]!,
        fornecedorFinanceiro({ fornecedorCasamentoId: 'v2', nomeEmpresa: 'Flores do Campo', saldoAParcelar: 2500.5 }),
        fornecedorFinanceiro({ fornecedorCasamentoId: 'v3', nomeEmpresa: 'Banda Aurora', status: 'Cancelado', saldoAParcelar: 999 }),
      ],
    })

    const tela = await abrir(SESSAO_EXEMPLO, financeiro)

    const faixa = tela.get('[data-teste="indicadores-financeiro"]')
    expect(faixa.element.tagName).toBe('UL')
    expect(faixa.attributes('aria-label')).toBe(TEXTOS_FINANCEIRO.indicadoresRotulo)
    expect(faixa.classes()).toEqual(expect.arrayContaining(['grade', 'grade--indicadores']))
    const valores = ['pago', 'a-pagar', 'vencido', 'a-parcelar'].map((chave) =>
      texto(tela.get(`[data-teste="indicador-${chave}"] [data-teste="indicador-valor"]`).text()),
    )
    expect(valores).toEqual(['R$ 6.000,00', 'R$ 12.500,00', 'R$ 3.250,00', 'R$ 2.500,50'])
    const vencido = tela.get('[data-teste="indicador-vencido"]')
    expect(vencido.text()).toContain(TEXTOS_FINANCEIRO.apoioVencidas(1))
    expect(vencido.get('[data-teste="indicador-valor"]').classes()).toContain('financeiro__indicador-valor--alerta')
  })

  it('[COMPONENTE] sem vencido diz que está em dia por texto, não só por cor', async () => {
    const tela = await abrir(SESSAO_EXEMPLO, financeiroExemplo({ resumo: resumoPagamentos({ totalVencido: 0 }) }))

    const vencido = tela.get('[data-teste="indicador-vencido"]')
    expect(vencido.text()).toContain(TEXTOS_FINANCEIRO.apoioEmDia)
    expect(vencido.get('[data-teste="indicador-valor"]').classes()).not.toContain('financeiro__indicador-valor--alerta')
  })

  it('[COMPONENTE] coloca o resumo do orçamento numa lateral nomeada, separada do livro', async () => {
    const tela = await abrir(SESSAO_EXEMPLO, financeiroExemplo())

    const lateral = tela.get('[data-teste="lateral-orcamento"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-label')).toBe(TEXTOS_FINANCEIRO.lateralRotulo)
    expect(lateral.find('[data-teste="resumo-orcamento"]').exists()).toBe(true)
    expect(lateral.find('[data-teste="livro-vencimentos"]').exists()).toBe(false)
    expect(tela.get('.financeiro__principal').find('[data-teste="livro-vencimentos"]').exists()).toBe(true)
    expect(tela.get('#grupo-vencidas').classes()).toContain('texto-rotulo')
  })

  it('[SEGURANÇA] o casal vê indicadores e resumo sem ações e com texto no plural', async () => {
    const tela = await abrir(SESSAO_CASAL, financeiroExemplo({ somenteLeitura: true }))

    expect(tela.findAll('[data-teste="indicadores-financeiro"] > li')).toHaveLength(4)
    expect(tela.find('[data-teste="lateral-orcamento"]').exists()).toBe(true)
    expect(tela.find('[data-teste="adicionar-parcela"]').exists()).toBe(false)
    expect(tela.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(tela.get('[data-teste="rodape-casal"]').text()).toBe('A assessoria registra os pagamentos. Falem com ela se algo estiver diferente.')
  })

  it('[COMPONENTE] o vazio do casal fala com os dois', async () => {
    const tela = await abrir(SESSAO_CASAL, financeiroExemplo({ fornecedores: [], somenteLeitura: true }))

    expect(tela.get('[data-teste="financeiro-vazio"]').text()).toContain('vocês acompanham tudo por aqui')
    expect(tela.find('[data-teste="indicadores-financeiro"]').exists()).toBe(false)
  })
})

describe('Diálogos do financeiro — validação ao sair e ao digitar', () => {
  it('[COMPONENTE] nova parcela só mostra erro depois de tentar salvar e limpa ao digitar um valor válido', async () => {
    const tela = await abrir(SESSAO_EXEMPLO, financeiroExemplo())

    await tela.get('[data-teste="adicionar-parcela"]').trigger('click')
    await flushPromises()
    const dialogo = tela.findComponent({ name: 'DialogoParcela' })
    dialogo.findComponent({ name: 'Select' }).vm.$emit('update:modelValue', ID_VINCULO_FINANCEIRO)
    const valor = dialogo.findComponent({ name: 'InputNumber' })
    valor.vm.$emit('blur', new Event('blur'))
    await flushPromises()
    expect(errosNoDialogo()).toEqual([])

    Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((botao) => botao.textContent?.trim() === TEXTOS_PARCELA.salvarNova)!
      .click()
    await flushPromises()
    expect(errosNoDialogo()).toContain(TEXTOS_PARCELA.erroValor)

    valor.vm.$emit('update:modelValue', 100)
    await flushPromises()
    expect(errosNoDialogo()).not.toContain(TEXTOS_PARCELA.erroValor)
    expect(errosNoDialogo()).toContain(TEXTOS_PARCELA.erroVencimento)
  })

  it('[COMPONENTE] gerar parcelas não acusa erro no primeiro blur e revalida ao digitar depois da tentativa', async () => {
    const tela = await abrir(SESSAO_EXEMPLO, financeiroExemplo({ fornecedores: [fornecedorFinanceiro()] }))

    await tela.get('[data-teste="gerar-parcelas"]').trigger('click')
    await flushPromises()
    const dialogo = tela.findComponent({ name: 'DialogoGerarParcelas' })
    const quantidade = dialogo.findAllComponents({ name: 'InputNumber' })[0]!
    quantidade.vm.$emit('update:modelValue', null)
    quantidade.vm.$emit('blur', new Event('blur'))
    await flushPromises()
    expect(errosNoDialogo()).toEqual([])

    document.body.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()
    expect(errosNoDialogo()).toContain(TEXTOS_PARCELA.erroQuantidade)

    quantidade.vm.$emit('update:modelValue', 3)
    await flushPromises()
    expect(errosNoDialogo()).not.toContain(TEXTOS_PARCELA.erroQuantidade)
  })

  it('[UNITÁRIO] os dois diálogos não validam mais direto no blur', () => {
    for (const arquivo of ['DialogoParcela.vue', 'DialogoGerarParcelas.vue']) {
      const fonte = lerFonte(`../../../componentes/financeiro/${arquivo}`)
      expect(fonte).not.toContain('@blur="formulario.validarCampo(')
      expect(fonte.match(/validarAoSair\(/g)).toHaveLength(3)
      expect(fonte.match(/revalidarAoDigitar\(/g)).toHaveLength(3)
    }
  })
})

describe('Estilo da fundação no financeiro', () => {
  it('[UNITÁRIO] a view usa a largura do layout e o contêiner para a lateral', () => {
    const fonte = lerFonte('../FinanceiroCasamentoView.vue')
    expect(fonte).not.toContain('--p-dimensao-largura-ampla')
    expect(fonte).not.toContain('--p-dimensao-largura-leitura')
    expect(fonte).toContain('container: financeiro / inline-size')
    expect(fonte).toContain('@container financeiro (min-width: 64rem)')
    expect(fonte).not.toContain('--p-fonte-peso-seminegrito')
  })

  it('[UNITÁRIO] o resumo do orçamento usa números leves e hachura no trecho livre', () => {
    const fonte = lerFonte('../../../componentes/base/ResumoOrcamento.vue')
    const numero = fonte.slice(fonte.indexOf('.resumo-orcamento__numero {'), fonte.indexOf('}', fonte.indexOf('.resumo-orcamento__numero {')))
    expect(numero).toContain('--p-fonte-peso-leve')
    expect(fonte).not.toContain('--p-fonte-peso-seminegrito')
    expect(fonte).toContain('repeating-linear-gradient')
    expect(fonte).toContain('.resumo-orcamento__amostra--livre')
  })

  it('[UNITÁRIO] a linha da parcela deixa o dia leve', () => {
    const fonte = lerFonte('../../../componentes/base/LinhaParcela.vue')
    const dia = fonte.slice(fonte.indexOf('.linha-parcela__dia {'), fonte.indexOf('}', fonte.indexOf('.linha-parcela__dia {')))
    expect(dia).toContain('--p-fonte-peso-leve')
    expect(fonte).not.toContain('--p-fonte-peso-seminegrito')
  })
})
