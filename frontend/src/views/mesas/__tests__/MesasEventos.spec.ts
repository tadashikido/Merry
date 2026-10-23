import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { mapaExemplo, mesaExemplo } from '@/__tests__/auxiliaresMesas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FECHAMENTO_MESAS } from '@/textos/mesas'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { TotaisConvidadosDto } from '@/tipos/convidados'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { MapaMesasDto } from '@/tipos/mesas'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, rotearFetch, type Rota } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-mesas')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_MESAS = `${ROTA_EVENTO}/mesas`
const ROTA_TOTAIS = `${ROTA_EVENTO}/convites/totais`

function totais(pendentes: number): TotaisConvidadosDto {
  const faixa = (total: number) => ({ adultos: total, criancas: 0, total })
  return { convites: 10, pessoas: 20, adultos: 20, criancas: 0, acompanhantesPermitidos: 0, pendentes: faixa(pendentes), confirmados: faixa(5), recusados: faixa(0) }
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
  vi.restoreAllMocks()
})

function rotas(tipo: string, mapa: MapaMesasDto = mapaExemplo(), totaisRota: Rota = quando('GET', ROTA_TOTAIS, () => respostaJson(totais(4)))): Rota[] {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: tipo as TipoEvento, nomeSegundaPessoa: tipo === 'Casamento' ? 'Bruno' : null }))),
    quando('GET', ROTA_MESAS, () => respostaJson(mapa)),
    totaisRota,
  ]
}

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/mesas`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function mapaNeutro(): MapaMesasDto {
  const mapa = mapaExemplo()
  return { ...mapa, pessoas: mapa.pessoas.map((pessoa) => ({ ...pessoa, grupo: pessoa.grupo === 'Família da noiva' ? 'Família' : pessoa.grupo })) }
}

function titulosMesas(): string[] {
  return wrapper!.findAll('[data-teste="mesa"]').map((mesa) => mesa.get('h3').text())
}

describe('MesasView por tipo de evento', { timeout: 30_000 }, () => {
  it.each(TIPOS_EVENTO)('[INTEGRAÇÃO] %s: mesa especial, fechamento e diálogo usam o vocabulário do tipo', async (tipo) => {
    const termo = VOCABULARIO_TIPO_EVENTO[tipo].mesaEspecial
    rotearFetch(fetchSimulado, ...rotas(tipo, mapaNeutro()))
    await abrir()

    expect(titulosMesas()[0]).toBe(termo)
    expect(wrapper!.get('[data-teste="fechamento-especial"]').text()).toContain(termo)

    await wrapper!.get('[data-teste="nova-mesa"]').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('label[for="mesa-especial"]')?.textContent?.trim()).toBe(termo)
    const dica = document.body.querySelector('[data-teste="dialogo-mesa"]')?.textContent ?? ''
    expect(dica).toContain(`Ex.: ${VOCABULARIO_TIPO_EVENTO[tipo].gruposConvidados.slice(0, 2).join(', ')}`)
  })

  it.each(TIPOS_EVENTO.filter((tipo) => tipo !== 'Casamento'))('[INTEGRAÇÃO] %s: nenhum texto trata casamento como conceito geral', async (tipo) => {
    rotearFetch(fetchSimulado, ...rotas(tipo, mapaNeutro()))
    await abrir()
    await wrapper!.get('[data-teste="nova-mesa"]').trigger('click')
    await flushPromises()

    const dialogo = document.body.querySelector('[data-teste="dialogo-mesa"]')?.textContent ?? ''
    expect(`${wrapper!.text()} ${dialogo}`).not.toMatch(/noiv|casamento|recepção|anfitriões/i)
  })

  it('[INTEGRAÇÃO] tipo desconhecido cai no vocabulário neutro, nunca em casamento', async () => {
    rotearFetch(fetchSimulado, ...rotas('Corporativo', mapaExemplo({ mesas: [], pessoas: [] })))
    await abrir()

    expect(wrapper!.get('[data-teste="estado-vazio"]').text()).toContain('Crie as mesas do evento')
    expect(wrapper!.find('[data-teste="fechamento-mesas"]').exists()).toBe(false)
    expect(wrapper!.text()).not.toMatch(/noiv|casamento|recepção/i)
  })

  it.each([
    ['QuinzeAnos', 'Crie as mesas da festa de 15 anos'],
    ['Aniversario', 'Crie as mesas do aniversário'],
    ['Comemoracao', 'Crie as mesas da comemoração'],
  ])('[INTEGRAÇÃO] estado vazio de %s cita o evento pelo tipo', async (tipo, titulo) => {
    rotearFetch(fetchSimulado, ...rotas(tipo, mapaExemplo({ mesas: [], pessoas: [] })))
    await abrir()

    expect(wrapper!.get('[data-teste="estado-vazio"]').text()).toContain(titulo)
  })

  it('[INTEGRAÇÃO] mostra lugares, confirmados e a faixa "se todos que faltam vierem" com os totais de convidados', async () => {
    rotearFetch(fetchSimulado, ...rotas('QuinzeAnos'))
    await abrir()

    expect(chamadas(fetchSimulado, 'GET', ROTA_TOTAIS)).toHaveLength(1)
    expect(wrapper!.get('[data-teste="fechamento-frase"]').text()).toBe(TEXTOS_FECHAMENTO_MESAS.bastam(3))
    expect(wrapper!.get('[data-teste="fechamento-maximo"]').text()).toContain('9')
    expect(wrapper!.get('[data-teste="fechamento-projecao"]').text()).toBe('Se todos que faltam vierem, faltariam 2 lugares.')
  })

  it('[INTEGRAÇÃO] simula falha nos totais de convidados: só a projeção some, sem erro na tela', async () => {
    rotearFetch(fetchSimulado, ...rotas('Aniversario', mapaExemplo(), quando('GET', ROTA_TOTAIS, () => respostaProblema(500))))
    await abrir()

    expect(wrapper!.find('[data-teste="fechamento-mesas"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="fechamento-maximo"]').exists()).toBe(false)
    expect(wrapper!.find('.estado-erro').exists()).toBe(false)
  })

  it('[SEGURANÇA] permissão negada nos totais não esconde as mesas nem expõe erro', async () => {
    rotearFetch(fetchSimulado, ...rotas('Comemoracao', mapaExemplo(), quando('GET', ROTA_TOTAIS, () => respostaProblema(403))))
    await abrir()

    expect(titulosMesas()).toHaveLength(3)
    expect(wrapper!.find('[data-teste="fechamento-maximo"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] atalho por grupo aplica o filtro existente e tocar de novo limpa', async () => {
    rotearFetch(fetchSimulado, ...rotas('Casamento'))
    await abrir()

    const grupo = () => wrapper!.findAll('[data-teste="grupo-sem-mesa"]').find((botao) => botao.text().includes('Família da noiva'))!
    expect(grupo().attributes('aria-pressed')).toBe('false')
    await grupo().trigger('click')
    await flushPromises()

    expect(grupo().attributes('aria-pressed')).toBe('true')
    const semMesa = wrapper!.get('[data-teste="coluna-sem-mesa"]').text()
    expect(semMesa).toContain('Carla Souza')
    expect(semMesa).not.toContain('=Primo Zeca')
    expect(wrapper!.find('[data-teste="limpar-filtros"]').exists()).toBe(true)

    await grupo().trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-teste="coluna-sem-mesa"]').text()).toContain('=Primo Zeca')
    expect(wrapper!.find('[data-teste="limpar-filtros"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] sem mesa especial orienta a marcar a mesa do tipo', async () => {
    rotearFetch(fetchSimulado, ...rotas('QuinzeAnos', mapaExemplo({ mesas: [mesaExemplo()] })))
    await abrir()

    expect(wrapper!.get('[data-teste="fechamento-especial-ausente"]').text()).toContain('marque “Mesa da debutante”')
  })
})
