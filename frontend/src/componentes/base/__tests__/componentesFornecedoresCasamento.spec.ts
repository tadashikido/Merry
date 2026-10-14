import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'

import { arquivoPdf, florista, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresCasamento'
import AnexoContrato from '@/componentes/base/AnexoContrato.vue'
import LinhaFornecedorCasamento from '@/componentes/base/LinhaFornecedorCasamento.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import { PARES_CONTRASTE, atendeContraste } from '@/design/contraste'
import { TEXTOS_CONTRATO, TEXTOS_RESUMO_ORCAMENTO } from '@/textos/fornecedoresCasamento'
import { calcularResumoLocal } from '@/utilitarios/fornecedoresCasamento'

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
      { path: '/editar', name: 'editar', component: Vazia },
    ],
  })
  await roteador.push('/')
  await roteador.isReady()
  return roteador
}

function texto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim()
}

describe('ResumoOrcamento', () => {
  const resumo = calcularResumoLocal([
    vinculoExemplo({ status: 'Contratado', valorOrcado: 18000, valorContratado: 18500 }),
    florista({ valorOrcado: 15800 }),
    florista({ id: 'cancelado', status: 'Cancelado', valorOrcado: 4000, fornecedor: { ...florista().fornecedor, id: 'm', categoria: 'Musica', nomeEmpresa: 'Quarteto' } }),
  ])

  it('[COMPONENTE] mostra a frase editorial com contratado e orçado e o apoio com as quantidades', () => {
    montado = mount(ResumoOrcamento, { props: { resumo } })

    const frase = texto(montado.get('[data-teste="resumo-frase"]').text())
    expect(frase).toBe('R$ 18.500,00 contratados de R$ 33.800,00 orçados')
    expect(montado.get('[data-teste="resumo-apoio"]').text()).toBe('2 fornecedores · 1 contratado')
    expect(montado.get('h2').text()).toBe(TEXTOS_RESUMO_ORCAMENTO.titulo)
  })

  it('[COMPONENTE] uma linha por categoria não cancelada, régua proporcional e selo quando passa do orçado', () => {
    montado = mount(ResumoOrcamento, { props: { resumo } })

    expect(montado.find('[data-teste="resumo-categoria-Musica"]').exists()).toBe(false)
    const buffet = montado.get('[data-teste="resumo-categoria-Buffet"]')
    expect(buffet.get('th').text()).toBe('Buffet')
    expect(buffet.get('[data-teste="resumo-excedente"]').text()).toContain('R$ 500,00 acima do orçado')
    expect(buffet.get('.resumo-orcamento__preenchimento').attributes('style')).toContain('inline-size: 100%')
    const decoracao = montado.get('[data-teste="resumo-categoria-Decoracao"]')
    expect(decoracao.get('.resumo-orcamento__preenchimento').attributes('style')).toContain('inline-size: 0%')
    expect(decoracao.text()).toContain('R$ 15.800,00')
    expect(montado.find('[data-teste="resumo-excedente-total"]').exists()).toBe(false)
  })

  it('[COMPONENTE] acessível como tabela com legenda e cabeçalhos; régua escondida do leitor', () => {
    montado = mount(ResumoOrcamento, { props: { resumo } })

    expect(montado.get('caption').text()).toBe(TEXTOS_RESUMO_ORCAMENTO.legenda)
    expect(montado.findAll('th[scope="col"]')).toHaveLength(4)
    expect(montado.findAll('th[scope="row"]').map((cabecalho) => cabecalho.text())).toEqual(['Buffet', 'Decoração', 'Total'])
    expect(montado.findAll('.resumo-orcamento__regua').every((regua) => regua.attributes('aria-hidden') === 'true')).toBe(true)
  })

  it('[COMPONENTE] categoria sem valores mostra "Sem valores"', () => {
    montado = mount(ResumoOrcamento, {
      props: { resumo: calcularResumoLocal([vinculoExemplo({ valorOrcado: null })]) },
    })

    expect(montado.get('[data-teste="resumo-categoria-Buffet"]').text()).toContain(TEXTOS_RESUMO_ORCAMENTO.semValores)
  })

  it('[UNITÁRIO] pares de cor da régua e do total atendem WCAG AA', () => {
    const pares = PARES_CONTRASTE.filter((par) => par.descricao.startsWith('Orçamento:'))
    expect(pares).toHaveLength(3)
    expect(pares.every((par) => atendeContraste(par))).toBe(true)
  })
})

