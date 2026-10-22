import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'

import { alertasExemplo, HOJE_TESTE, resumoPagamentos } from '@/__tests__/auxiliaresFinanceiro'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import LinhaFornecedorEvento from '@/componentes/base/LinhaFornecedorEvento.vue'
import LinhaHoje from '@/componentes/base/LinhaHoje.vue'
import LinhaParcela from '@/componentes/base/LinhaParcela.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import { PARES_CONTRASTE, atendeContraste } from '@/design/contraste'
import { TEXTOS_ALERTAS_PAGAMENTOS, TEXTOS_REGUA_PAGAMENTOS } from '@/textos/financeiro'

const Vazia = defineComponent({ render: () => h('div') })

let montado: VueWrapper | undefined

afterEach(() => {
  montado?.unmount()
  montado = undefined
  document.body.innerHTML = ''
})

async function criarRoteador() {
  const roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Vazia },
      { path: '/eventos/:id/financeiro', name: 'evento-financeiro', component: Vazia },
    ],
  })
  await roteador.push('/')
  await roteador.isReady()
  return roteador
}

function texto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

const PROPS_PARCELA = {
  nomeEmpresa: 'Fotografia Lumière',
  numero: 3,
  total: 4,
  valor: 2000,
  vencimento: '2026-09-28',
  situacao: 'Vencida' as const,
  diasParaVencimento: -2,
}

describe('LinhaParcela', () => {
  it('[COMPONENTE] mostra data, fornecedor com número, valor tabular e situação com texto', () => {
    montado = mount(LinhaParcela, { props: { ...PROPS_PARCELA, observacao: 'Pix' } })

    expect(montado.element.tagName).toBe('LI')
    expect(montado.get('.linha-parcela__dia').text()).toBe('28')
    expect(montado.get('.linha-parcela__mes').text()).toBe('set')
    expect(montado.get('[data-teste="parcela-titulo"]').text()).toBe('Fotografia Lumière · 3/4')
    expect(texto(montado.get('[data-teste="parcela-valor"]').text())).toBe('R$ 2.000,00')
    expect(montado.get('[data-teste="parcela-situacao"]').text()).toBe('Vencida há 2 dias')
    expect(montado.text()).toContain('Vencimento em 28 de setembro de 2026')
    expect(montado.classes()).toContain('linha-parcela--vencida')
  })

  it('[COMPONENTE] cobre vence hoje, vence em breve, pendente, paga com comprovante e histórico', () => {
    const hoje = mount(LinhaParcela, { props: { ...PROPS_PARCELA, situacao: 'Pendente', diasParaVencimento: 0, venceEmBreve: true } })
    const breve = mount(LinhaParcela, { props: { ...PROPS_PARCELA, situacao: 'Pendente', diasParaVencimento: 5, venceEmBreve: true } })
    const pendente = mount(LinhaParcela, { props: { ...PROPS_PARCELA, situacao: 'Pendente', diasParaVencimento: 40 } })
    const paga = mount(LinhaParcela, { props: { ...PROPS_PARCELA, situacao: 'Paga', pagaEm: '2026-09-27', possuiComprovante: true } })
    const historico = mount(LinhaParcela, { props: { ...PROPS_PARCELA, historico: true } })

    expect(hoje.get('[data-teste="parcela-situacao"]').text()).toBe('Vence hoje')
    expect(breve.get('[data-teste="parcela-situacao"]').text()).toBe('Vence em 5 dias')
    expect(breve.classes()).toContain('linha-parcela--breve')
    expect(pendente.get('[data-teste="parcela-situacao"]').text()).toBe('Pendente')
    expect(paga.get('[data-teste="parcela-situacao"]').text()).toBe('Paga em 27 set')
    expect(paga.find('[data-teste="parcela-comprovante"]').exists()).toBe(true)
    expect(historico.classes()).toContain('linha-parcela--historico')
    for (const item of [hoje, breve, pendente, paga, historico]) {
      item.unmount()
    }
  })

  it('[COMPONENTE] com destino vira link inteiro e mostra os anfitriões', async () => {
    const roteador = await criarRoteador()
    montado = mount(LinhaParcela, {
      props: { ...PROPS_PARCELA, nomesAnfitrioes: 'Ana & João', destino: { name: 'evento-financeiro', params: { id: 'c1' } } },
      global: { plugins: [roteador] },
    })

    expect(montado.get('a').attributes('href')).toBe('/eventos/c1/financeiro')
    expect(montado.text()).toContain('Ana & João')
  })
})

describe('LinhaHoje', () => {
  it('[COMPONENTE] separa passado e futuro com texto acessível, não só cor', () => {
    montado = mount(LinhaHoje, { props: { hoje: HOJE_TESTE } })

    expect(montado.attributes('role')).toBe('separator')
    expect(montado.attributes('aria-label')).toBe('Hoje, 30 set')
    expect(montado.text()).toBe('Hoje, 30 set')
  })
})

