import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { itemModeloCronograma } from '@/__tests__/auxiliaresModelosCronograma'
import ExemplosItemModelo from '@/componentes/modelos/ExemplosItemModelo.vue'
import PosicaoItemModeloCronograma from '@/componentes/modelos/PosicaoItemModeloCronograma.vue'
import { TEXTOS_ITEM_MODELO } from '@/textos/checklist'
import { TEXTOS_ITEM_MODELO_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { TipoEvento } from '@/tipos/eventos'
import type { ItemNaPosicao } from '@/utilitarios/modelosCronograma'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

const ITENS = [
  itemModeloCronograma({ id: 'v', minutosDesdeCerimonia: -1260, dia: 'Vespera', inicio: '19:00', duracaoMinutos: 60, termino: '20:00', atividade: 'Ensaio' }),
  itemModeloCronograma({ id: 'a', minutosDesdeCerimonia: -360, inicio: '10:00', duracaoMinutos: 120, termino: '12:00', atividade: 'Produção' }),
  itemModeloCronograma({ id: 'b', minutosDesdeCerimonia: -240, inicio: '12:00', duracaoMinutos: null, termino: null, atividade: 'Montagem' }),
  itemModeloCronograma({ id: 'c', minutosDesdeCerimonia: -60, inicio: '15:00', duracaoMinutos: null, termino: null, atividade: 'Fotos' }),
  itemModeloCronograma({ id: 'd', minutosDesdeCerimonia: 0, inicio: '16:00', duracaoMinutos: 60, termino: '17:00', atividade: 'Momento principal' }),
  itemModeloCronograma({ id: 'e', minutosDesdeCerimonia: 120, inicio: '18:00', duracaoMinutos: null, termino: null, atividade: 'Jantar' }),
  itemModeloCronograma({ id: 'f', minutosDesdeCerimonia: 300, inicio: '21:00', duracaoMinutos: null, termino: null, atividade: 'Pista' }),
]

function atual(inicio: string, minutos: number, extra: Partial<ItemNaPosicao> = {}): ItemNaPosicao {
  return { dia: 'DiaDoEvento', minutos, inicio, termino: null, terminaEmOutroDia: false, ...extra }
}

describe('PosicaoItemModeloCronograma', () => {
  it.each([
    ['Casamento', '30 min antes da cerimônia', '15:00, 1 h antes da cerimônia'],
    ['QuinzeAnos', '30 min antes da festa', '15:00, 1 h antes da festa'],
    ['Aniversario', '30 min antes da festa', '15:00, 1 h antes da festa'],
    ['Comemoracao', '30 min antes do evento', '15:00, 1 h antes do evento'],
  ] as const)('[COMPONENTE] %s traduz a prévia e os vizinhos para o momento principal', (tipo, previa, vizinho) => {
    const wrapper = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS, atual: atual('15:30', -30), tipo, atividade: 'Chegada' } })

    expect(wrapper.get('[data-teste="previa-horario-item"]').text()).toBe(previa)
    const dia = wrapper.get('[data-teste="dia-item-DiaDoEvento"]')
    expect(dia.classes()).toContain('posicao-cronograma__dia--atual')
    expect(dia.text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItemEntraAqui)
    expect(dia.text()).toContain(vizinho)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[COMPONENTE] tipo %s fala do evento, nunca de casamento, comemoração ou cerimônia', (_, tipo) => {
    const wrapper = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS, atual: atual('16:00', 0), tipo } })

    expect(wrapper.get('[data-teste="previa-horario-item"]').text()).toBe('Hora do evento')
    expect(wrapper.text()).not.toMatch(/casamento|comemoração|cerimônia/i)
  })

  it('[COMPONENTE] lista até 4 vizinhos por horário com o item na posição real e o restante do dia', () => {
    const wrapper = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS, atual: atual('15:30', -30), tipo: 'QuinzeAnos', atividade: 'Chegada' } })

    const linhas = wrapper.findAll('[data-teste="itens-dia-atual"] > li[data-teste$="-item"]')
    expect(linhas.map((linha) => linha.find('.posicao-cronograma__item-atividade').text())).toEqual([
      'Montagem',
      'Fotos',
      'Chegada (este item)',
      'Momento principal',
      'Jantar',
    ])
    expect(wrapper.get('[data-teste="mais-no-dia"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.maisNoDia(2))
    expect(wrapper.get('[data-teste="dia-item-DiaDoEvento"] [data-teste="contagem-dia-item"]').text()).toBe('7 itens, das 10:00 às 21:00')
    expect(wrapper.get('[data-teste="dia-item-Vespera"]').classes()).not.toContain('posicao-cronograma__dia--atual')
  })

  it('[COMPONENTE] item em edição não aparece como vizinho e sem atividade usa "Este item"', () => {
    const wrapper = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS, atual: atual('12:00', -240), itemId: 'b', tipo: 'Casamento' } })

    expect(wrapper.findAll('[data-teste="vizinho-item"]').map((linha) => linha.text())).not.toContain(expect.stringContaining('Montagem'))
    expect(wrapper.get('[data-teste="este-item"]').text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItem)
    expect(wrapper.get('[data-teste="este-item"]').text()).not.toContain('(este item)')
    expect(wrapper.get('[data-teste="dia-item-DiaDoEvento"] [data-teste="contagem-dia-item"]').text()).toContain('6 itens')
  })

  it('[COMPONENTE] notas de primeiro item, novo começo, novo fim e dia sem outros itens', () => {
    const primeiro = mount(PosicaoItemModeloCronograma, { props: { itens: [], atual: atual('16:00', 0), tipo: 'Casamento' } })
    expect(primeiro.get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.primeiroItem)
    expect(primeiro.find('[data-teste="sozinho-no-dia"]').exists()).toBe(false)

    const fim = mount(PosicaoItemModeloCronograma, {
      props: { itens: ITENS, atual: atual('02:00', 600, { dia: 'DiaSeguinte' }), tipo: 'Casamento' },
    })
    expect(fim.get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.ampliaFim)
    expect(fim.get('[data-teste="sozinho-no-dia"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.sozinhoNoDia)

    const comeco = mount(PosicaoItemModeloCronograma, {
      props: { itens: ITENS, atual: atual('08:00', -1920, { dia: 'Vespera' }), tipo: 'Casamento' },
    })
    expect(comeco.get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.ampliaComeco)
  })

  it('[COMPONENTE] sem início mostra o convite e nenhum dia atual', () => {
    const wrapper = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS, atual: null, tipo: 'Casamento' } })

    expect(wrapper.get('[data-teste="previa-horario-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoSemInicio)
    expect(wrapper.get('[data-teste="previa-horario-item"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.find('.posicao-cronograma__dia--atual').exists()).toBe(false)
    expect(wrapper.find('[data-teste="itens-dia-atual"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo usa @container e tokens de ritmo, sem @media nem sticky', () => {
    const fonte = readFileSync(resolve(__dirname, '../PosicaoItemModeloCronograma.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: posicao-cronograma / inline-size')
    expect(estilo).toContain('@container posicao-cronograma (min-width: 22rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).not.toContain('v-html')
  })
})

describe('ExemplosItemModelo no cronograma', () => {
  it.each([
    ['Casamento', 'de um casamento', ['Making of dos noivos', '4 h antes da cerimônia']],
    ['QuinzeAnos', 'de uma festa de 15 anos', ['Valsa com a corte', '1 h depois da festa']],
    ['Aniversario', 'de um aniversário', ['Abertura da festa', 'Hora da festa']],
    ['Comemoracao', 'de uma comemoração', ['Brinde de homenagem', '1 h depois do evento']],
  ] as const)('[COMPONENTE] %s mostra 3 exemplos do roteiro do tipo com a distância ao momento', (tipo, apoio, trecho) => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo, recurso: 'cronograma' } })

    expect(wrapper.get('h2').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.exemplosTitulo)
    expect(wrapper.get('[data-teste="apoio-exemplos-item"]').text()).toContain(`roteiro ${apoio}`)
    expect(wrapper.findAll('[data-teste="exemplo-item"]')).toHaveLength(3)
    for (const parte of trecho) {
      expect(wrapper.text()).toContain(parte)
    }
    expect(wrapper.find('[data-teste="tipo-exemplo-item"]').exists()).toBe(false)
    expect(wrapper.find('a, button').exists()).toBe(false)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[COMPONENTE] tipo %s mostra um exemplo por tipo, rotulado e com o momento daquele tipo', (_, tipo) => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo, recurso: 'cronograma' } })

    expect(wrapper.get('[data-teste="apoio-exemplos-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.exemplosApoioQualquer)
    expect(wrapper.findAll('[data-teste="tipo-exemplo-item"]').map((rotulo) => rotulo.text())).toEqual(['Casamento', '15 anos', 'Aniversário', 'Comemoração'])
    const linhas = wrapper.findAll('[data-teste="exemplo-item"]').map((linha) => linha.text())
    expect(linhas[0]).toContain('da cerimônia')
    expect(linhas[1]).toContain('da festa')
    expect(linhas[3]).toContain('do evento')
  })

  it('[COMPONENTE] sem recurso continua mostrando os exemplos do checklist', () => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo: 'Casamento' } })

    expect(wrapper.get('[data-teste="apoio-exemplos-item"]').text()).toBe(TEXTOS_ITEM_MODELO.exemplosApoioTipo('um casamento'))
    expect(wrapper.text()).toContain('Reservar o local da cerimônia')
  })
})
