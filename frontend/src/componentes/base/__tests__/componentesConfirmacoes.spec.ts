import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import PrimeVue from 'primevue/config'

import BarraProgressoEnvio from '@/componentes/base/BarraProgressoEnvio.vue'
import IndicadorPrazo from '@/componentes/base/IndicadorPrazo.vue'
import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import { segmentosEnvio } from '@/utilitarios/painelConfirmacoes'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('BarraProgressoEnvio', () => {
  it('[COMPONENTE] desenha segmentos proporcionais, legenda com números e rótulo acessível', () => {
    wrapper = mount(BarraProgressoEnvio, {
      global,
      props: {
        titulo: 'Caminho dos convites',
        segmentos: segmentosEnvio({ total: 20, naoEnviados: 5, enviados: 0, visualizados: 15, respondidos: 10, aguardandoResposta: 10 }),
        rotuloAcessivel: '20 convites: 5 não enviados, 0 enviados, 15 visualizados',
      },
      slots: { rodape: () => '10 respondidos' },
    })

    const trilho = wrapper.get('[data-teste="barra-progresso-trilho"]')
    expect(trilho.attributes('role')).toBe('img')
    expect(trilho.attributes('aria-label')).toBe('20 convites: 5 não enviados, 0 enviados, 15 visualizados')
    expect(wrapper.get('[data-teste="segmento-naoEnviados"]').attributes('style')).toContain('flex-grow: 5')
    expect(wrapper.get('[data-teste="segmento-visualizados"]').attributes('style')).toContain('flex-grow: 15')
    expect(wrapper.find('[data-teste="segmento-enviados"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="legenda-enviados"]').text()).toContain('0')
    expect(wrapper.get('[data-teste="legenda-visualizados"] dd').text()).toBe('15')
    expect(wrapper.get('h2').text()).toContain('(20)')
    expect(wrapper.text()).toContain('10 respondidos')
  })

  it('[COMPONENTE] sem convites mostra trilho vazio com texto acessível de vazio', () => {
    wrapper = mount(BarraProgressoEnvio, {
      global,
      props: {
        titulo: 'Caminho dos convites',
        segmentos: segmentosEnvio({ total: 0, naoEnviados: 0, enviados: 0, visualizados: 0, respondidos: 0, aguardandoResposta: 0 }),
        rotuloAcessivel: 'x',
        vazio: 'Nenhum convite para mostrar.',
      },
    })

    const trilho = wrapper.get('[data-teste="barra-progresso-trilho"]')
    expect(trilho.classes()).toContain('barra-progresso__trilho--vazio')
    expect(trilho.attributes('aria-label')).toBe('Nenhum convite para mostrar.')
    expect(wrapper.findAll('.barra-progresso__segmento')).toHaveLength(0)
  })
})

describe('BarraProgressoEnvio — proporções extremas', () => {
  it('[COMPONENTE] segmentos pequenos não empurram os demais para fora do trilho', () => {
    wrapper = mount(BarraProgressoEnvio, {
      global,
      props: {
        titulo: 'Caminho',
        segmentos: segmentosEnvio({ total: 200, naoEnviados: 1, enviados: 1, visualizados: 198, respondidos: 0, aguardandoResposta: 0 }),
        rotuloAcessivel: 'x',
      },
    })

    const segmentos = wrapper.findAll('.barra-progresso__segmento')
    expect(segmentos).toHaveLength(3)
    expect(segmentos.every((segmento) => !(segmento.attributes('style') ?? '').includes('width'))).toBe(true)
    expect(segmentos[2]!.attributes('style')).toContain('flex-grow: 198')
  })
})

describe('IndicadorPrazo', () => {
  it('[COMPONENTE] prazo aberto mostra data e dias restantes', () => {
    wrapper = mount(IndicadorPrazo, { global, props: { dataLimite: '2027-05-12', diasRestantes: 12, aceitaRespostas: true } })

    expect(wrapper.text()).toContain('Respostas até 12 de maio')
    expect(wrapper.get('[data-teste="indicador-prazo-complemento"]').text()).toBe('faltam 12 dias')
    expect(wrapper.classes()).toContain('indicador-prazo--normal')
    expect(wrapper.attributes('aria-label')).toBe('Respostas até 12 de maio, faltam 12 dias')
  })

  it('[COMPONENTE] a partir de 3 dias entra em alerta; zero é último dia; 1 dia no singular', () => {
    wrapper = mount(IndicadorPrazo, { global, props: { dataLimite: '2027-05-12', diasRestantes: 1, aceitaRespostas: true } })
    expect(wrapper.classes()).toContain('indicador-prazo--alerta')
    expect(wrapper.text()).toContain('falta 1 dia')
    wrapper.unmount()

    wrapper = mount(IndicadorPrazo, { global, props: { dataLimite: '2027-05-12', diasRestantes: 0, aceitaRespostas: true } })
    expect(wrapper.text()).toContain('último dia')
  })

  it('[COMPONENTE] encerrado mostra a data de encerramento sem contagem e aceita ação', () => {
    wrapper = mount(IndicadorPrazo, {
      global,
      props: { dataLimite: '2027-05-12', diasRestantes: -2, aceitaRespostas: false },
      slots: { acao: () => h('button', 'Alterar prazo') },
    })

    expect(wrapper.classes()).toContain('indicador-prazo--encerrado')
    expect(wrapper.text()).toContain('Prazo encerrado em 12 de maio')
    expect(wrapper.find('[data-teste="indicador-prazo-complemento"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Alterar prazo')
  })
})

describe('LayoutImpressao', () => {
  it('[COMPONENTE] separa ações da folha e usa main fora da demonstração', () => {
    wrapper = mount(LayoutImpressao, {
      global,
      props: { rotuloAcoes: 'Ações da ficha' },
      slots: { acoes: () => h('button', 'Imprimir'), default: () => h('p', 'Conteúdo da ficha') },
    })

    expect(wrapper.get('[data-teste="acoes-impressao"]').attributes('aria-label')).toBe('Ações da ficha')
    expect(wrapper.get('main#conteudo-principal').text()).toBe('Conteúdo da ficha')
  })

  it('[COMPONENTE] demonstração não cria main nem id duplicado', () => {
    wrapper = mount(LayoutImpressao, { global, props: { rotuloAcoes: 'Ações', demonstracao: true }, slots: { default: () => 'x' } })

    expect(wrapper.find('main').exists()).toBe(false)
    expect(wrapper.find('#conteudo-principal').exists()).toBe(false)
    expect(wrapper.find('[data-teste="acoes-impressao"]').exists()).toBe(false)
  })
})