describe('ResumoOrcamento com pagamentos', () => {
  it('[COMPONENTE] troca a frase para pagos de contratados e mostra a régua de três camadas com rótulo acessível', () => {
    montado = mount(ResumoOrcamento, { props: { resumo: resumoPagamentos(), exibirPagamentos: true } })

    expect(texto(montado.get('[data-teste="resumo-frase"]').text())).toBe('R$ 6.000,00 pagos de R$ 18.500,00 contratados')
    expect(texto(montado.get('[data-teste="resumo-apoio"]').text())).toBe('R$ 12.500,00 a pagar · R$ 3.250,00 vencidos · R$ 18.000,00 orçados')
    const faixa = montado.get('[data-teste="resumo-regua-total"] [role="img"]')
    expect(faixa.attributes('aria-label')).toBe(TEXTOS_REGUA_PAGAMENTOS.reguaAria(32, 68, 0))
    const buffet = montado.get('[data-teste="resumo-categoria-Buffet"]')
    expect(texto(buffet.get('[data-teste="resumo-pago"]').text())).toBe('R$ 6.000,00')
    expect(buffet.get('[data-teste="resumo-vencido"]').text()).toContain('R$ 3.250,00 vencidos')
    expect(buffet.find('[data-teste="resumo-excedente"]').exists()).toBe(false)
    expect(buffet.get('.resumo-orcamento__camada--pago').attributes('style')).toContain('inline-size: 32.4%')
    expect(montado.get('caption').text()).toBe(TEXTOS_REGUA_PAGAMENTOS.legenda)
  })

  it('[COMPONENTE] sem a prop mantém o comportamento da tarefa 16', () => {
    montado = mount(ResumoOrcamento, { props: { resumo: resumoPagamentos() } })

    expect(texto(montado.get('[data-teste="resumo-frase"]').text())).toContain('contratados de')
    expect(montado.find('[data-teste="resumo-regua-total"]').exists()).toBe(false)
    expect(montado.find('.resumo-orcamento__preenchimento').exists()).toBe(true)
  })
})

describe('BlocoAlertasPagamentos', () => {
  it('[COMPONENTE] no dashboard mostra totais, eventos e linhas que levam ao financeiro de cada evento', async () => {
    const roteador = await criarRoteador()
    montado = mount(BlocoAlertasPagamentos, {
      props: { alertas: alertasExemplo({ totalProximas: 4 }), contexto: 'organizacao' },
      global: { plugins: [roteador, PrimeVue] },
    })

    expect(texto(montado.get('[data-teste="valor-vencidas"]').text())).toBe('R$ 5.250,00')
    expect(montado.text()).toContain('2 vencidas em 2 eventos')
    expect(montado.text()).toContain('4 nos próximos 7 dias')
    expect(montado.findAll('[data-teste="grupo-alertas-vencidas"] [data-teste="linha-parcela"]')).toHaveLength(2)
    expect(montado.get('[data-teste="grupo-alertas-vencidas"] a').attributes('href')).toBe('/eventos/22222222-2222-4222-8222-222222222222/financeiro')
    expect(montado.text()).toContain('Ana & João')
    expect(montado.get('[data-teste="alertas-mais"]').text()).toBe(TEXTOS_ALERTAS_PAGAMENTOS.mais(3))
    expect(montado.find('[data-teste="ver-financeiro"]').exists()).toBe(false)
  })

  it('[COMPONENTE] no evento esconde os anfitriões, mostra o link e o estado calmo quando está tudo em dia', async () => {
    const roteador = await criarRoteador()
    montado = mount(BlocoAlertasPagamentos, {
      props: {
        alertas: alertasExemplo({ totalVencidas: 0, valorVencidas: 0, totalProximas: 0, valorProximas: 0, vencidas: [], proximas: [] }),
        contexto: 'evento',
        destinoFinanceiro: { name: 'evento-financeiro', params: { id: 'c1' } },
      },
      global: { plugins: [roteador, PrimeVue] },
    })

    expect(montado.get('[data-teste="alertas-vazio"]').text()).toBe(TEXTOS_ALERTAS_PAGAMENTOS.vazio)
    expect(montado.get('[data-teste="ver-financeiro"]').attributes('href')).toBe('/eventos/c1/financeiro')
    expect(montado.text()).not.toContain('Ana & João')
  })

  it('[COMPONENTE] mostra carregando e erro com nova tentativa', async () => {
    const roteador = await criarRoteador()
    const carregando = mount(BlocoAlertasPagamentos, { props: { alertas: null, carregando: true }, global: { plugins: [roteador, PrimeVue] } })
    montado = mount(BlocoAlertasPagamentos, { props: { alertas: null, comErro: true }, global: { plugins: [roteador, PrimeVue] } })

    expect(carregando.findComponent({ name: 'EstadoCarregando' }).exists()).toBe(true)
    expect(montado.get('[role="alert"]').text()).toContain(TEXTOS_ALERTAS_PAGAMENTOS.erro)
    await montado.get('[data-teste="tentar-alertas"]').trigger('click')
    expect(montado.emitted('tentarNovamente')).toHaveLength(1)
    carregando.unmount()
  })
})

describe('LinhaFornecedorEvento com parcelas', () => {
  it('[COMPONENTE] resume parcelas pagas, próxima e vencidas', () => {
    montado = mount(LinhaFornecedorEvento, {
      props: {
        nomeEmpresa: 'Buffet São João',
        status: 'Contratado',
        valorContratado: 18500,
        parcelas: { quantidade: 5, pagas: 2, vencidas: 1, parcelado: 18500, pago: 7000, saldoAParcelar: 0, proximoVencimento: '2026-10-15', proximoValor: 3250 },
      },
    })

    expect(texto(montado.get('[data-teste="resumo-parcelas-vinculo"]').text())).toBe('2 de 5 pagas · próxima 15 out · R$ 3.250,00')
    expect(montado.get('[data-teste="parcelas-vencidas-vinculo"]').text()).toContain('1 vencida')
  })
})

describe('contraste do financeiro', () => {
  it('[UNITÁRIO] os pares novos do financeiro passam no WCAG AA', () => {
    const pares = PARES_CONTRASTE.filter((par) => par.descricao.startsWith('Financeiro'))

    expect(pares).toHaveLength(8)
    expect(pares.every(atendeContraste)).toBe(true)
  })
})
