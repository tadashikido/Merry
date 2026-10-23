import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('restricoes-alimentares')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_RELATORIO = `${ROTA_EVENTO}/restricoes-alimentares`

const ESTILO_VIEW = (() => {
  const fonte = readFileSync(resolve(__dirname, '../RestricoesAlimentaresView.vue'), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
})()

function relatorio(dados: Partial<RelatorioRestricoesAlimentaresDto> = {}): RelatorioRestricoesAlimentaresDto {
  return {
    totalPessoas: 1,
    totalConfirmados: 1,
    porTipo: [{ tipo: 'Vegana', quantidade: 1 }],
    outrasRestricoes: 0,
    necessidadesEspeciais: 1,
    pessoas: [
      {
        convidadoId: '44444444-4444-4444-8444-444444444444',
        conviteId: '33333333-3333-4333-8333-333333333333',
        nome: 'Pedro Henrique de Albuquerque Lima Figueiredo',
        acompanhante: false,
        resposta: 'Confirmado',
        tipos: ['Vegana'],
        outraRestricao: null,
        necessidadeEspecial: 'Cadeira de rodas',
        origemConsentimento: 'Convidado',
        consentidoEm: '2026-10-01T12:00:00Z',
      },
    ],
    diasRetencao: 30,
    dataExclusaoPrevista: '2028-01-10',
    dadosExcluidosEm: null,
    registrosIlegiveis: 0,
    podeRegistrar: true,
    ...dados,
  }
}

const VAZIO: Partial<RelatorioRestricoesAlimentaresDto> = {
  totalPessoas: 0,
  totalConfirmados: 0,
  porTipo: [],
  pessoas: [],
  necessidadesEspeciais: 0,
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

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

async function abrir(corpo: () => Response) {
  rotearFetch(fetchSimulado, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), quando('GET', ROTA_RELATORIO, corpo))
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/restricoes-alimentares`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('RestricoesAlimentaresView — reestruturação da fundação', { timeout: 20_000 }, () => {
  it('[COMPONENTE] lateral reúne o resumo para o buffet e o aviso de exclusão, antes da tabela no DOM', async () => {
    await abrir(() => respostaJson(relatorio()))

    const corpo = wrapper!.get('[data-teste="restricoes-corpo"]')
    const lateral = corpo.get('[data-teste="restricoes-lateral"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-label')).toBe(TEXTOS_DADOS_SENSIVEIS.resumoBuffet)
    expect(lateral.find('[data-teste="resumo-cardapio"]').exists()).toBe(true)
    expect(lateral.get('[data-teste="restricoes-exclusao-prevista"]').text()).toContain('10/01/2028')

    const principal = corpo.get('.restricoes__principal')
    expect(principal.text()).toContain('Pedro Henrique de Albuquerque Lima Figueiredo')
    const filhos = Array.from(corpo.element.children)
    expect(filhos.indexOf(lateral.element)).toBeLessThan(filhos.indexOf(principal.element))
  })

  it('[COMPONENTE] aviso de ilegíveis fica na área principal, acima da tabela', async () => {
    await abrir(() => respostaJson(relatorio({ registrosIlegiveis: 1 })))

    const principal = wrapper!.get('.restricoes__principal')
    expect(principal.find('[data-teste="restricoes-ilegiveis"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="restricoes-lateral"]').find('[data-teste="restricoes-ilegiveis"]').exists()).toBe(false)
  })

  it('[COMPONENTE] estado vazio mantém o aviso de exclusão prevista visível', async () => {
    await abrir(() => respostaJson(relatorio(VAZIO)))

    expect(wrapper!.find('[data-teste="restricoes-vazio"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="restricoes-corpo"]').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="restricoes-exclusao-prevista"]')).toHaveLength(1)
    expect(wrapper!.get('[data-teste="restricoes-exclusao-prevista"]').text()).toContain('30 dias após o evento')
  })

  it('[COMPONENTE] com pessoas o aviso de exclusão aparece uma única vez', async () => {
    await abrir(() => respostaJson(relatorio()))

    expect(wrapper!.findAll('[data-teste="restricoes-exclusao-prevista"]')).toHaveLength(1)
  })

  it('[SEGURANÇA] título da aba não carrega dado de saúde', async () => {
    await abrir(() => respostaJson(relatorio()))

    expect(document.title).toContain(TEXTOS_DADOS_SENSIVEIS.tituloPainel)
    expect(document.title).not.toContain('Vegana')
    expect(document.title).not.toContain('Cadeira de rodas')
    expect(document.title).not.toContain('Pedro')
  })

  it('[SEGURANÇA] erro do servidor não exibe lateral nem dados', async () => {
    await abrir(() => respostaProblema(500, { title: 'Erro' }))

    expect(wrapper!.text()).toContain(TEXTOS_DADOS_SENSIVEIS.erroCarregar)
    expect(wrapper!.find('[data-teste="restricoes-lateral"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos usam @container e ritmo, sem @media nem espaçamento solto', () => {
    expect(ESTILO_VIEW).not.toMatch(/@media/)
    expect(ESTILO_VIEW).toContain('container: restricoes / inline-size')
    expect(ESTILO_VIEW).toContain('@container restricoes (min-width: 40rem)')
    expect(ESTILO_VIEW).toContain('@container restricoes (max-width: 63.99rem)')
    expect(ESTILO_VIEW).toContain('@container restricoes (min-width: 80rem)')
    expect(ESTILO_VIEW).not.toMatch(/--p-espaco-/)
    expect(ESTILO_VIEW).not.toMatch(/(?:gap|margin|padding)[^;]*\d+px/)
    expect(ESTILO_VIEW).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
