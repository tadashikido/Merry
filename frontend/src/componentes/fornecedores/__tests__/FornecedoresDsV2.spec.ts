import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import IndiceCategorias from '@/componentes/base/IndiceCategorias.vue'
import LinhaFornecedor from '@/componentes/base/LinhaFornecedor.vue'
import CoberturaCategoriasFornecedores from '@/componentes/fornecedores/CoberturaCategoriasFornecedores.vue'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { coberturaDaCarteira } from '@/utilitarios/coberturaFornecedores'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

const raiz = resolve(__dirname, '../../..')
const estilo = (arquivo: string) => readFileSync(resolve(raiz, arquivo), 'utf-8').split('<style scoped>')[1] ?? ''

function roteador() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
}

describe('Fornecedores da assessoria no DS v2', () => {
  it('[COMPONENTE] linha de fornecedor arquivado mostra selo com ponto e categoria como rótulo DS', async () => {
    const r = roteador()
    const montado = mount(LinhaFornecedor, {
      props: { nomeEmpresa: 'Banda Aurora', destino: '/f', categoria: 'Música', arquivado: true },
      global: { plugins: [r] },
    })
    await r.isReady()

    expect(montado.get('.badge-status').attributes('data-ponto')).toBe('true')
    expect(montado.get('.linha-fornecedor__categoria').classes()).toContain('texto-rotulo')
  })

  it('[COMPONENTE] índice marca a categoria escolhida com aria-pressed e mantém contagens', () => {
    const montado = mount(IndiceCategorias, {
      props: {
        modelValue: 'Buffet',
        itens: [{ chave: 'Buffet', rotulo: 'Buffet', quantidade: 2 }],
        rotulo: 'Categorias',
        rotuloTodas: 'Todas',
        total: 2,
      },
    })

    expect(montado.get('[data-chave="Buffet"]').attributes('aria-pressed')).toBe('true')
    expect(montado.get('[data-teste="indice-todas"]').attributes('aria-pressed')).toBe('false')
    expect(montado.get('[data-chave="Buffet"] .indice-categorias__quantidade').text()).toBe('2')
  })

  it('[COMPONENTE] cobertura completa ganha ponto de realizado sem mudar o texto', () => {
    const categorias = VOCABULARIO_TIPO_EVENTO.Comemoracao.fornecedoresEssenciais
    const fornecedores = categorias.map((categoria) => resumoFornecedor({ id: categoria, categoria }))
    const eventos = [resumoEvento({ id: 'e1', tipo: 'Comemoracao', diasRestantes: 20 })]
    const montado = mount(CoberturaCategoriasFornecedores, { props: { cobertura: coberturaDaCarteira(fornecedores, eventos) } })

    expect(montado.get('[data-teste="cobertura-todas"] .cobertura__ponto').attributes('aria-hidden')).toBe('true')
  })

  it('[UNITÁRIO] índice em pílulas com ativa meia-noite e contagens na cor de título', () => {
    const indice = estilo('componentes/base/IndiceCategorias.vue')

    expect(indice).toMatch(/__item \{[^}]*border-radius: var\(--p-raio-total\)/)
    expect(indice).toMatch(/\[aria-pressed='true'\]:hover \{[^}]*background: var\(--p-cor-primaria\)/)
    expect(indice).toMatch(/__quantidade \{[^}]*color: var\(--p-cor-titulo\)/)
    expect(indice).not.toContain('--p-cor-primaria-suave')
  })

  it('[UNITÁRIO] linha usa nome na cor de título e cobertura marca estados com tokens de fase', () => {
    const linha = estilo('componentes/base/LinhaFornecedor.vue')
    const cobertura = estilo('componentes/fornecedores/CoberturaCategoriasFornecedores.vue')
    const view = estilo('views/fornecedores/FornecedoresView.vue')

    expect(linha).toMatch(/__nome \{[^}]*color: var\(--p-cor-titulo\)/)
    expect(cobertura).toMatch(/__item \{\s*--situacao-cor: var\(--p-cor-fase-reta-final-ponto\)/)
    expect(cobertura).toContain('border: 1.5px dashed var(--situacao-cor)')
    expect(cobertura).toMatch(/__completa \{[^}]*color: var\(--p-cor-fase-realizado-texto\)/)
    expect(cobertura).toMatch(/__numero \{[^}]*color: var\(--p-cor-titulo\)/)
    expect(cobertura).not.toContain('--p-cor-primaria')
    expect(view).toContain('min-height: var(--p-dimensao-altura-botao)')
    expect(view).toContain('border-radius: var(--p-raio-campo)')
    expect(`${linha}${cobertura}${view}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b|@media/)
  })
})
