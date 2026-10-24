import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

import { itemModeloCronograma } from '@/__tests__/auxiliaresModelosCronograma'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import SecaoRecolhivel from '@/componentes/base/SecaoRecolhivel.vue'
import CoberturaCategoriasFornecedores from '@/componentes/fornecedores/CoberturaCategoriasFornecedores.vue'
import ComoAplicarModelo from '@/componentes/modelos/ComoAplicarModelo.vue'
import ExemplosItemModelo from '@/componentes/modelos/ExemplosItemModelo.vue'
import OrientacaoFormularioModelo from '@/componentes/modelos/OrientacaoFormularioModelo.vue'
import PosicaoItemModelo from '@/componentes/modelos/PosicaoItemModelo.vue'
import PosicaoItemModeloCronograma from '@/componentes/modelos/PosicaoItemModeloCronograma.vue'
import { TEXTOS_COBERTURA_FORNECEDORES } from '@/textos/fornecedores'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import { coberturaDaCarteira } from '@/utilitarios/coberturaFornecedores'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

const PASSOS = ['Abra um evento.', 'Aplique o modelo.']
const ITENS_CHECKLIST: ItemModeloChecklistDto[] = [
  { id: 'a', titulo: 'Definir orçamento', descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento: 400 },
  { id: 'b', titulo: 'Contratar o buffet', descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento: 200 },
]
const ITENS_CRONOGRAMA = [
  itemModeloCronograma({ id: 'a', minutosDesdeCerimonia: -60, inicio: '15:00', duracaoMinutos: null, termino: null, atividade: 'Fotos' }),
]

describe('SecaoRecolhivel', () => {
  it('[COMPONENTE] recolhível usa details e summary nativos, fechado por padrão, com o título no resumo', async () => {
    const wrapper = mount(SecaoRecolhivel, {
      slots: { titulo: () => h('h2', { id: 'titulo-x' }, 'Exemplos'), default: () => h('p', 'Conteúdo secundário') },
    })

    const detalhes = wrapper.get('details.recolhivel')
    expect(detalhes.attributes('open')).toBeUndefined()
    expect(detalhes.get('summary.recolhivel__resumo h2').text()).toBe('Exemplos')
    expect(detalhes.get('.recolhivel__corpo').text()).toBe('Conteúdo secundário')
    detalhes.element.setAttribute('open', '')
    expect((detalhes.element as HTMLDetailsElement).open).toBe(true)
  })

  it('[COMPONENTE] sem recolher devolve título e conteúdo sem invólucro', () => {
    const wrapper = mount(
      { render: () => h('section', [h(SecaoRecolhivel, { recolhivel: false }, { titulo: () => h('h2', 'Título'), default: () => h('p', 'Texto') })]) },
    )

    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.find('summary').exists()).toBe(false)
    expect(wrapper.get('section').element.children).toHaveLength(2)
  })
})

describe('seções secundárias recolhíveis nas laterais', () => {
  it('[COMPONENTE] OrientacaoFormularioModelo recolhe só "Para um bom modelo" e mantém "Onde o modelo aparece" aberto', () => {
    const wrapper = mount(OrientacaoFormularioModelo, {
      props: { recurso: 'checklist', rotuloSugerido: 'Sugerido', dicas: ['Dica'], recolhivel: true },
    })

    const bom = wrapper.get('[data-teste="bom-modelo"]')
    expect(bom.get('details summary h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.bomModeloTitulo)
    expect(bom.attributes('aria-labelledby')).toBe(bom.get('h2').attributes('id'))
    expect(bom.find('details [data-teste="exemplos-nome-modelo"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="onde-modelo"]').find('details').exists()).toBe(false)
  })

  it('[COMPONENTE] OrientacaoFormularioModelo sem a prop não cria details', () => {
    const wrapper = mount(OrientacaoFormularioModelo, { props: { recurso: 'checklist', rotuloSugerido: 'Sugerido', dicas: ['Dica'] } })

    expect(wrapper.find('details').exists()).toBe(false)
  })

  it('[COMPONENTE] ComoAplicarModelo recolhível mantém a seção rotulada e os passos dentro do details', () => {
    const wrapper = mount(ComoAplicarModelo, { props: { titulo: 'Depois de criar', passos: PASSOS, recolhivel: true } })

    const secao = wrapper.get('section[data-teste="como-aplicar-modelo"]')
    expect(secao.attributes('aria-labelledby')).toBe(secao.get('summary h2').attributes('id'))
    expect(secao.findAll('details [data-teste="passo-aplicar-modelo"]')).toHaveLength(2)
    expect(mount(ComoAplicarModelo, { props: { titulo: 'Depois de criar', passos: PASSOS } }).find('details').exists()).toBe(false)
  })

  it('[COMPONENTE] ExemplosItemModelo recolhível guarda os exemplos no details', () => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo: 'QuinzeAnos', recolhivel: true } })

    expect(wrapper.get('summary h2').text()).not.toBe('')
    expect(wrapper.findAll('details [data-teste="exemplo-item"]').length).toBeGreaterThan(0)
    expect(mount(ExemplosItemModelo, { props: { tipo: 'QuinzeAnos' } }).find('details').exists()).toBe(false)
  })
})

