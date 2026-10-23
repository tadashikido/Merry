import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import CoberturaCategoriasFornecedores from '@/componentes/fornecedores/CoberturaCategoriasFornecedores.vue'
import { TEXTOS_COBERTURA_FORNECEDORES } from '@/textos/fornecedores'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor, FornecedorResumoDto } from '@/tipos/fornecedores'
import { coberturaDaCarteira } from '@/utilitarios/coberturaFornecedores'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function fornecedor(categoria: CategoriaFornecedor, dados: Partial<FornecedorResumoDto> = {}) {
  return resumoFornecedor({ id: `${categoria}-${dados.arquivado ? 'a' : 'b'}`, categoria, ...dados })
}

function montar(fornecedores: FornecedorResumoDto[], tipos: TipoEvento[] | null, comReaproveitamento = false) {
  const eventos = tipos?.map((tipo, indice) => resumoEvento({ id: `e${indice}`, tipo, diasRestantes: 20 })) ?? null
  return mount(CoberturaCategoriasFornecedores, { props: { cobertura: coberturaDaCarteira(fornecedores, eventos), comReaproveitamento } })
}

function falta(wrapper: ReturnType<typeof montar>, categoria: CategoriaFornecedor) {
  return wrapper.find(`[data-teste="cobertura-falta-${categoria}"]`)
}

describe('CoberturaCategoriasFornecedores', () => {
  it.each([
    ['Casamento', '1 casamento'],
    ['QuinzeAnos', '1 festa de 15 anos'],
    ['Aniversario', '1 aniversário'],
    ['Comemoracao', '1 comemoração'],
  ] as const)('[COMPONENTE] carteira de %s descreve os eventos pela frente e as faltas do tipo', (tipo, descricao) => {
    const wrapper = montar([fornecedor('Buffet')], [tipo])
    const essenciais = VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais

    expect(wrapper.get('[data-teste="cobertura-frase"]').text()).toBe(`Para os eventos pela frente: ${descricao}.`)
    expect(wrapper.get('[data-teste="cobertura-contagem"]').text()).toBe(
      `1 de ${essenciais.length} categorias essenciais com fornecedor ativo`,
    )
    expect(wrapper.findAll('[data-teste^="cobertura-falta-"]')).toHaveLength(essenciais.length - 1)
    expect(falta(wrapper, 'Buffet').exists()).toBe(false)
    expect(falta(wrapper, 'EspacoLocal').get('[data-teste="cobertura-apoio"]').text()).toBe('Essencial para 1 evento pela frente')
    expect(falta(wrapper, 'IluminacaoSom').exists()).toBe(essenciais.includes('IluminacaoSom'))
    expect(wrapper.get('[data-teste="cobertura-fornecedores"]').attributes('data-carteira')).toBe('sim')
  })

  it.each([
    ['sem carteira', null],
    ['tipo desconhecido', [TIPO_DESCONHECIDO]],
  ] as const)('[COMPONENTE] %s usa a frase dos 4 tipos e o apoio por tipo', (_rotulo, tipos) => {
    const wrapper = montar([], tipos ? [...tipos] : null)

    expect(wrapper.get('[data-teste="cobertura-frase"]').text()).toBe(
      'O que costuma ser essencial em casamentos, festas de 15 anos, aniversários e comemorações.',
    )
    expect(falta(wrapper, 'EspacoLocal').get('[data-teste="cobertura-apoio"]').text()).toBe('Essencial nos 4 tipos de evento')
    expect(falta(wrapper, 'Filmagem').get('[data-teste="cobertura-apoio"]').text()).toBe('Essencial em casamentos e festas de 15 anos')
    expect(falta(wrapper, 'IluminacaoSom').get('[data-teste="cobertura-apoio"]').text()).toBe('Essencial em festas de 15 anos')
    expect(wrapper.get('[data-teste="cobertura-fornecedores"]').attributes('data-carteira')).toBe('nao')
  })

  it('[COMPONENTE] informa arquivados da categoria sem nomes nem contatos', () => {
    const wrapper = montar([fornecedor('Decoracao', { arquivado: true, nomeEmpresa: 'Florista Jardim' })], ['Comemoracao'])

    expect(falta(wrapper, 'Decoracao').get('[data-teste="cobertura-arquivados"]').text()).toBe('1 arquivado nesta categoria')
    expect(wrapper.text()).not.toContain('Florista Jardim')
    expect(wrapper.text()).not.toMatch(/@|\(\d{2}\)/)
    expect(wrapper.findAll('a, button')).toHaveLength(0)
  })

  it('[COMPONENTE] tudo coberto troca a lista pela frase de completo', () => {
    const categorias = VOCABULARIO_TIPO_EVENTO.Comemoracao.fornecedoresEssenciais
    const wrapper = montar(categorias.map((categoria) => fornecedor(categoria)), ['Comemoracao'])

    expect(wrapper.get('[data-teste="cobertura-todas"]').text()).toBe(TEXTOS_COBERTURA_FORNECEDORES.todas)
    expect(wrapper.find('ul[aria-labelledby]').exists()).toBe(false)
  })

  it('[COMPONENTE] a orientação de reaproveitamento só aparece quando pedida, com títulos rotulados', () => {
    const sem = montar([], null)
    expect(sem.find('[data-teste="cobertura-reaproveitamento"]').exists()).toBe(false)

    const com = montar([], null, true)
    const secao = com.get('section')
    expect(com.get(`#${secao.attributes('aria-labelledby')}`).text()).toBe(TEXTOS_COBERTURA_FORNECEDORES.titulo)
    expect(com.findAll('[data-teste="cobertura-reaproveitamento"] li').map((item) => item.text())).toEqual([
      ...TEXTOS_COBERTURA_FORNECEDORES.reaproveitamento,
    ])
    expect(com.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })

  it('[UNITÁRIO] estilo só por contêiner próprio, sem @media nem sticky', () => {
    const fonte = readFileSync(resolve(__dirname, '../CoberturaCategoriasFornecedores.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/sticky/)
    expect(estilo).toMatch(/\.cobertura \{\s*container: cobertura-fornecedores \/ inline-size;\s*\}/)
    expect(estilo).toMatch(/@container cobertura-fornecedores \(min-width: 36rem\) \{\s*\.cobertura__corpo \{/)
  })
})
