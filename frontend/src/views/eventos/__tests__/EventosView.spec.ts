import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS, resumoListaEventos } from '@/textos/eventos'
import { ID_EVENTO, ID_OUTRO, RaizRotas, eventoCompleto, quando, resumoEvento, rotearFetch } from './auxiliaresEventos'

await precarregarRotas('eventos')

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

const lista = [
  resumoEvento(),
  resumoEvento({ id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Realizado', diasRestantes: -3 }),
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
  return wrapper!.find('[data-teste="resumo-eventos"]')
}

describe('resumoListaEventos', () => {
  it('[UNITÁRIO] concorda número e situação', () => {
    expect(resumoListaEventos(7, 7, 'Ativos')).toBe('7 eventos ativos')
    expect(resumoListaEventos(1, 1, 'Ativos')).toBe('1 evento ativo')
    expect(resumoListaEventos(3, 3, 'Arquivados')).toBe('3 eventos arquivados')
    expect(resumoListaEventos(1, 1, 'Arquivados')).toBe('1 evento arquivado')
  })

  it('[UNITÁRIO] com busca mostra exibidos de total', () => {
    expect(resumoListaEventos(2, 7, 'Ativos')).toBe('2 de 7 eventos ativos')
    expect(resumoListaEventos(0, 7, 'Arquivados')).toBe('0 de 7 eventos arquivados')
    expect(resumoListaEventos(1200, 1500, 'Ativos')).toBe('1.200 de 1.500 eventos ativos')
  })
})

describe('EventosView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho mostra o resumo da quantidade em região viva educada', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(resumo().text()).toBe('2 eventos ativos')
    expect(resumo().attributes('aria-live')).toBe('polite')
    expect(resumo().classes()).toContain('texto-legenda')
    expect(wrapper!.get('header').find('[data-teste="resumo-eventos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] busca atualiza o resumo para exibidos de total', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('diego')
    await flushPromises()

    expect(resumo().text()).toBe('1 de 2 eventos ativos')
  })

  it('[COMPONENTE] em Arquivados o resumo nomeia a situação no singular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([resumoEvento({ arquivado: true })])),
    )
    await abrir('/eventos?situacao=arquivados')

    expect(resumo().text()).toBe('1 evento arquivado')
  })

  it('[INTEGRAÇÃO] arquivar reduz o resumo junto com a lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)),
      quando('POST', `/api/eventos/${ID_EVENTO}/arquivar`, () => respostaJson(eventoCompleto({ arquivado: true }))),
    )
    await abrir('/eventos')

    await wrapper!.findAll('[data-teste="arquivar-evento"]')[0]!.trigger('click')
    await flushPromises()

    expect(resumo().text()).toBe('1 evento ativo')
  })

  it('[COMPONENTE] erro de serviço não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaProblema(500)))
    await abrir('/eventos')

    expect(wrapper!.find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] lista vazia não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])))
    await abrir('/eventos')

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.vazioAtivosTitulo)
    expect(resumo().exists()).toBe(false)
  })

  it('[SEGURANÇA] sem acesso à assessoria mostra a mensagem própria e nenhuma contagem', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaProblema(403)))
    await abrir('/eventos')

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.semAcesso)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] "Novo evento" é a única ação primária e as ações de linha são texto neutro', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    const botoes = wrapper!.findAllComponents(Button)
    const novo = botoes.find((botao) => botao.props('label') === TEXTOS_EVENTOS.novoEvento)!
    expect(novo.props('severity')).toBeNull()
    expect(novo.props('text')).toBe(false)
    expect(novo.props('outlined')).toBe(false)

    const deLinha = botoes.filter((botao) =>
      ([TEXTOS_EVENTOS.editar, TEXTOS_EVENTOS.arquivar] as string[]).includes(String(botao.props('label'))),
    )
    expect(deLinha.length).toBe(4)
    for (const botao of deLinha) {
      expect(botao.props('severity')).toBe('secondary')
      expect(botao.props('text')).toBe(true)
    }
  })

  it('[COMPONENTE] nomes dos anfitriões ficam dentro do link e a data mantém o horário', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(wrapper!.findAll('[data-teste="link-evento"] .nomes-anfitrioes')).toHaveLength(2)
    expect(wrapper!.text()).toContain('15/05/2027, 16:30')
  })

  it('[COMPONENTE] coluna Anfitriões reserva largura para nomes comuns sem anular a quebra de nomes longos', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    const cabecalhoAnfitriao = wrapper!.findAll('th').find((th) => th.text().includes(TEXTOS_EVENTOS.colunaAnfitriao))!
    expect(cabecalhoAnfitriao.attributes('style')).toContain('width: 24%')
  })

  it('[UNITÁRIO] estilos da tela usam só tokens, sem largura própria, sombra ou valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../EventosView.vue'), 'utf-8')
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
