import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CalendarioPrazoTarefa from '@/componentes/tarefas/CalendarioPrazoTarefa.vue'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { eventoCompleto } from '@/views/eventos/__tests__/auxiliaresEventos'

const TITULOS: Record<TipoEvento, string> = {
  Casamento: 'Calendário do casamento',
  QuinzeAnos: 'Calendário da festa de 15 anos',
  Aniversario: 'Calendário do aniversário',
  Comemoracao: 'Calendário da comemoração',
}

const EVENTOS: Record<TipoEvento, string> = {
  Casamento: 'Dia do casamento',
  QuinzeAnos: 'Dia da festa de 15 anos',
  Aniversario: 'Dia do aniversário',
  Comemoracao: 'Dia da comemoração',
}

function montar(props: { tipo?: TipoEvento; prazo?: string; geradaDeModelo?: boolean; diasRestantes?: number } = {}) {
  return mount(CalendarioPrazoTarefa, {
    props: {
      evento: eventoCompleto({
        tipo: props.tipo ?? 'Casamento',
        data: '2027-03-20',
        diasRestantes: props.diasRestantes ?? 40,
        dataLimiteRsvpEfetiva: '2027-02-18',
      }),
      prazo: props.prazo ?? '',
      geradaDeModelo: props.geradaDeModelo ?? false,
    },
  })
}

describe('CalendarioPrazoTarefa', () => {
  it('[COMPONENTE] seção nomeada pelo h2 com título e marco do evento variando pelos 4 tipos', () => {
    for (const tipo of TIPOS_EVENTO) {
      const wrapper = montar({ tipo, prazo: '2027-03-01' })
      const secao = wrapper.get('section')
      const titulo = wrapper.get('h2')
      expect(secao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
      expect(titulo.text()).toBe(TITULOS[tipo])
      expect(wrapper.get('[data-teste="marco-evento"]').text()).toContain(EVENTOS[tipo])
      expect(wrapper.text()).not.toMatch(/casal/i)
      expect(/casamento/i.test(wrapper.text())).toBe(tipo === 'Casamento')
      wrapper.unmount()
    }
  })

  it('[COMPONENTE] linha do tempo ordenada com o prazo destacado e a distância de hoje', () => {
    const wrapper = montar({ prazo: '2027-03-01' })

    const itens = wrapper.findAll('ol > li')
    expect(itens.map((item) => item.attributes('data-teste'))).toEqual(['marco-hoje', 'marco-confirmacoes', 'marco-prazo', 'marco-evento'])
    const prazo = wrapper.get('[data-teste="marco-prazo"]')
    expect(prazo.classes()).toContain('calendario-prazo__marco--prazo')
    expect(prazo.text()).toContain(TEXTOS_TAREFAS.marcoPrazo)
    expect(prazo.text()).toContain('01 mar 2027')
    expect(prazo.text()).toContain('em 21 dias')
    expect(wrapper.get('[data-teste="marco-confirmacoes"]').text()).toContain('em 10 dias')
    expect(wrapper.get('[data-teste="marco-hoje"]').text()).toContain('08 fev 2027')
    expect(wrapper.get('[data-teste="calendario-falta"]').text()).toBe('Faltam 40 dias para o casamento.')
    expect(wrapper.find('[data-teste="calendario-sem-prazo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="prazo-passou"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem prazo mostra a nota que ensina e nenhum marco da tarefa', () => {
    const wrapper = montar({ tipo: 'Aniversario' })

    expect(wrapper.find('[data-teste="marco-prazo"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="calendario-sem-prazo"]').text()).toBe(TEXTOS_TAREFAS.calendarioSemPrazo('do aniversário'))
  })

  it('[COMPONENTE] prazo já passado ganha alerta textual', () => {
    const wrapper = montar({ prazo: '2027-02-01' })

    expect(wrapper.findAll('ol > li')[0]!.attributes('data-teste')).toBe('marco-prazo')
    expect(wrapper.get('[data-teste="marco-prazo"]').text()).toContain('há 7 dias')
    expect(wrapper.get('[data-teste="prazo-passou"]').text()).toBe(TEXTOS_TAREFAS.calendarioPrazoPassou)
  })

  it('[COMPONENTE] tarefa do checklist informa a origem', () => {
    expect(montar({ prazo: '2027-03-01', geradaDeModelo: true }).get('[data-teste="calendario-origem"]').text()).toBe(
      TEXTOS_TAREFAS.calendarioOrigemChecklist,
    )
    expect(montar({ prazo: '2027-03-01' }).find('[data-teste="calendario-origem"]').exists()).toBe(false)
  })

  it('[COMPONENTE] evento hoje e evento passado trocam a frase do topo', () => {
    expect(montar({ tipo: 'QuinzeAnos', diasRestantes: 0 }).get('[data-teste="calendario-falta"]').text()).toBe('A festa de 15 anos é hoje.')
    expect(montar({ tipo: 'Comemoracao', diasRestantes: -2 }).get('[data-teste="calendario-falta"]').text()).toBe('A comemoração já aconteceu.')
  })

  it('[ESTILO] marcadores decorativos ocultos do leitor de tela e colunas só por @container', () => {
    const wrapper = montar({ prazo: '2027-03-01' })
    for (const ponto of wrapper.findAll('.calendario-prazo__ponto')) {
      expect(ponto.attributes('aria-hidden')).toBe('true')
    }
    const fonte = readFileSync(resolve(__dirname, '../CalendarioPrazoTarefa.vue'), 'utf-8')
    expect(fonte).not.toMatch(/@media\s*\(\s*(min|max)-width/)
    expect(fonte).toMatch(/@container calendario-prazo/)
    expect(fonte).not.toMatch(/v-html/)
  })
})