describe('prévia do item quando a dica do campo já mostra', () => {
  it('[COMPONENTE] PosicaoItemModelo com previa-no-campo marca a prévia para sumir ao lado e mantém a região viva', () => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS_CHECKLIST, dias: 180, tipo: 'Casamento', previaNoCampo: true } })

    const previa = wrapper.get('[data-teste="previa-prazo-item"]')
    expect(previa.classes()).toContain('com-lateral__so-leitor-ao-lado')
    expect(previa.attributes('aria-live')).toBe('polite')
    expect(previa.text()).toBe('Cerca de 6 meses antes do casamento')
  })

  it('[COMPONENTE] PosicaoItemModelo sem a prop mantém a prévia sempre visível', () => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS_CHECKLIST, dias: 180, tipo: 'Casamento' } })

    expect(wrapper.get('[data-teste="previa-prazo-item"]').classes()).not.toContain('com-lateral__so-leitor-ao-lado')
  })

  it('[COMPONENTE] PosicaoItemModeloCronograma com previa-no-campo marca a prévia do horário', () => {
    const atual = { dia: 'DiaDoEvento' as const, minutos: -30, inicio: '15:30', termino: null, terminaEmOutroDia: false }
    const comPrevia = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS_CRONOGRAMA, atual, tipo: 'Casamento', previaNoCampo: true } })
    const semPrevia = mount(PosicaoItemModeloCronograma, { props: { itens: ITENS_CRONOGRAMA, atual, tipo: 'Casamento' } })

    expect(comPrevia.get('[data-teste="previa-horario-item"]').classes()).toContain('com-lateral__so-leitor-ao-lado')
    expect(semPrevia.get('[data-teste="previa-horario-item"]').classes()).not.toContain('com-lateral__so-leitor-ao-lado')
  })
})

describe('CoberturaCategoriasFornecedores com limite', () => {
  function montar(limite: number | null) {
    const cobertura = coberturaDaCarteira([], [resumoEvento({ id: 'e1', tipo: 'Casamento', diasRestantes: 20 })])
    return { wrapper: mount(CoberturaCategoriasFornecedores, { props: { cobertura, limite } }), total: cobertura.faltando.length }
  }

  it('[COMPONENTE] mostra as primeiras categorias e expande o restante com aria-expanded', async () => {
    const { wrapper, total } = montar(3)
    expect(total).toBeGreaterThan(3)

    expect(wrapper.findAll('[data-teste^="cobertura-falta-"]')).toHaveLength(3)
    const alternar = wrapper.get('[data-teste="cobertura-alternar"]')
    expect(alternar.attributes('type')).toBe('button')
    expect(alternar.attributes('aria-expanded')).toBe('false')
    expect(alternar.attributes('aria-controls')).toBe(wrapper.get('ul.cobertura__lista').attributes('id'))
    expect(alternar.text()).toBe(TEXTOS_COBERTURA_FORNECEDORES.maisFaltas(total - 3))

    await alternar.trigger('click')
    expect(wrapper.findAll('[data-teste^="cobertura-falta-"]')).toHaveLength(total)
    expect(alternar.attributes('aria-expanded')).toBe('true')
    expect(alternar.text()).toBe(TEXTOS_COBERTURA_FORNECEDORES.menosFaltas)
  })

  it('[COMPONENTE] sem limite ou com limite maior que as faltas lista tudo sem botão', () => {
    for (const limite of [null, 50]) {
      const { wrapper, total } = montar(limite)
      expect(wrapper.findAll('[data-teste^="cobertura-falta-"]')).toHaveLength(total)
      expect(wrapper.find('[data-teste="cobertura-alternar"]').exists()).toBe(false)
    }
  })

  it('[UNITÁRIO] texto do botão concorda em número', () => {
    expect(TEXTOS_COBERTURA_FORNECEDORES.maisFaltas(1)).toBe('Ver mais 1 categoria')
    expect(TEXTOS_COBERTURA_FORNECEDORES.maisFaltas(4)).toBe('Ver mais 4 categorias')
  })
})

describe('CabecalhoPagina com destaque', () => {
  it('[COMPONENTE] destaque e ações ficam no mesmo grupo, depois dos textos', () => {
    const wrapper = mount(CabecalhoPagina, {
      props: { titulo: 'Ana & João' },
      slots: { destaque: () => h('span', '42 dias'), acoes: () => h('button', 'Editar') },
    })

    const grupo = wrapper.get('.cabecalho-pagina__linha > .cabecalho-pagina__complementos')
    expect(grupo.element.children[0]?.classList.contains('cabecalho-pagina__destaque')).toBe(true)
    expect(grupo.element.children[1]?.classList.contains('cabecalho-pagina__acoes')).toBe(true)
    expect(wrapper.get('.cabecalho-pagina__linha').element.firstElementChild?.classList.contains('cabecalho-pagina__textos')).toBe(true)
  })

  it('[COMPONENTE] sem destaque nem ações não cria o grupo', () => {
    const wrapper = mount(CabecalhoPagina, { props: { titulo: 'Tarefas' } })

    expect(wrapper.find('.cabecalho-pagina__complementos').exists()).toBe(false)
  })
})