describe('LinhaFornecedorCasamento', () => {
  it('[COMPONENTE] mostra empresa com link, status, serviço, valores, contrato e canais', async () => {
    const roteador = await criarRoteador()
    montado = mount(LinhaFornecedorCasamento, {
      props: {
        nomeEmpresa: 'Buffet São João',
        status: 'Contratado',
        servico: 'Jantar para 200',
        valorOrcado: 18000,
        valorContratado: 18500,
        possuiContrato: true,
        destino: { name: 'editar' },
        telefone: '11987654321',
      },
      global: { plugins: [roteador] },
    })

    expect(montado.get('[data-teste="link-vinculo"]').attributes('href')).toBe('/editar')
    expect(montado.get('[data-teste="status-vinculo"]').text()).toContain('Contratado')
    expect(montado.get('[data-teste="servico-vinculo"]').text()).toBe('Jantar para 200')
    expect(texto(montado.get('[data-teste="orcado-vinculo"]').text())).toBe('R$ 18.000,00')
    expect(texto(montado.get('[data-teste="contratado-vinculo"]').text())).toBe('R$ 18.500,00')
    expect(montado.get('[data-teste="indicador-contrato"]').text()).toContain('Contrato')
    expect(montado.findAll('[data-teste="canal-contato"]').length).toBeGreaterThan(0)
  })

  it('[SEGURANÇA] sem destino (casal) o nome não é link; cancelado fica em tom de apoio; valores vazios viram travessão', async () => {
    const roteador = await criarRoteador()
    montado = mount(LinhaFornecedorCasamento, {
      props: { nomeEmpresa: 'Quarteto', status: 'Cancelado', valorOrcado: null, valorContratado: null },
      global: { plugins: [roteador] },
    })

    expect(montado.find('[data-teste="link-vinculo"]').exists()).toBe(false)
    expect(montado.classes()).toContain('linha-vinculo--cancelado')
    expect(montado.get('[data-teste="orcado-vinculo"]').text()).toBe('—')
    expect(montado.find('[data-teste="indicador-contrato"]').exists()).toBe(false)
  })
})

describe('AnexoContrato', () => {
  const contrato = { nomeArquivo: 'contrato-buffet.pdf', tamanhoBytes: 1_258_291, enviadoEm: '2026-09-28T13:00:00Z' }

  function montar(props: Record<string, unknown>) {
    montado = mount(AnexoContrato, {
      props: { nomeEmpresa: 'Buffet São João', ...props },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
      attachTo: document.body,
    })
    return montado
  }

  it('[COMPONENTE] sem contrato mostra a área de envio e emite o arquivo escolhido', async () => {
    const wrapper = montar({ contrato: null })

    expect(wrapper.text()).toContain('Arraste o contrato em PDF ou escolha o arquivo.')
    expect(wrapper.text()).toContain('PDF até 10 MB.')
    const entrada = wrapper.get('input[type="file"]')
    expect(entrada.attributes('accept')).toBe('.pdf,application/pdf')
    Object.defineProperty(entrada.element, 'files', { value: [arquivoPdf()] })
    await entrada.trigger('change')

    expect(wrapper.emitted('selecionar')?.[0]?.[0]).toBeInstanceOf(File)
  })

  it('[COMPONENTE] com contrato mostra nome, tamanho, data e as três ações; Substituir reabre o envio', async () => {
    const wrapper = montar({ contrato })

    expect(wrapper.get('[data-teste="contrato-nome"]').text()).toBe('contrato-buffet.pdf')
    expect(wrapper.text()).toContain('1,2 MB')
    expect(wrapper.text()).toContain('Enviado em 28/09/2026')
    expect(wrapper.get('[data-teste="baixar-contrato"]').attributes('aria-label')).toBe(TEXTOS_CONTRATO.baixarAria('Buffet São João', '1,2 MB'))

    await wrapper.get('[data-teste="baixar-contrato"]').trigger('click')
    await wrapper.get('[data-teste="remover-contrato"]').trigger('click')
    expect(wrapper.emitted('baixar')).toHaveLength(1)
    expect(wrapper.emitted('remover')).toHaveLength(1)

    await wrapper.get('[data-teste="substituir-contrato"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    await wrapper.get('[data-teste="cancelar-substituicao"]').trigger('click')
    expect(wrapper.find('[data-teste="contrato-anexado"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] somente leitura (casal) só oferece baixar', () => {
    const wrapper = montar({ contrato, editavel: false })

    expect(wrapper.find('[data-teste="baixar-contrato"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="substituir-contrato"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="remover-contrato"]').exists()).toBe(false)
  })

  it('[COMPONENTE] mostra o erro sob a área de envio e marca ocupado ao enviar', () => {
    const comErro = montar({ contrato: null, erro: TEXTOS_CONTRATO.erroFormato })
    expect(comErro.text()).toContain(TEXTOS_CONTRATO.erroFormato)
    comErro.unmount()

    const enviando = montar({ contrato: null, enviando: true })
    expect(enviando.get('[data-teste="anexo-contrato"]').attributes('aria-busy')).toBe('true')
  })
})
