import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import GruposImportacao from '@/componentes/convidados/GruposImportacao.vue'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { ConvitePreVisualizadoDto } from '@/tipos/importacaoConvidados'
import type { GrupoExistente } from '@/utilitarios/gruposConvite'

function convite(grupo: string | null, pessoas = 1, valido = true): ConvitePreVisualizadoDto {
  return {
    nome: `Convite ${grupo ?? 'sem'}`,
    grupo,
    limiteAcompanhantes: 0,
    valido,
    pessoas: Array.from({ length: pessoas }, (_, indice) => ({
      linha: indice + 2,
      nome: `Pessoa ${indice}`,
      faixaEtaria: 'Adulto' as const,
      resposta: 'Pendente' as const,
      situacao: 'Valida' as const,
    })),
  }
}

const EXISTENTES = new Map<string, GrupoExistente>([['familia', { rotulo: 'Família', quantidade: 2 }]])

function montar(props: {
  convites: ConvitePreVisualizadoDto[]
  existentes?: ReadonlyMap<string, GrupoExistente> | null
  carregandoExistentes?: boolean
  tipo?: TipoEvento | null
}) {
  return mount(GruposImportacao, { props })
}

describe('GruposImportacao', () => {
  it('[COMPONENTE] marca grupo novo e grupo existente em texto, com resumo', () => {
    const wrapper = montar({ convites: [convite('familia', 3), convite('Corte', 2)], existentes: EXISTENTES, tipo: 'QuinzeAnos' })

    const secao = wrapper.get('[data-teste="grupos-importacao"]')
    expect(secao.element.tagName).toBe('SECTION')
    expect(secao.attributes('aria-labelledby')).toBe(secao.get('h2').attributes('id'))
    expect(secao.get('h2').text()).toBe(TEXTOS_IMPORTACAO.gruposTitulo)
    expect(wrapper.get('[data-teste="grupos-importacao-frase"]').text()).toBe('1 grupo novo e 1 que já existe no evento.')

    const grupos = wrapper.findAll('[data-teste="grupo-importacao"]')
    expect(grupos[0]!.text()).toContain('Corte')
    expect(grupos[0]!.get('[data-teste="grupo-importacao-novo"]').text()).toBe('novo')
    expect(grupos[1]!.text()).toContain('Família')
    expect(grupos[1]!.text()).toContain('1 convite, 3 pessoas')
    expect(grupos[1]!.get('[data-teste="grupo-importacao-existente"]').text()).toBe('já tem 2 convites')
  })

  it('[COMPONENTE] sem a lista do evento mostra contagens sem marcador e explica', () => {
    const wrapper = montar({ convites: [convite('Corte')], existentes: null })

    expect(wrapper.find('[data-teste="grupo-importacao-novo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="grupo-importacao-existente"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="grupos-importacao-frase"]').text()).toBe(TEXTOS_IMPORTACAO.gruposSemComparacao)
  })

  it('[COMPONENTE] enquanto a lista carrega não afirma falha de comparação', () => {
    const wrapper = montar({ convites: [convite('Corte')], existentes: null, carregandoExistentes: true })

    expect(wrapper.find('[data-teste="grupos-importacao-frase"]').exists()).toBe(false)
  })

  it.each([
    ['QuinzeAnos', 'Grupos como Família, Corte, Amigos da escola e Amigos da família ajudam a filtrar e a enviar por partes.'],
    ['Aniversario', 'Grupos como Família, Amigos, Trabalho e Vizinhos ajudam a filtrar e a enviar por partes.'],
    [null, 'Grupos como Família, Amigos e Convidados de honra ajudam a filtrar e a enviar por partes.'],
  ] as [TipoEvento | null, string][])('[COMPONENTE] planilha sem grupos orienta com os grupos do tipo %s', (tipo, esperado) => {
    const wrapper = montar({ convites: [convite(null, 2)], existentes: EXISTENTES, tipo })

    expect(wrapper.get('[data-teste="grupo-importacao-sem-grupo"]').text()).toContain('1 convite, 2 pessoas')
    expect(wrapper.get('[data-teste="grupos-importacao-orientacao"]').text()).toBe(esperado)
    expect(wrapper.find('[data-teste="grupos-importacao-frase"]').exists()).toBe(false)
  })

  it('[COMPONENTE] mostra até 6 grupos e resume o restante', () => {
    const convites = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grupo) => convite(grupo))
    const wrapper = montar({ convites, existentes: new Map() })

    expect(wrapper.findAll('[data-teste="grupo-importacao"]')).toHaveLength(6)
    expect(wrapper.get('[data-teste="grupos-importacao-mais"]').text()).toBe('e mais 2 grupos')
    expect(wrapper.get('[data-teste="grupos-importacao-frase"]').text()).toBe('8 grupos novos no evento.')
  })

  it('[COMPONENTE] sem convites prontos não renderiza nada', () => {
    const wrapper = montar({ convites: [convite('Corte', 1, false)], existentes: EXISTENTES })

    expect(wrapper.find('[data-teste="grupos-importacao"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] nome de grupo vindo da planilha é exibido como texto', () => {
    const wrapper = montar({ convites: [convite('<img src=x onerror=alert(1)>')], existentes: null })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[data-teste="grupo-importacao"]').text()).toContain('<img src=x onerror=alert(1)>')
  })
})
