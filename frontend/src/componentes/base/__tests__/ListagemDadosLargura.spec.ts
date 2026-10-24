import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import ListagemDados from '@/componentes/base/ListagemDados.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ColunaListagem, ItemMenuAcoes, LarguraListagem } from '@/componentes/base/tipos'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const ESTILO_LISTAGEM = readFileSync(resolve(__dirname, '../ListagemDados.vue'), 'utf-8').split('<style scoped>')[1] ?? ''

const colunas: ColunaListagem<Record<string, unknown>>[] = [
  { campo: 'nome', titulo: 'Nome', principal: true },
  { campo: 'grupo', titulo: 'Grupo', ocultarNoTablet: true },
]

const itens: Record<string, unknown>[] = [{ id: 1, nome: 'Ana Souza', grupo: 'Família' }]

const acoes: ItemMenuAcoes[] = [{ chave: 'editar', rotulo: 'Editar', icone: 'ie ie-editar' }]

function montarListagem(props: Record<string, unknown> = {}) {
  return mount(ListagemDados, {
    props: { itens, colunas, chave: 'id', rotulo: 'Convidados', ...props },
    slots: { 'acoes-linha': '<button type="button" class="acao">Editar</button>' },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

function montarMenu(props: Record<string, unknown> = {}) {
  return mount(MenuAcoes, {
    props: { itens: acoes, rotulo: 'Mais ações', rotuloAcessivel: 'Mais ações de Família Lima', ...props },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

function blocoContainer(condicao: string): string {
  const inicio = ESTILO_LISTAGEM.indexOf(`@container ${condicao} {`)
  if (inicio < 0) {
    return ''
  }
  const fim = ESTILO_LISTAGEM.indexOf('\n}\n', inicio)
  return ESTILO_LISTAGEM.slice(inicio, fim)
}

describe('ListagemDados — ajuste pela largura da lista', () => {
  it('[COMPONENTE] sem as props novas mantém o padrão pela janela e não compacta ações', async () => {
    simularMatchMedia(false)
    const wrapper = montarListagem()
    await nextTick()

    const raiz = wrapper.get('section.listagem')
    expect(raiz.classes()).toContain('listagem--secundarias-janela')
    expect(raiz.classes().some((classe) => classe.startsWith('listagem--acoes-'))).toBe(false)
    expect(wrapper.get('[data-teste="listagem-tabela"]').findAll('th').map((th) => th.text())).toEqual(['Nome', 'Grupo', 'Ações'])
  })

  it.each<[LarguraListagem]>([['estreita'], ['media'], ['larga']])(
    '[COMPONENTE] aplica a largura "%s" para colunas secundárias e ações',
    async (largura) => {
      simularMatchMedia(false)
      const wrapper = montarListagem({ ocultarSecundariasAbaixo: largura, acoesSomenteIconeAbaixo: largura })
      await nextTick()

      const classes = wrapper.get('section.listagem').classes()
      expect(classes).toContain(`listagem--secundarias-${largura}`)
      expect(classes).toContain(`listagem--acoes-${largura}`)
      expect(classes).not.toContain('listagem--secundarias-janela')
    },
  )

  it('[COMPONENTE] compacta as ações sempre quando pedido', async () => {
    simularMatchMedia(false)
    const wrapper = montarListagem({ acoesSomenteIconeAbaixo: 'sempre' })
    await nextTick()

    expect(wrapper.get('section.listagem').classes()).toContain('listagem--acoes-sempre')
    expect(wrapper.get('.listagem__acoes-linha .acao').text()).toBe('Editar')
  })

  it('[UNITÁRIO] a raiz é o contêiner "listagem" e cada largura tem o seu limiar', () => {
    expect(ESTILO_LISTAGEM).toMatch(/\.listagem \{\s*container: listagem \/ inline-size;/)
    expect(blocoContainer('aplicacao (max-width: 63.99rem)')).toContain('.listagem--secundarias-janela .listagem__tabela :deep(.listagem__coluna--secundaria)')

    const limiares: Record<LarguraListagem, string> = { estreita: '39.99rem', media: '55.99rem', larga: '63.99rem' }
    for (const [largura, limiar] of Object.entries(limiares)) {
      const bloco = blocoContainer(`listagem (max-width: ${limiar})`)
      expect(bloco).toContain(`.listagem--secundarias-${largura} .listagem__tabela :deep(.listagem__coluna--secundaria)`)
      expect(bloco).toMatch(new RegExp(`\\.listagem--acoes-${largura} \\.listagem__tabela \\.listagem__acoes-linha \\{\\s*display: grid;\\s*grid-template-columns: repeat\\(2, auto\\);`))
      expect(bloco).toContain(`.listagem--acoes-${largura} .listagem__tabela .listagem__acoes-linha :deep(.p-button-label)`)
    }
    expect(ESTILO_LISTAGEM).toMatch(/\n\.listagem--acoes-sempre \.listagem__tabela \.listagem__acoes-linha :deep\(\.p-button-label\) \{\s*display: none;/)
  })

  it('[UNITÁRIO] a compactação atinge só a tabela, nunca os cartões do celular', () => {
    const regrasDeAcoes = ESTILO_LISTAGEM.split('\n').filter((linha) => linha.includes('.listagem--acoes-'))
    expect(regrasDeAcoes.length).toBeGreaterThan(0)
    expect(regrasDeAcoes.every((linha) => linha.includes('.listagem__tabela'))).toBe(true)
  })
})

describe('MenuAcoes — modo compactável', () => {
  it('[COMPONENTE] compactável mantém o rótulo visível e expõe a dica e o nome acessível', () => {
    const botao = montarMenu({ compactavel: true }).get('[data-teste="menu-acoes"]')

    expect(botao.text()).toContain('Mais ações')
    expect(botao.attributes('title')).toBe('Mais ações')
    expect(botao.attributes('aria-label')).toBe('Mais ações de Família Lima')
  })

  it('[COMPONENTE] padrão não define dica e só-ícone continua com dica e sem rótulo', () => {
    const padrao = montarMenu().get('[data-teste="menu-acoes"]')
    expect(padrao.attributes('title')).toBeUndefined()
    expect(padrao.text()).toContain('Mais ações')

    const soIcone = montarMenu({ somenteIcone: true }).get('[data-teste="menu-acoes"]')
    expect(soIcone.attributes('title')).toBe('Mais ações')
    expect(soIcone.text()).not.toContain('Mais ações')
    expect(soIcone.attributes('aria-label')).toBe('Mais ações de Família Lima')
  })
})
