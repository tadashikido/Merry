import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PrimeVue from 'primevue/config'

import BarraAcaoFixa from '@/componentes/base/BarraAcaoFixa.vue'
import CabecalhoConvite from '@/componentes/base/CabecalhoConvite.vue'
import EscolhaPresenca from '@/componentes/base/EscolhaPresenca.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import SeloConfirmacao from '@/componentes/base/SeloConfirmacao.vue'
import type { EscolhaPresencaRsvp } from '@/tipos/rsvp'
import { aplicarIndexacao, ID_META_ROBOTS, rotas } from '@/router'
import { createMemoryHistory, createRouter } from 'vue-router'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  document.getElementById(ID_META_ROBOTS)?.remove()
})

describe('CabecalhoConvite', () => {
  it('[COMPONENTE] mostra casal com “e” acessível, data por extenso, horário e locais', () => {
    wrapper = mount(CabecalhoConvite, {
      props: { primeiro: 'Ana', segundo: 'Bruno', data: '2027-05-22', horario: '16:30', localCerimonia: 'Igreja', localRecepcao: null },
      global,
    })

    expect(wrapper.findAll('.cabecalho-convite__nome').map((nome) => nome.text())).toEqual(['Ana', 'Bruno'])
    expect(wrapper.get('h1 .somente-leitor-tela').text()).toBe('e')
    expect(wrapper.get('.cabecalho-convite__e').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-teste="cabecalho-convite-data"]').text()).toContain('sábado, 22 de maio de 2027')
    expect(wrapper.text()).toContain('às 16h30')
    expect(wrapper.text()).toContain('Cerimônia')
    expect(wrapper.text()).toContain('Igreja')
    expect(wrapper.text()).not.toContain('Recepção')
  })

  it('[COMPONENTE] cartão do convite completo tem os anéis decorativos, a frase do convite e a data espaçada só para quem vê', () => {
    wrapper = mount(CabecalhoConvite, {
      props: { primeiro: 'Ana', segundo: 'João', data: '2026-12-12', horario: '16:30' },
      global,
    })

    expect(wrapper.get('.cabecalho-convite__aneis').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.cabecalho-convite__frase').text()).toBe('Com alegria, convidamos você para celebrar o nosso casamento')
    const numerica = wrapper.get('.cabecalho-convite__data-numerica')
    expect(numerica.text()).toBe('12 . 12 . 2026')
    expect(numerica.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-teste="cabecalho-convite-data"]').text()).toContain('sábado, 12 de dezembro de 2026')
  })

  it('[COMPONENTE] variante compacta dispensa anéis, frase e data espaçada', () => {
    wrapper = mount(CabecalhoConvite, {
      props: { primeiro: 'Ana', segundo: 'João', data: '2026-12-12', variante: 'compacto' },
      global,
    })

    expect(wrapper.find('.cabecalho-convite__aneis').exists()).toBe(false)
    expect(wrapper.find('.cabecalho-convite__frase').exists()).toBe(false)
    expect(wrapper.find('.cabecalho-convite__data-numerica').exists()).toBe(false)
  })

  it('[COMPONENTE] variante compacta omite locais', () => {
    wrapper = mount(CabecalhoConvite, {
      props: { primeiro: 'Ana', segundo: 'Bruno', data: '2027-05-22', localCerimonia: 'Igreja', variante: 'compacto' },
      global,
    })

    expect(wrapper.find('dl').exists()).toBe(false)
  })
})

describe('EscolhaPresenca', () => {
  function montar(inicial: EscolhaPresencaRsvp | null, props: Record<string, unknown> = {}) {
    const escolha = ref<EscolhaPresencaRsvp | null>(inicial)
    const Hospedeiro = defineComponent({
      setup() {
        return () =>
          h(EscolhaPresenca, {
            nome: 'Célia Souza',
            modelValue: escolha.value,
            'onUpdate:modelValue': (valor: EscolhaPresencaRsvp | null) => {
              escolha.value = valor
            },
            ...props,
          })
      },
    })
    wrapper = mount(Hospedeiro, { global, attachTo: document.body })
    return escolha
  }

  it('[COMPONENTE] é um grupo de rádio rotulado pela pessoa e atualiza o v-model', async () => {
    const escolha = montar(null)

    const grupo = wrapper!.get('[role="radiogroup"]')
    expect(grupo.attributes('aria-label')).toBe('Presença de Célia Souza')
    const radios = wrapper!.findAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
    expect(radios[0]!.attributes('name')).toBe(radios[1]!.attributes('name'))

    await radios[0]!.setValue(true)
    expect(escolha.value).toBe('Confirmado')
    expect(wrapper!.get('[data-teste="opcao-Confirmado"]').classes()).toContain('escolha-presenca__opcao--marcada')

    await radios[1]!.setValue(true)
    expect(escolha.value).toBe('Recusado')
  })

  it('[COMPONENTE] mostra erro ligado ao grupo e marcador opcional', () => {
    montar(null, { erro: 'Escolha vou ou não vou para esta pessoa.', marcador: 'criança', idGrupo: 'grupo-teste' })

    const grupo = wrapper!.get('#grupo-teste')
    expect(grupo.attributes('aria-invalid')).toBe('true')
    expect(grupo.attributes('aria-describedby')).toBe('grupo-teste-erro')
    expect(wrapper!.get('#grupo-teste-erro').text()).toBe('Escolha vou ou não vou para esta pessoa.')
    expect(wrapper!.text()).toContain('criança')
  })

  it('[COMPONENTE] desabilitado bloqueia as opções', () => {
    montar('Confirmado', { desabilitado: true })

    expect(wrapper!.findAll('input[type="radio"]').every((radio) => radio.attributes('disabled') !== undefined)).toBe(true)
  })

  it('[COMPONENTE] renderiza a área extra da pessoa pelo slot', () => {
    wrapper = mount(EscolhaPresenca, {
      props: { nome: 'Lia', modelValue: null },
      slots: { default: '<p data-teste="extra">Restrição</p>' },
      global,
    })

    expect(wrapper.find('[data-teste="extra"]').exists()).toBe(true)
  })
})

describe('BarraAcaoFixa e SeloConfirmacao', () => {
  it('[COMPONENTE] barra anuncia o status e exibe a ação', () => {
    wrapper = mount(BarraAcaoFixa, { slots: { status: '2 de 3 vão', default: '<button>Enviar resposta</button>' }, global })

    expect(wrapper.get('[aria-live="polite"]').text()).toBe('2 de 3 vão')
    expect(wrapper.get('button').text()).toBe('Enviar resposta')
  })

  it('[COMPONENTE] selo expõe foco no título', async () => {
    wrapper = mount(SeloConfirmacao, { props: { titulo: 'Resposta enviada', animado: true }, global, attachTo: document.body })

    ;(wrapper.vm as unknown as { focar: () => void }).focar()
    await flushPromises()

    expect(document.activeElement?.textContent?.trim()).toBe('Resposta enviada')
    expect(wrapper.classes()).toContain('selo-confirmacao--animado')
  })
})

describe('MenuAcoes', () => {
  it('[COMPONENTE] abre o menu e emite a chave selecionada', async () => {
    wrapper = mount(MenuAcoes, {
      props: {
        rotulo: 'Mais ações',
        itens: [
          { chave: 'copiarLink', rotulo: 'Copiar link' },
          { chave: 'revogar', rotulo: 'Desativar link', perigoso: true },
        ],
      },
      global,
      attachTo: document.body,
    })

    const botao = wrapper.get('[data-teste="menu-acoes"]')
    expect(botao.attributes('aria-haspopup')).toBe('menu')
    await botao.trigger('click')
    await flushPromises()

    const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((elemento) => elemento.textContent?.includes('Desativar link'))
    expect(item).toBeTruthy()
    const conteudo = item!.querySelector('a, div') ?? item!
    ;(conteudo as HTMLElement).click()
    await flushPromises()

    expect(wrapper.emitted('selecionar')?.[0]).toEqual(['revogar'])
  })
})

describe('rota pública de RSVP', () => {
  it('[SEGURANÇA] rota é pública e marcada para não indexar', () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    const rota = roteador.resolve('/rsvp/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde')

    expect(rota.name).toBe('rsvp')
    expect(rota.meta.semIndexacao).toBe(true)
    expect(rota.meta.requerAutenticacao).toBeUndefined()
  })

  it('[SEGURANÇA] aplica e remove meta robots noindex', () => {
    aplicarIndexacao(true)
    aplicarIndexacao(true)

    const metas = document.head.querySelectorAll(`#${ID_META_ROBOTS}`)
    expect(metas).toHaveLength(1)
    expect(metas[0]!.getAttribute('content')).toBe('noindex, nofollow')

    aplicarIndexacao(false)
    expect(document.getElementById(ID_META_ROBOTS)).toBeNull()
  })
})
