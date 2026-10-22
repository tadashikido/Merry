import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PrimeVue from 'primevue/config'

import AvisoPrivacidade from '@/componentes/base/AvisoPrivacidade.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import SeletorRestricaoAlimentar from '@/componentes/base/SeletorRestricaoAlimentar.vue'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type { RestricaoPessoaFormulario } from '@/tipos/dadosSensiveis'
import { restricaoVazia } from '@/utilitarios/dadosSensiveis'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

beforeEach(() => {
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
})

function montarSeletor(props: Record<string, unknown> = {}, inicial: RestricaoPessoaFormulario = restricaoVazia()) {
  const restricao = ref<RestricaoPessoaFormulario>(inicial)
  const Hospedeiro = defineComponent({
    setup() {
      return () =>
        h(SeletorRestricaoAlimentar, {
          nome: 'Lia Souza',
          idBase: 'teste',
          ...props,
          modelValue: restricao.value,
          'onUpdate:modelValue': (valor: RestricaoPessoaFormulario) => {
            restricao.value = valor
          },
        })
    },
  })
  wrapper = mount(Hospedeiro, { global, attachTo: document.body })
  return restricao
}

describe('SeletorRestricaoAlimentar', () => {
  it('[COMPONENTE] começa recolhido e abre com aria-expanded ligado ao bloco', async () => {
    montarSeletor()
    const abrir = wrapper!.get('[data-teste="restricao-abrir"]')

    expect(abrir.attributes('aria-expanded')).toBe('false')
    expect(wrapper!.find('[data-teste="restricao-bloco"]').exists()).toBe(false)

    await abrir.trigger('click')

    expect(abrir.attributes('aria-expanded')).toBe('true')
    expect(abrir.attributes('aria-controls')).toBe('teste-bloco')
    expect(wrapper!.find('#teste-bloco').exists()).toBe(true)
    expect(wrapper!.get('legend').text()).toContain('Restrições alimentares de Lia Souza')
  })

  it('[COMPONENTE] etiqueta alterna com aria-pressed e passa a informar', async () => {
    const restricao = montarSeletor()
    await wrapper!.get('[data-teste="restricao-abrir"]').trigger('click')

    await wrapper!.get('[data-teste="restricao-tipo-SemGluten"]').trigger('click')

    expect(restricao.value).toEqual({ situacao: 'informar', tipos: ['SemGluten'], outraRestricao: '', necessidadeEspecial: '' })
    expect(wrapper!.get('[data-teste="restricao-tipo-SemGluten"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper!.get('[data-teste="restricao-tipo-Vegana"]').attributes('aria-pressed')).toBe('false')

    await wrapper!.get('[data-teste="restricao-tipo-SemGluten"]').trigger('click')
    expect(restricao.value.tipos).toEqual([])
  })

  it('[COMPONENTE] campos de texto atualizam o modelo e mostram contador', async () => {
    const restricao = montarSeletor()
    await wrapper!.get('[data-teste="restricao-abrir"]').trigger('click')

    await wrapper!.get('[data-teste="restricao-outra"]').setValue('sem porco')
    await wrapper!.get('[data-teste="restricao-necessidade"]').setValue('rampa')

    expect(restricao.value.outraRestricao).toBe('sem porco')
    expect(restricao.value.necessidadeEspecial).toBe('rampa')
    expect(restricao.value.situacao).toBe('informar')
    expect(wrapper!.text()).toContain('9 de 80 caracteres')
    expect(wrapper!.get('[data-teste="restricao-outra"]').attributes('maxlength')).toBe('80')
  })

  it('[SEGURANÇA] com registro existente não mostra conteúdo e oferece informar de novo ou remover', async () => {
    const restricao = montarSeletor({ possuiRegistro: true })

    expect(wrapper!.get('[data-teste="restricao-registrada"]').text()).toContain(TEXTOS_DADOS_SENSIVEIS.registrada)
    expect(wrapper!.text()).toContain(TEXTOS_DADOS_SENSIVEIS.naoExibimos)
    expect(wrapper!.find('[data-teste="restricao-bloco"]').exists()).toBe(false)

    await wrapper!.get('[data-teste="restricao-remover"]').trigger('click')
    expect(restricao.value.situacao).toBe('remover')
    expect(wrapper!.get('[data-teste="restricao-sera-removida"]').text()).toContain(TEXTOS_DADOS_SENSIVEIS.seraRemovida)

    await wrapper!.get('[data-teste="restricao-desfazer"]').trigger('click')
    expect(restricao.value.situacao).toBe('manter')

    await wrapper!.get('[data-teste="restricao-informar-de-novo"]').trigger('click')
    await flushPromises()
    expect(restricao.value.situacao).toBe('informar')
    expect(wrapper!.find('[data-teste="restricao-bloco"]').exists()).toBe(true)
  })

  it('[COMPONENTE] variante painel já vem aberta e mostra erro acessível', () => {
    montarSeletor({ variante: 'painel', erro: 'Erro de teste' })

    expect(wrapper!.find('[data-teste="restricao-abrir"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="restricao-bloco"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="restricao-erro"]').text()).toBe('Erro de teste')
    expect(wrapper!.get('fieldset').attributes('aria-describedby')).toBe('teste-erro')
  })

  it('[COMPONENTE] desabilitado bloqueia etiquetas', async () => {
    montarSeletor({ variante: 'painel', desabilitado: true })

    expect(wrapper!.get('[data-teste="restricao-tipo-Vegana"]').attributes('disabled')).toBeDefined()
  })
})

describe('AvisoPrivacidade', () => {
  it('[COMPONENTE] informa finalidade, quem vê e prazo em dias com título ligado', () => {
    wrapper = mount(AvisoPrivacidade, { props: { diasRetencao: 45 }, global, slots: { default: '<p data-teste="slot">extra</p>' } })

    const secao = wrapper.get('[data-teste="aviso-privacidade"]')
    expect(secao.text()).toContain(TEXTOS_DADOS_SENSIVEIS.avisoTitulo)
    expect(secao.text()).toContain('buffet')
    expect(secao.text()).toContain('45 dias depois do evento')
    expect(secao.attributes('aria-labelledby')).toBe(wrapper.get('h3').attributes('id'))
    expect(wrapper.find('[data-teste="slot"]').exists()).toBe(true)
  })
})

describe('ResumoCardapio', () => {
  it('[COMPONENTE] lista linhas rótulo e número em lista de definição', () => {
    wrapper = mount(ResumoCardapio, {
      props: {
        titulo: 'Para o buffet',
        linhas: [
          { chave: 'SemGluten', rotulo: 'Sem glúten', valor: 2 },
          { chave: 'Vegana', rotulo: 'Vegana', valor: 1000 },
        ],
      },
      slots: { rodape: 'rodapé' },
      global,
    })

    expect(wrapper.get('h2').text()).toBe('Para o buffet')
    expect(wrapper.get('[data-teste="cardapio-SemGluten"] dt').text()).toBe('Sem glúten')
    expect(wrapper.get('[data-teste="cardapio-SemGluten"] dd').text()).toBe('2')
    expect(wrapper.get('[data-teste="cardapio-Vegana"] dd').text()).toBe('1.000')
    expect(wrapper.text()).toContain('rodapé')
  })

  it('[COMPONENTE] sem linhas mostra o texto de vazio', () => {
    wrapper = mount(ResumoCardapio, { props: { titulo: 'Para o buffet', linhas: [], vazio: 'Nada ainda' }, global })

    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nada ainda')
  })
})
