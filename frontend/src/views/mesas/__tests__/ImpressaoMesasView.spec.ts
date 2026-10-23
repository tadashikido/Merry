import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { mapaExemplo, mesaExemplo, MESA_ANFITRIOES } from '@/__tests__/auxiliaresMesas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_IMPRESSAO_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import type { EventoDto } from '@/tipos/eventos'
import type { MapaMesasDto } from '@/tipos/mesas'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('impressao-mesas')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_MESAS = `${ROTA_EVENTO}/mesas`

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  window.history.replaceState(null, '')
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir(evento: Partial<EventoDto> = {}, mapa: MapaMesasDto = mapaExemplo()) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto(evento))),
    quando('GET', ROTA_MESAS, () => respostaJson(mapa)),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/mesas/impressao`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('ImpressaoMesasView reestruturada', () => {
  it('[COMPONENTE] cabeçalho timbrado identifica documento, geração, tipo, anfitriões, data e locais rotulados', async () => {
    await abrir({ localCerimonia: 'Capela São José', localRecepcao: 'Villa Giardino' })

    const cabecalho = wrapper!.get('[data-teste="mapa-mesas-impressao"] header')
    expect(cabecalho.get('.mapa__documento').text()).toContain(TEXTOS_IMPRESSAO_MESAS.documento)
    expect(cabecalho.get('.mapa__documento').text()).toContain('Gerado em')
    expect(cabecalho.findAll('h1')).toHaveLength(1)
    expect(cabecalho.get('h1').text()).toBe('Ana Beatriz & Bruno')
    expect(cabecalho.get('[data-teste="mapa-tipo"]').text()).toBe('Casamento')
    const detalhes = cabecalho.get('[data-teste="mapa-detalhes"]')
    expect(detalhes.element.tagName).toBe('DL')
    expect(detalhes.attributes('aria-label')).toBe(TEXTOS_IMPRESSAO_MESAS.detalhesRotulo)
    expect(detalhes.get('[data-teste="mapa-detalhe-data"] dd').text()).toMatch(/\d{4}/)
    expect(detalhes.get('[data-teste="mapa-detalhe-localPrincipal"]').text()).toContain('Cerimônia')
    expect(detalhes.get('[data-teste="mapa-detalhe-localPrincipal"]').text()).toContain('Capela São José')
    expect(detalhes.get('[data-teste="mapa-detalhe-localSecundario"]').text()).toContain('Recepção')
    expect(detalhes.get('[data-teste="mapa-detalhe-localSecundario"]').text()).toContain('Villa Giardino')
    expect(cabecalho.find('[data-teste="totais-impressao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem local secundário não renderiza linha vazia e resumo lista os totais', async () => {
    await abrir({ localRecepcao: null })

    expect(wrapper!.find('[data-teste="mapa-detalhe-localSecundario"]').exists()).toBe(false)
    const totais = wrapper!.get('[data-teste="totais-impressao"]')
    expect(totais.element.tagName).toBe('UL')
    expect(totais.attributes('aria-label')).toBe(TEXTOS_IMPRESSAO_MESAS.resumoRotulo)
    expect(totais.findAll('li').map((item) => item.text())).toEqual(['3 mesas', '7 lugares', '2 sentados', '5 lugares livres', '3 sem mesa'])
    expect(wrapper!.find('[data-teste="faltam-impressao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cada mesa é um cartão com título, ocupação, totais e pessoas; mesa vazia mostra nota', async () => {
    await abrir()

    const mesas = wrapper!.findAll('[data-teste="mesa-impressao"]')
    expect(mesas).toHaveLength(3)
    expect(mesas[0]!.classes()).toContain('mapa__mesa--especial')
    expect(mesas[0]!.get('h2').text()).toBe('Mesa dos noivos')
    expect(mesas[0]!.find('[data-teste="selo-anfitrioes"]').exists()).toBe(false)
    expect(mesas[0]!.find('[data-teste="ocupacao-mesa"]').exists()).toBe(true)
    expect(mesas[0]!.get('[data-teste="resumo-mesa"]').text()).toBe('1 lugar livre')
    expect(mesas[0]!.findAll('ol li').map((item) => item.text())).toEqual(['Ana Souza'])
    expect(mesas[1]!.get('[data-teste="resumo-mesa"]').text()).toBe('2 lugares livres')
    expect(mesas[2]!.text()).toContain(TEXTOS_MESAS.mesaVazia)
  })

  it('[COMPONENTE] mesa completa e crianças sentadas aparecem no total da mesa', async () => {
    const base = mapaExemplo()
    const pessoas = base.pessoas.map((pessoa) => (pessoa.id === 'p-pedro' ? { ...pessoa, mesaId: MESA_ANFITRIOES } : pessoa))
    const mesas = base.mesas.map((mesa) => (mesa.id === MESA_ANFITRIOES ? { ...mesa, ocupacao: 2 } : mesa))
    await abrir({}, { ...base, pessoas, mesas })

    const primeira = wrapper!.findAll('[data-teste="mesa-impressao"]')[0]!
    expect(primeira.get('[data-teste="resumo-mesa"]').text()).toBe(`${TEXTOS_IMPRESSAO_MESAS.completa}, 1 criança`)
    expect(primeira.find('[data-teste="criancas-mesa"]').exists()).toBe(true)
  })

  it('[COMPONENTE] avisa quando faltam lugares para os confirmados sem mesa', async () => {
    const base = mapaExemplo()
    await abrir({}, { ...base, totais: { ...base.totais, lugaresLivres: 1, semMesa: 3 } })

    expect(wrapper!.get('[data-teste="faltam-impressao"]').text()).toBe('Faltam 2 lugares para sentar todos os confirmados.')
  })

  it('[COMPONENTE] legenda explica amostras, marcadores e a mesa especial pelo termo do tipo', async () => {
    await abrir({ tipo: 'Aniversario', nomeSegundaPessoa: null })

    const legenda = wrapper!.get('[data-teste="legenda-impressao"]')
    expect(legenda.attributes('aria-label')).toBe(TEXTOS_IMPRESSAO_MESAS.legendaRotulo)
    expect(legenda.text()).toContain(TEXTOS_IMPRESSAO_MESAS.legendaOcupado)
    expect(legenda.text()).toContain(TEXTOS_IMPRESSAO_MESAS.legendaLivre)
    expect(legenda.text()).toContain(TEXTOS_IMPRESSAO_MESAS.legendaMarcadores)
    expect(legenda.get('[data-teste="legenda-especial"]').text()).toBe('Mesa do aniversariante: contorno mais forte, sempre primeiro')
    expect(legenda.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })

  it('[COMPONENTE] sem mesa especial a legenda não cita o termo', async () => {
    const base = mapaExemplo()
    await abrir({}, { ...base, mesas: base.mesas.map((mesa) => ({ ...mesa, especial: false })) })

    expect(wrapper!.get('[data-teste="legenda-impressao"]').find('[data-teste="legenda-especial"]').exists()).toBe(false)
  })

  it.each([
    ['Casamento', 'Casamento', 'Mesa dos noivos', 'Horário da cerimônia', /anfitri/i],
    ['QuinzeAnos', 'Festa de 15 anos', 'Mesa da debutante', 'Horário da festa', /casamento|noiv|cerimônia|anfitri/i],
    ['Aniversario', 'Aniversário', 'Mesa do aniversariante', 'Horário da festa', /casamento|noiv|cerimônia|anfitri/i],
    ['Comemoracao', 'Comemoração', 'Mesa de honra', 'Horário do evento', /casamento|noiv|cerimônia|anfitri/i],
  ] as const)('[COMPONENTE] tipo %s usa tipo, mesa especial e horário do vocabulário', async (tipo, rotuloTipo, termo, horario, proibido) => {
    const base = mapaExemplo()
    const mesas = base.mesas.map((mesa) => (mesa.id === MESA_ANFITRIOES ? mesaExemplo({ ...mesa, nome: 'Principal' }) : mesa))
    await abrir({ tipo }, { ...base, mesas })

    expect(wrapper!.get('[data-teste="mapa-tipo"]').text()).toBe(rotuloTipo)
    expect(wrapper!.get('[data-teste="mapa-detalhe-horario"] dt').text()).toBe(horario)
    const primeira = wrapper!.findAll('[data-teste="mesa-impressao"]')[0]!
    expect(primeira.get('[data-teste="selo-anfitrioes"]').text()).toBe(termo)
    expect(primeira.get('h2').text()).toBe('Mesa 1 · Principal')
    expect(wrapper!.get('[data-teste="mapa-mesas-impressao"]').text()).not.toMatch(proibido)
  })

  it('[COMPONENTE] tipo desconhecido omite a linha de tipo e usa mesa de honra, nunca termo de casamento', async () => {
    await abrir({ tipo: 'Corporativo' as EventoDto['tipo'] })

    expect(wrapper!.find('[data-teste="mapa-tipo"]').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="mesa-impressao"]')[0]!.get('h2').text()).toBe('Mesa de honra')
    expect(wrapper!.get('[data-teste="mapa-detalhe-horario"] dt').text()).toBe('Horário do evento')
    expect(wrapper!.get('[data-teste="mapa-mesas-impressao"]').text()).not.toMatch(/casamento|noiv|anfitri/i)
  })

  it('[COMPONENTE] voltar leva às mesas por padrão', async () => {
    await abrir()

    const voltar = wrapper!.get('[data-teste="voltar-mesas"]')
    expect(voltar.text()).toBe(TEXTOS_IMPRESSAO_MESAS.voltar)
    expect(voltar.attributes('href')).toBe(`/eventos/${ID_EVENTO}/mesas`)
  })

  it('[COMPONENTE] voltar respeita o painel de confirmações do mesmo evento como origem', async () => {
    window.history.replaceState({ back: `/eventos/${ID_EVENTO}/confirmacoes` }, '')
    await abrir()

    const voltar = wrapper!.get('[data-teste="voltar-mesas"]')
    expect(voltar.text()).toBe(TEXTOS_IMPRESSAO_MESAS.voltarConfirmacoes)
    expect(voltar.attributes('href')).toBe(`/eventos/${ID_EVENTO}/confirmacoes`)
  })

  it('[SEGURANÇA] origem de outro evento, rota fora da lista ou externa volta às mesas', async () => {
    window.history.replaceState({ back: '/eventos/00000000-0000-4000-8000-000000000999/confirmacoes' }, '')
    await abrir()
    expect(wrapper!.get('[data-teste="voltar-mesas"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/mesas`)
    wrapper!.unmount()
    wrapper = undefined

    window.history.replaceState({ back: `/eventos/${ID_EVENTO}/restricoes-alimentares` }, '')
    await abrir()
    expect(wrapper!.get('[data-teste="voltar-mesas"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/mesas`)
    wrapper!.unmount()
    wrapper = undefined

    window.history.replaceState({ back: '//malicioso.example/eventos' }, '')
    await abrir()
    expect(wrapper!.get('[data-teste="voltar-mesas"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/mesas`)
  })

  it('[COMPONENTE] mesa especial com nome próprio ganha selo textual com o termo do tipo', async () => {
    const base = mapaExemplo()
    const mesas = base.mesas.map((mesa) => (mesa.id === MESA_ANFITRIOES ? mesaExemplo({ ...mesa, nome: 'Ana & Bruno' }) : mesa))
    await abrir({}, { ...base, mesas })

    const primeira = wrapper!.findAll('[data-teste="mesa-impressao"]')[0]!
    expect(primeira.get('[data-teste="selo-anfitrioes"]').text()).toBe('Mesa dos noivos')
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
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_MESAS, () => respostaProblema(500)),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/mesas/impressao`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_IMPRESSAO_MESAS.erroCarregar)
    expect(wrapper.get('[data-teste="imprimir"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-teste="mapa-mesas-impressao"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] outra organização mostra não encontrado sem dados do mapa', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaProblema(404)),
      quando('GET', ROTA_MESAS, () => respostaProblema(404)),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/mesas/impressao`)
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
    expect(estilo.match(/@media [^{]+/g)?.map((regra) => regra.trim())).toEqual(['@media print'])
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    expect(estilo.replace(/1px (solid|dotted)/g, '')).not.toMatch(/\d+(px|mm|pt)\b/)
    expect(estilo).not.toMatch(/background:\s*var\(--p-cor/)
    expect(estilo).not.toContain('box-shadow')
    expect(estilo).not.toContain('seminegrito')
  })
})
