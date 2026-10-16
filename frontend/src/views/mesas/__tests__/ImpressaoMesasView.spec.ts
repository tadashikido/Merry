import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { mapaExemplo, mesaExemplo, MESA_NOIVOS } from '@/__tests__/auxiliaresMesas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_IMPRESSAO_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import type { CasamentoDto } from '@/tipos/casamentos'
import type { MapaMesasDto } from '@/tipos/mesas'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_MESAS = `${ROTA_CASAMENTO}/mesas`

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir(casamento: Partial<CasamentoDto> = {}, mapa: MapaMesasDto = mapaExemplo()) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto(casamento))),
    quando('GET', ROTA_MESAS, () => respostaJson(mapa)),
  )
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/mesas/impressao`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('ImpressaoMesasView reestruturada', { timeout: 30_000 }, () => {
  it('[COMPONENTE] cabeçalho timbrado identifica documento, geração, casal, data e local', async () => {
    await abrir({ localRecepcao: 'Villa Giardino' })

    const cabecalho = wrapper!.get('[data-teste="mapa-mesas-impressao"] header')
    expect(cabecalho.get('.mapa__documento').text()).toContain(TEXTOS_IMPRESSAO_MESAS.documento)
    expect(cabecalho.get('.mapa__documento').text()).toContain('Gerado em')
    expect(cabecalho.findAll('h1')).toHaveLength(1)
    expect(cabecalho.get('h1').text()).toBe('Ana Beatriz & Bruno')
    expect(cabecalho.get('.mapa__quando').text()).toMatch(/\d{4}/)
    expect(cabecalho.get('[data-teste="local-impressao"]').text()).toBe('Villa Giardino')
    expect(cabecalho.find('[data-teste="totais-impressao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem local de recepção não renderiza linha vazia', async () => {
    await abrir({ localRecepcao: null })

    expect(wrapper!.find('[data-teste="local-impressao"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="totais-impressao"]').text()).toBe('2 sentados · 5 lugares livres · 3 sem mesa · 3 mesas')
  })

  it('[COMPONENTE] cada mesa é um cartão com título, ocupação e pessoas; mesa vazia mostra nota', async () => {
    await abrir()

    const mesas = wrapper!.findAll('[data-teste="mesa-impressao"]')
    expect(mesas).toHaveLength(3)
    expect(mesas[0]!.classes()).toContain('mapa__mesa--especial')
    expect(mesas[0]!.get('h2').text()).toBe(TEXTOS_MESAS.rotuloMesaNoivos)
    expect(mesas[0]!.find('[data-teste="selo-noivos"]').exists()).toBe(false)
    expect(mesas[0]!.find('[data-teste="ocupacao-mesa"]').exists()).toBe(true)
    expect(mesas[0]!.findAll('ol li').map((item) => item.text())).toEqual(['Ana Souza'])
    expect(mesas[2]!.text()).toContain(TEXTOS_MESAS.mesaVazia)
  })

  it('[COMPONENTE] mesa dos noivos com nome próprio ganha selo textual', async () => {
    const base = mapaExemplo()
    const mesas = base.mesas.map((mesa) => (mesa.id === MESA_NOIVOS ? mesaExemplo({ ...mesa, nome: 'Ana & Bruno' }) : mesa))
    await abrir({}, { ...base, mesas })

    const primeira = wrapper!.findAll('[data-teste="mesa-impressao"]')[0]!
    expect(primeira.get('[data-teste="selo-noivos"]').text()).toBe(TEXTOS_MESAS.rotuloMesaNoivos)
    expect(primeira.get('h2').text()).toContain('Ana & Bruno')
  })

  it('[COMPONENTE] sem mesas criadas mostra a nota e mantém o bloco sem mesa', async () => {
    await abrir({}, mapaExemplo({ mesas: [] }))

    expect(wrapper!.findAll('[data-teste="mesa-impressao"]')).toHaveLength(0)
    expect(wrapper!.text()).toContain(TEXTOS_IMPRESSAO_MESAS.semMesas)
  })

  it('[COMPONENTE] erro de servidor permite tentar de novo e desabilita imprimir', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_MESAS, () => respostaProblema(500)),
    )
    const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/mesas/impressao`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_IMPRESSAO_MESAS.erroCarregar)
    expect(wrapper.get('[data-teste="imprimir"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-teste="mapa-mesas-impressao"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] outra organização mostra não encontrado sem dados do mapa', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaProblema(404)),
      quando('GET', ROTA_MESAS, () => respostaProblema(404)),
    )
    const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/mesas/impressao`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_MESAS.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="mesa-impressao"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="imprimir"]').attributes('disabled')).toBeDefined()
  })

  it('[SEGURANÇA] rodapé de privacidade presente e nenhum contato ou HTML injetado', async () => {
    const base = mapaExemplo()
    const pessoas = base.pessoas.map((pessoa, indice) => (indice === 0 ? { ...pessoa, nome: '<img src=x onerror=alert(1)>' } : pessoa))
    await abrir({}, { ...base, pessoas })

    const folha = wrapper!.get('[data-teste="mapa-mesas-impressao"]')
    expect(folha.get('[data-teste="rodape-impressao"]').text()).toBe(TEXTOS_IMPRESSAO_MESAS.rodape)
    expect(folha.text()).toContain('<img src=x onerror=alert(1)>')
    expect(folha.find('img').exists()).toBe(false)
    expect(folha.text()).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i)
  })

  it('[COMPONENTE] estilo usa tokens, @container na tela e regras de impressão A4', () => {
    const fonte = readFileSync(resolve(__dirname, '../ImpressaoMesasView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    expect(estilo).toContain('container: mapa / inline-size')
    expect(estilo).toContain('@container mapa (min-width: 36rem)')
    expect(estilo).toContain('@container mapa (min-width: 56rem)')
    expect(estilo).toContain('@media print')
    expect(estilo).toContain('break-inside: avoid')
    expect(estilo).toContain('font-weight: var(--p-fonte-peso-leve)')
    expect(estilo).not.toMatch(/@media \(min-width/)
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    expect(estilo.replace(/1px (solid|dotted)/g, '')).not.toMatch(/\d+(px|mm|pt)\b/)
    expect(estilo).not.toMatch(/background:\s*var\(--p-cor/)
    expect(estilo).not.toContain('box-shadow')
    expect(estilo).not.toContain('seminegrito')
  })
})
