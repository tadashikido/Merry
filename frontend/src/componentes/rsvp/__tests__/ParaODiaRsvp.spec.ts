import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import ParaODiaRsvp from '@/componentes/rsvp/ParaODiaRsvp.vue'
import type { TipoEvento } from '@/tipos/eventos'
import type { EventoRsvpDto } from '@/tipos/rsvp'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function evento(extra: Partial<EventoRsvpDto> = {}): EventoRsvpDto {
  return {
    tipo: 'Casamento',
    nomePrimeiraPessoa: 'Ana Beatriz',
    nomeSegundaPessoa: 'Bruno',
    data: '2027-05-22',
    horario: '16:30',
    localCerimonia: 'Capela do Carmo',
    localRecepcao: 'Villa Giardino',
    ...extra,
  }
}

function montar(props: { evento?: EventoRsvpDto; mostrarPrazo?: boolean; podeResponder?: boolean; hoje?: string } = {}) {
  wrapper = mount(ParaODiaRsvp, {
    props: {
      evento: props.evento ?? evento(),
      dataLimiteResposta: '2027-05-12',
      mostrarPrazo: props.mostrarPrazo ?? true,
      podeResponder: props.podeResponder ?? true,
      hoje: props.hoje ?? '2027-05-02',
    },
  })
  return wrapper
}

describe('ParaODiaRsvp', () => {
  it.each([
    ['Casamento', 'Para o dia do casamento', 'Faltam 20 dias para o casamento.', ['Cerimônia', 'Recepção'], /comemora|festa/i],
    ['QuinzeAnos', 'Para o dia da festa de 15 anos', 'Faltam 20 dias para a festa de 15 anos.', ['Festa', 'Outro local'], /casamento|cerimônia/i],
    ['Aniversario', 'Para o dia do aniversário', 'Faltam 20 dias para o aniversário.', ['Festa', 'Outro local'], /casamento|cerimônia/i],
    ['Comemoracao', 'Para o dia da comemoração', 'Faltam 20 dias para a comemoração.', ['Local', 'Outro local'], /casamento|cerimônia/i],
  ] as const)('[COMPONENTE] %s: título, contagem e locais pelo vocabulário', (tipo, titulo, contagem, rotulos, proibido) => {
    montar({ evento: evento({ tipo }) })

    const secao = wrapper!.get('section[data-teste="rsvp-para-o-dia"]')
    const h2 = secao.get('h2')
    expect(secao.attributes('aria-labelledby')).toBe(h2.attributes('id'))
    expect(h2.text()).toBe(titulo)
    expect(wrapper!.get('[data-teste="rsvp-contagem"]').text()).toBe(contagem)
    expect(wrapper!.findAll('.para-o-dia__rotulo').map((rotulo) => rotulo.text())).toEqual([...rotulos])
    expect(secao.text()).not.toMatch(proibido)
  })

  it('[COMPONENTE] tipo desconhecido fala do evento, nunca de casamento ou comemoração', () => {
    montar({ evento: evento({ tipo: 'Formatura' as unknown as TipoEvento, localRecepcao: null }) })

    const texto = wrapper!.text()
    expect(wrapper!.get('h2').text()).toBe('Para o dia do evento')
    expect(wrapper!.get('[data-teste="rsvp-contagem"]').text()).toBe('Faltam 20 dias para o evento.')
    expect(wrapper!.get('.para-o-dia__rotulo').text()).toBe('Local')
    expect(texto).not.toMatch(/casamento|cerimônia|comemoração/i)
  })

  it('[COMPONENTE] contagem no singular, no dia e oculta depois do evento', () => {
    montar({ hoje: '2027-05-21' })
    expect(wrapper!.get('[data-teste="rsvp-contagem"]').text()).toBe('Falta 1 dia para o casamento.')
    wrapper!.unmount()

    montar({ hoje: '2027-05-22' })
    expect(wrapper!.get('[data-teste="rsvp-contagem"]').text()).toBe('É hoje.')
    wrapper!.unmount()

    montar({ hoje: '2027-05-23' })
    expect(wrapper!.find('[data-teste="rsvp-contagem"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] links de mapa com host fixo, local codificado, nova aba sem referer e nome acessível', () => {
    montar({ evento: evento({ localCerimonia: 'Rua A, 10 & "B" <script>', localRecepcao: 'Villa Giardino' }) })

    const links = wrapper!.findAll('[data-teste="rsvp-abrir-mapa"]')
    expect(links).toHaveLength(2)
    const primeiro = links[0]!
    expect(primeiro.attributes('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua A, 10 & "B" <script>')}`,
    )
    expect(primeiro.attributes('target')).toBe('_blank')
    expect(primeiro.attributes('rel')).toBe('noopener noreferrer')
    expect(primeiro.attributes('aria-label')).toBe('Abrir no mapa: Rua A, 10 & "B" <script>, em nova aba')
    expect(primeiro.text()).toBe('Abrir no mapa')
    expect(primeiro.attributes('aria-label')!.startsWith(primeiro.text())).toBe(true)
    expect(wrapper!.find('script').exists()).toBe(false)
  })

  it('[COMPONENTE] sem locais omite "Como chegar"; secundário igual ao principal aparece uma vez', () => {
    montar({ evento: evento({ localCerimonia: null, localRecepcao: null }) })
    expect(wrapper!.text()).not.toContain('Como chegar')
    wrapper!.unmount()

    montar({ evento: evento({ localCerimonia: 'Villa Giardino', localRecepcao: 'villa giardino' }) })
    expect(wrapper!.findAll('[data-teste="rsvp-local"]')).toHaveLength(1)
  })

  it('[COMPONENTE] notas: prazo só no formulário e link pessoal só com prazo aberto', () => {
    montar({ mostrarPrazo: true, podeResponder: true })
    expect(wrapper!.get('[data-teste="rsvp-nota-prazo"]').text()).toBe(
      'Depois de enviar, dá para mudar a resposta até 12 de maio por este mesmo link.',
    )
    expect(wrapper!.find('[data-teste="rsvp-nota-link"]').exists()).toBe(true)
    wrapper!.unmount()

    montar({ mostrarPrazo: false, podeResponder: true })
    expect(wrapper!.find('[data-teste="rsvp-nota-prazo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="rsvp-nota-link"]').exists()).toBe(true)
    wrapper!.unmount()

    montar({ mostrarPrazo: false, podeResponder: false })
    expect(wrapper!.find('.para-o-dia__notas').exists()).toBe(false)
  })

  it('[LGPD] o bloco recebe só dados do evento e do prazo', () => {
    montar()
    expect(Object.keys(wrapper!.props()).sort()).toEqual(['dataLimiteResposta', 'evento', 'hoje', 'mostrarPrazo', 'podeResponder'])
  })
})
