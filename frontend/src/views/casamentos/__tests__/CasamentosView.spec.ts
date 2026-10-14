import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CASAMENTOS, resumoListaCasamentos } from '@/textos/casamentos'
import { ID_CASAMENTO, ID_OUTRO, RaizRotas, casamentoCompleto, quando, resumoCasamento, rotearFetch } from './auxiliaresCasamentos'

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

const lista = [
  resumoCasamento(),
  resumoCasamento({ id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Realizado', diasRestantes: -3 }),
]

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  return wrapper
}

function resumo() {
  return wrapper!.find('[data-teste="resumo-casamentos"]')
}

describe('resumoListaCasamentos', () => {
  it('[UNITÁRIO] concorda número e situação', () => {
    expect(resumoListaCasamentos(7, 7, 'Ativos')).toBe('7 casamentos ativos')
    expect(resumoListaCasamentos(1, 1, 'Ativos')).toBe('1 casamento ativo')
    expect(resumoListaCasamentos(3, 3, 'Arquivados')).toBe('3 casamentos arquivados')
    expect(resumoListaCasamentos(1, 1, 'Arquivados')).toBe('1 casamento arquivado')
  })

  it('[UNITÁRIO] com busca mostra exibidos de total', () => {
    expect(resumoListaCasamentos(2, 7, 'Ativos')).toBe('2 de 7 casamentos ativos')
    expect(resumoListaCasamentos(0, 7, 'Arquivados')).toBe('0 de 7 casamentos arquivados')
    expect(resumoListaCasamentos(1200, 1500, 'Ativos')).toBe('1.200 de 1.500 casamentos ativos')
  })
})

describe('CasamentosView no design system Nossia', () => {
  it('[COMPONENTE] cabeçalho mostra o resumo da quantidade em região viva educada', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    expect(resumo().text()).toBe('2 casamentos ativos')
    expect(resumo().attributes('aria-live')).toBe('polite')
    expect(resumo().classes()).toContain('texto-legenda')
    expect(wrapper!.get('header').find('[data-teste="resumo-casamentos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] busca atualiza o resumo para exibidos de total', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('diego')
    await flushPromises()

    expect(resumo().text()).toBe('1 de 2 casamentos ativos')
  })

  it('[COMPONENTE] em Arquivados o resumo nomeia a situação no singular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/casamentos?situacao=Arquivados', () => respostaJson([resumoCasamento({ arquivado: true })])),
    )
    await abrir('/casamentos?situacao=arquivados')

    expect(resumo().text()).toBe('1 casamento arquivado')
  })

  it('[INTEGRAÇÃO] arquivar reduz o resumo junto com a lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)),
      quando('POST', `/api/casamentos/${ID_CASAMENTO}/arquivar`, () => respostaJson(casamentoCompleto({ arquivado: true }))),
    )
    await abrir('/casamentos')

    await wrapper!.findAll('[data-teste="arquivar-casamento"]')[0]!.trigger('click')
    await flushPromises()

    expect(resumo().text()).toBe('1 casamento ativo')
  })

  it('[COMPONENTE] erro de serviço não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaProblema(500)))
    await abrir('/casamentos')

    expect(wrapper!.find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] lista vazia não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([])))
    await abrir('/casamentos')

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.vazioAtivosTitulo)
    expect(resumo().exists()).toBe(false)
  })

  it('[SEGURANÇA] sem acesso à assessoria mostra a mensagem própria e nenhuma contagem', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaProblema(403)))
    await abrir('/casamentos')

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.semAcesso)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] "Novo casamento" é a única ação primária e as ações de linha são texto neutro', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    const botoes = wrapper!.findAllComponents(Button)
    const novo = botoes.find((botao) => botao.props('label') === TEXTOS_CASAMENTOS.novoCasamento)!
    expect(novo.props('severity')).toBeNull()
    expect(novo.props('text')).toBe(false)
    expect(novo.props('outlined')).toBe(false)

    const deLinha = botoes.filter((botao) =>
      ([TEXTOS_CASAMENTOS.editar, TEXTOS_CASAMENTOS.arquivar] as string[]).includes(String(botao.props('label'))),
    )
    expect(deLinha.length).toBe(4)
    for (const botao of deLinha) {
      expect(botao.props('severity')).toBe('secondary')
      expect(botao.props('text')).toBe(true)
    }
  })

  it('[COMPONENTE] nomes do casal ficam dentro do link e a data mantém o horário', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    expect(wrapper!.findAll('[data-teste="link-casamento"] .nomes-casal')).toHaveLength(2)
    expect(wrapper!.text()).toContain('15/05/2027, 16:30')
  })

  it('[COMPONENTE] coluna Casal reserva largura para nomes comuns sem anular a quebra de nomes longos', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    const cabecalhoCasal = wrapper!.findAll('th').find((th) => th.text().includes(TEXTOS_CASAMENTOS.colunaCasal))!
    expect(cabecalhoCasal.attributes('style')).toContain('width: 24%')
  })

  it('[UNITÁRIO] estilos da tela usam só tokens, sem largura própria, sombra ou valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../CasamentosView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))

    expect(estilo).toContain('gap: var(--p-ritmo-campo)')
    expect(estilo).toContain('border-radius: var(--p-raio-campo)')
    expect(estilo).not.toContain('overflow-wrap')
    expect(estilo).not.toMatch(/\d+(px|rem|em)\b/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estilo).not.toContain('max-width')
    expect(estilo).not.toContain('box-shadow')
    expect(estilo).not.toContain('--p-espaco-')
  })
})
