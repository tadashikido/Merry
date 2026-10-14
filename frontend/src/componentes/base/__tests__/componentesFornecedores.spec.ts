import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'

import CanaisContato from '@/componentes/base/CanaisContato.vue'
import IndiceCategorias from '@/componentes/base/IndiceCategorias.vue'
import LinhaFornecedor from '@/componentes/base/LinhaFornecedor.vue'

const Vazia = defineComponent({ render: () => h('div') })

let montado: VueWrapper | undefined

afterEach(() => {
  montado?.unmount()
  montado = undefined
  document.body.innerHTML = ''
})

async function criarRoteador() {
  const roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Vazia },
      { path: '/fornecedores/:fornecedorId', name: 'fornecedor', component: Vazia },
    ],
  })
  await roteador.push('/')
  await roteador.isReady()
  return roteador
}

describe('IndiceCategorias', () => {
  it('[COMPONENTE] marca a categoria selecionada, anuncia a contagem e emite a escolha', async () => {
    montado = mount(IndiceCategorias, {
      props: {
        itens: [
          { chave: 'Buffet', rotulo: 'Buffet', quantidade: 3 },
          { chave: 'Fotografia', rotulo: 'Fotografia', quantidade: 1 },
        ],
        rotulo: 'Categorias',
        rotuloTodas: 'Todas',
        total: 4,
        modelValue: null,
      },
    })

    expect(montado.get('nav').attributes('aria-label')).toBe('Categorias')
    const todas = montado.get('[data-teste="indice-todas"]')
    expect(todas.attributes('aria-pressed')).toBe('true')
    expect(todas.attributes('aria-label')).toBe('Todas, 4 fornecedores')
    const categorias = montado.findAll('[data-teste="indice-categoria"]')
    expect(categorias[1]!.attributes('aria-label')).toBe('Fotografia, 1 fornecedor')
    expect(categorias[0]!.get('.indice-categorias__quantidade').text()).toBe('3')

    await categorias[0]!.trigger('click')
    expect(montado.emitted('update:modelValue')?.[0]).toEqual(['Buffet'])
    await montado.setProps({ modelValue: 'Buffet' })
    expect(montado.get('[data-chave="Buffet"]').attributes('aria-pressed')).toBe('true')
    expect(montado.get('[data-teste="indice-todas"]').attributes('aria-pressed')).toBe('false')
  })
})

describe('CanaisContato', () => {
  it('[SEGURANÇA] mostra só canais válidos com links de esquema fixo e externos isolados', () => {
    montado = mount(CanaisContato, {
      props: {
        nome: 'Buffet Oliveira',
        telefone: '11987654321',
        email: 'contato@oliveira.com.br',
        site: 'javascript:alert(1)',
        instagram: 'buffetoliveira',
      },
    })

    const canais = montado.findAll('[data-teste="canal-contato"]')
    expect(canais.map((canal) => canal.attributes('data-canal'))).toEqual(['telefone', 'whatsapp', 'email', 'instagram'])
    expect(canais.map((canal) => canal.attributes('href'))).toEqual([
      'tel:11987654321',
      'https://wa.me/5511987654321',
      'mailto:contato@oliveira.com.br',
      'https://www.instagram.com/buffetoliveira/',
    ])
    expect(canais[0]!.attributes('aria-label')).toBe('Ligar para Buffet Oliveira')
    expect(canais[0]!.attributes('target')).toBeUndefined()
    expect(canais[1]!.attributes('target')).toBe('_blank')
    expect(canais[1]!.attributes('rel')).toBe('noopener noreferrer')
    expect(montado.html()).not.toContain('javascript:')
  })

  it('[COMPONENTE] variante completa mostra os valores legíveis; sem canais não renderiza', () => {
    montado = mount(CanaisContato, {
      props: { nome: 'Casa Aurora', telefone: '1133224455', site: 'casaaurora.com.br', variante: 'completa' },
    })
    expect(montado.text()).toContain('(11) 3322-4455')
    expect(montado.text()).toContain('casaaurora.com.br')
    expect(montado.get('[data-canal="site"]').attributes('href')).toBe('https://casaaurora.com.br')
    montado.unmount()

    montado = mount(CanaisContato, { props: { nome: 'Sem contato' } })
    expect(montado.find('[data-teste="canais-contato"]').exists()).toBe(false)
  })
})

describe('LinhaFornecedor', () => {
  it('[COMPONENTE] liga o nome ao detalhe, mostra responsável, categoria e selo de arquivado', async () => {
    const roteador = await criarRoteador()
    montado = mount(LinhaFornecedor, {
      props: {
        nomeEmpresa: 'Florista Jardim',
        destino: { name: 'fornecedor', params: { fornecedorId: 'f1' } },
        responsavel: 'Rui Prado',
        categoria: 'Decoração',
        telefone: '21999887766',
        arquivado: true,
        rotuloArquivado: 'Arquivado',
      },
      slots: { acoes: '<button data-teste="acao">Mais</button>' },
      global: { plugins: [roteador] },
    })

    const linha = montado.get('[data-teste="linha-fornecedor"]')
    expect(linha.element.tagName).toBe('LI')
    expect(linha.get('[data-teste="link-fornecedor"]').attributes('href')).toBe('/fornecedores/f1')
    expect(linha.text()).toContain('Rui Prado')
    expect(linha.text()).toContain('Decoração')
    expect(linha.get('[data-teste="badge-status"]').text()).toContain('Arquivado')
    expect(linha.find('[data-teste="acao"]').exists()).toBe(true)
    expect(linha.findAll('[data-teste="canal-contato"]')).toHaveLength(2)
  })
})
