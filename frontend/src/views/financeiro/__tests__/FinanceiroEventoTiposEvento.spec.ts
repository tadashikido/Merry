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
import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { ID_VINCULO_FINANCEIRO_2, financeiroExemplo, fornecedorFinanceiro, parcelaExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FINANCEIRO, TEXTOS_PAGAMENTOS_MES } from '@/textos/financeiro'
import { TIPO_EVENTO_NEUTRO, VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { FinanceiroEventoDto } from '@/tipos/financeiro'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-financeiro')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_FINANCEIRO = `${ROTA_EVENTO}/financeiro`

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

function financeiroComEvento(): FinanceiroEventoDto {
  const base = financeiroExemplo()
  return financeiroExemplo({
    fornecedores: [
      base.fornecedores[0]!,
      fornecedorFinanceiro({
        fornecedorEventoId: ID_VINCULO_FINANCEIRO_2,
        nomeEmpresa: 'Flores do Campo',
        categoria: 'Decoracao',
        parcelas: [
          parcelaExemplo({ id: 'f1', fornecedorEventoId: ID_VINCULO_FINANCEIRO_2, numero: 1, totalParcelas: 2, valor: 2000, vencimento: '2027-05-10', diasParaVencimento: 222 }),
          parcelaExemplo({ id: 'f2', fornecedorEventoId: ID_VINCULO_FINANCEIRO_2, numero: 2, totalParcelas: 2, valor: 1500, vencimento: '2027-06-10', diasParaVencimento: 253 }),
        ],
      }),
      fornecedorFinanceiro({
        fornecedorEventoId: 'cancelado',
        nomeEmpresa: 'Banda Aurora',
        status: 'Cancelado',
        parcelas: [parcelaExemplo({ id: 'c1', fornecedorEventoId: 'cancelado', valor: 9999, vencimento: '2026-12-10' })],
      }),
    ],
  })
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

async function abrir(tipo: string, financeiro: FinanceiroEventoDto = financeiroComEvento(), sessao: SessaoDto = SESSAO_EXEMPLO) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: tipo as TipoEvento }))),
    quando('GET', ROTA_FINANCEIRO, () => respostaJson(financeiro)),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/financeiro`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function texto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

describe('FinanceiroEventoView — pagamentos por mês', () => {
  it('[COMPONENTE] lista só parcelas em aberto de contratados, por mês, com total e meses em ordem', async () => {
    const tela = await abrir('Casamento')

    const bloco = tela.get('[data-teste="pagamentos-por-mes"]')
    expect(bloco.element.tagName).toBe('SECTION')
    expect(bloco.get('h2').text()).toBe(TEXTOS_PAGAMENTOS_MES.titulo)
    expect(bloco.attributes('aria-labelledby')).toBe(bloco.get('h2').attributes('id'))
    expect(texto(bloco.get('[data-teste="pagamentos-mes-total"]').text())).toBe(`R$ 12.750,00 ${TEXTOS_PAGAMENTOS_MES.legenda}`)
    const meses = bloco.findAll('li').map((item) => item.attributes('data-teste'))
    expect(meses).toEqual(['mes-2026-10', 'mes-2026-11', 'mes-2027-05', 'mes-2027-06'])
    expect(texto(bloco.get('[data-teste="mes-2026-10"]').text())).toContain('Outubro de 2026')
    expect(texto(bloco.get('[data-teste="mes-2026-10"]').text())).toContain('R$ 3.250,00')
    expect(texto(bloco.get('[data-teste="mes-2026-10"]').text())).toContain('1 parcela')
    expect(bloco.text()).not.toContain('9.999')
    expect(bloco.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('[COMPONENTE] fica na coluna do orçamento, depois do livro no DOM, sem fixação', async () => {
    const tela = await abrir('Casamento')

    const filhos = Array.from(tela.get('.financeiro__corpo').element.children).map((filho) => filho.className)
    expect(filhos[0]).toContain('financeiro__orcamento')
    expect(filhos[1]).toContain('financeiro__principal')
    expect(filhos[2]).toContain('financeiro__mensal')
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] marca o mês do evento e a nota com o vocabulário de %s', async (tipo) => {
    const tela = await abrir(tipo)

    const contracao = VOCABULARIO_TIPO_EVENTO[tipo].referencia.contracaoDe
    const mesEvento = tela.get('[data-teste="mes-2027-05"]')
    expect(mesEvento.classes()).toContain('pagamentos-mes__item--evento')
    expect(mesEvento.get('[data-teste="mes-do-evento"]').text()).toContain(TEXTOS_PAGAMENTOS_MES.mesDoEvento(contracao))
    expect(tela.findAll('[data-teste="mes-do-evento"]')).toHaveLength(1)
    expect(texto(tela.get('[data-teste="pagamentos-mes-nota"]').text())).toBe(
      `${TEXTOS_PAGAMENTOS_MES.ateEvento('R$ 11.250,00', contracao)} ${TEXTOS_PAGAMENTOS_MES.depois('R$ 1.500,00')}`,
    )
  })

  it('[COMPONENTE] tipo desconhecido usa o vocabulário neutro e nunca fala em casamento', async () => {
    const tela = await abrir('Formatura')

    const neutro = VOCABULARIO_TIPO_EVENTO[TIPO_EVENTO_NEUTRO].referencia.contracaoDe
    expect(tela.get('[data-teste="mes-do-evento"]').text()).toContain(TEXTOS_PAGAMENTOS_MES.mesDoEvento(neutro))
    expect(tela.get('[data-teste="pagamentos-por-mes"]').text().toLowerCase()).not.toContain('casamento')
  })

  it('[COMPONENTE] sem parcelas em aberto o bloco não aparece', async () => {
    const base = financeiroExemplo()
    const soPagaEVencida = financeiroExemplo({
      fornecedores: [{ ...base.fornecedores[0]!, parcelas: base.fornecedores[0]!.parcelas.filter((parcela) => parcela.situacao !== 'Pendente') }],
    })

    const tela = await abrir('QuinzeAnos', soPagaEVencida)

    expect(tela.find('[data-teste="lateral-orcamento"]').exists()).toBe(true)
    expect(tela.find('[data-teste="pagamentos-por-mes"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] o anfitrião vê o bloco somente leitura, sem ações nem dados de contato', async () => {
    const tela = await abrir('Aniversario', financeiroComEvento(), SESSAO_ANFITRIAO)

    const bloco = tela.get('[data-teste="pagamentos-por-mes"]')
    expect(bloco.findAll('button')).toHaveLength(0)
    expect(bloco.findAll('a')).toHaveLength(0)
    expect(bloco.text()).not.toMatch(/@|\(\d{2}\)/)
  })

  it('[SEGURANÇA] sem permissão não mostra valores nem o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos' }))),
      quando('GET', ROTA_FINANCEIRO, () => respostaProblema(403, { title: 'Sem acesso.' })),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/financeiro`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_FINANCEIRO.semAcesso)
    expect(wrapper.find('[data-teste="pagamentos-por-mes"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="lateral-orcamento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] erro de rede mostra o erro com nova tentativa e nenhum bloco de valores', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'Aniversario' }))),
      quando('GET', ROTA_FINANCEIRO, () => respostaProblema(500, { title: 'Erro.' })),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/financeiro`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_FINANCEIRO.erroTexto)
    expect(wrapper.find('[data-teste="pagamentos-por-mes"]').exists()).toBe(false)
  })
})

describe('FinanceiroEventoView — primeiro acesso por tipo', () => {
  it.each(['QuinzeAnos', 'Casamento'] as const)('[COMPONENTE] o título do primeiro acesso usa a referência de %s', async (tipo) => {
    const tela = await abrir(tipo, financeiroExemplo({ fornecedores: [] }))

    expect(tela.get('[data-teste="financeiro-primeiro-acesso"]').text()).toContain(
      TEXTOS_FINANCEIRO.primeiroAcessoTituloPara(VOCABULARIO_TIPO_EVENTO[tipo].referencia.contracaoDe),
    )
  })

  it('[COMPONENTE] tipo desconhecido no primeiro acesso não cai em casamento', async () => {
    const tela = await abrir('Formatura', financeiroExemplo({ fornecedores: [] }))

    const primeiroAcesso = tela.get('[data-teste="financeiro-primeiro-acesso"]').text()
    expect(primeiroAcesso).toContain(TEXTOS_FINANCEIRO.primeiroAcessoTituloPara(VOCABULARIO_TIPO_EVENTO[TIPO_EVENTO_NEUTRO].referencia.contracaoDe))
    expect(primeiroAcesso.toLowerCase()).not.toContain('casamento')
  })
})

describe('Textos do financeiro', () => {
  it('[UNITÁRIO] nenhum texto do financeiro trata casamento como conceito geral', () => {
    const fonte = readFileSync(resolve(__dirname, '../../../textos/financeiro.ts'), 'utf-8')
    expect(fonte.toLowerCase()).not.toMatch(/casamento|casal|noiv/)
  })

  it('[UNITÁRIO] o componente de pagamentos por mês só se ajusta por contêiner', () => {
    const fonte = readFileSync(resolve(__dirname, '../../../componentes/financeiro/PagamentosPorMes.vue'), 'utf-8')
    expect(fonte).toContain('container: pagamentos-mes / inline-size')
    expect(fonte).not.toContain('@media')
    expect(fonte).not.toContain('sticky')
  })
})
