import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import CabecalhoConvite from '@/componentes/base/CabecalhoConvite.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { VOCABULARIO_TIPO_EVENTO, aceitaSegundoNome, ehTipoEvento, tiposEventoEmFrase, vocabularioDoTipo } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { montarLocaisOperacao } from '@/utilitarios/cronogramaPublico'
import { formatarNomesAnfitrioes, formatarNomesEmFrase } from '@/utilitarios/formatacao'
import { modelosDoTipo } from '@/utilitarios/modelosPorTipo'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, rotearFetch } from './auxiliaresEventos'

await precarregarRotas('evento-novo', 'evento', 'evento-editar')

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

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  return { montagem, wrapper }
}

function rotulos(): string[] {
  return wrapper!.findAll('label').map((rotulo) => rotulo.text())
}

const TERMOS_CASAMENTO = /cerimônia|recepção|noiv|casamento|padrinh/i

describe('vocabulário por tipo de evento', () => {
  it('[UNITÁRIO] cobre os quatro tipos e cai em Casamento para valor desconhecido', () => {
    expect(Object.keys(VOCABULARIO_TIPO_EVENTO)).toEqual([...TIPOS_EVENTO])
    expect(vocabularioDoTipo('Corporativo' as TipoEvento)).toBe(VOCABULARIO_TIPO_EVENTO.Casamento)
    expect(vocabularioDoTipo(null)).toBe(VOCABULARIO_TIPO_EVENTO.Casamento)
    expect(ehTipoEvento('QuinzeAnos')).toBe(true)
    expect(ehTipoEvento('Formatura')).toBe(false)
  })

  it.each(['QuinzeAnos', 'Aniversario', 'Comemoracao'] as const)('[UNITÁRIO] %s não usa termos de casamento', (tipo) => {
    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]
    const textos = [
      vocabulario.rotulo,
      vocabulario.rotuloPlural,
      vocabulario.descricao,
      vocabulario.homenageados.grupo,
      vocabulario.homenageados.primeiro,
      vocabulario.homenageados.segundo ?? '',
      ...Object.values(vocabulario.locais),
      vocabulario.horario,
      vocabulario.faltaHorario,
      vocabulario.faltaLocal,
      vocabulario.mesaEspecial,
      vocabulario.celebracao('Júlia', false),
    ]
    expect(textos.filter((texto) => TERMOS_CASAMENTO.test(texto))).toEqual([])
    expect(vocabulario.aneisNoConvite).toBe(false)
  })

  it('[UNITÁRIO] lista os tipos atendidos em frase, na ordem do vocabulário', () => {
    expect(tiposEventoEmFrase()).toBe('casamentos, festas de 15 anos, aniversários e comemorações')
    for (const tipo of TIPOS_EVENTO) {
      expect(tiposEventoEmFrase()).toContain(VOCABULARIO_TIPO_EVENTO[tipo].rotuloPlural.toLocaleLowerCase('pt-BR'))
    }
  })

  it('[UNITÁRIO] só Casamento e Comemoração aceitam segundo nome', () => {
    expect(TIPOS_EVENTO.filter(aceitaSegundoNome)).toEqual(['Casamento', 'Comemoracao'])
  })

  it('[UNITÁRIO] formata nomes com um ou dois homenageados', () => {
    expect(formatarNomesAnfitrioes('Ana', 'Bruno')).toBe('Ana & Bruno')
    expect(formatarNomesAnfitrioes(' Helena ', null)).toBe('Helena')
    expect(formatarNomesAnfitrioes('Helena', '  ')).toBe('Helena')
    expect(formatarNomesEmFrase('Ana', 'Bruno')).toBe('Ana e Bruno')
    expect(formatarNomesEmFrase('Helena', null)).toBe('Helena')
  })

  it('[UNITÁRIO] modelos do evento trazem os sugeridos do tipo e os da assessoria', () => {
    const lista = [
      { id: 'c', tipoEvento: 'Casamento' as const },
      { id: 'q', tipoEvento: 'QuinzeAnos' as const },
      { id: 'proprio', tipoEvento: null },
    ]
    expect(modelosDoTipo(lista, 'QuinzeAnos').map((modelo) => modelo.id)).toEqual(['q', 'proprio'])
    expect(modelosDoTipo(lista, null).map((modelo) => modelo.id)).toEqual(['c', 'q', 'proprio'])
  })

  it('[UNITÁRIO] locais do cronograma público são rotulados pelo tipo', () => {
    const locais = montarLocaisOperacao({ tipo: 'Aniversario', horarioCerimonia: '20:00', localCerimonia: 'Casa Jardim', localRecepcao: 'Bar' })
    expect(locais).toEqual([
      { rotulo: 'Festa', valor: '20:00 · Casa Jardim' },
      { rotulo: 'Outro local', valor: 'Bar' },
    ])
    expect(montarLocaisOperacao({ tipo: 'Casamento', horarioCerimonia: null, localCerimonia: 'Capela', localRecepcao: null })).toEqual([
      { rotulo: 'Cerimônia', valor: 'Capela' },
    ])
  })
})

describe('CabecalhoConvite por tipo', () => {
  it('[COMPONENTE] aniversário não mostra anéis, conector nem texto de casamento', () => {
    const cabecalho = mount(CabecalhoConvite, {
      props: { primeiro: 'Helena Prado', segundo: null, tipo: 'Aniversario', data: '2027-05-11', horario: '20:00', localCerimonia: 'Casa Jardim' },
    })

    expect(cabecalho.find('.cabecalho-convite__aneis').exists()).toBe(false)
    expect(cabecalho.find('.cabecalho-convite__e').exists()).toBe(false)
    expect(cabecalho.text()).toContain('Festa')
    expect(cabecalho.text()).not.toMatch(TERMOS_CASAMENTO)
    cabecalho.unmount()
  })

  it('[COMPONENTE] casamento mantém anéis, conector e rótulos de cerimônia e recepção', () => {
    const cabecalho = mount(CabecalhoConvite, {
      props: { primeiro: 'Ana', segundo: 'Bruno', tipo: 'Casamento', data: '2027-05-11', localCerimonia: 'Capela', localRecepcao: 'Villa' },
    })

    expect(cabecalho.find('.cabecalho-convite__aneis').exists()).toBe(true)
    expect(cabecalho.find('.cabecalho-convite__e').exists()).toBe(true)
    expect(cabecalho.text()).toContain('Cerimônia')
    expect(cabecalho.text()).toContain('Recepção')
    cabecalho.unmount()
  })
})

describe('formulário de evento com tipo', () => {
  it('[COMPONENTE] novo evento começa em Casamento com o seletor focado e dois nomes', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    const casamento = wrapper!.get('[data-teste="tipo-evento-Casamento"]').element as HTMLInputElement
    expect(casamento.checked).toBe(true)
    expect(document.activeElement).toBe(casamento)
    expect(wrapper!.findAll('[data-teste^="tipo-evento-"]')).toHaveLength(4)
    expect(rotulos()).toEqual(expect.arrayContaining([expect.stringContaining('Nome de um dos noivos'), expect.stringContaining('Nome do outro noivo')]))
  })

  it('[INTEGRAÇÃO] 15 anos pede um nome, troca rótulos e envia o tipo sem segundo nome', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', '/api/eventos', () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null }), 201)),
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null }))),
    )
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('[data-teste="tipo-evento-QuinzeAnos"]').setValue(true)
    await flushPromises()

    expect(wrapper!.find('#evento-nomeSegundaPessoa').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="legenda-homenageados"]').text()).toBe('A debutante')
    expect(rotulos()).toEqual(
      expect.arrayContaining([expect.stringContaining('Nome da debutante'), expect.stringContaining('Horário da festa'), expect.stringContaining('Local da festa')]),
    )

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('Júlia Lima')
    await wrapper!.get('#evento-data').setValue('2027-03-06')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', '/api/eventos')
    expect(corpoDaChamada(chamada!)).toMatchObject({ tipo: 'QuinzeAnos', nomePrimeiraPessoa: 'Júlia Lima', nomeSegundaPessoa: null })
  })

  it('[COMPONENTE] comemoração aceita segundo nome opcional', async () => {
    rotearFetch(fetchSimulado, quando('POST', '/api/eventos', () => respostaJson(eventoCompleto({ tipo: 'Comemoracao', nomeSegundaPessoa: null }), 201)))
    const { montagem } = await abrir('/eventos/novo')

    await wrapper!.get('[data-teste="tipo-evento-Comemoracao"]').setValue(true)
    await flushPromises()
    expect(wrapper!.find('#evento-nomeSegundaPessoa').exists()).toBe(true)
    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('Família Souza')
    await wrapper!.get('#evento-data').setValue('2027-08-01')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', '/api/eventos')
    expect(corpoDaChamada(chamada!)).toMatchObject({ tipo: 'Comemoracao', nomePrimeiraPessoa: 'Família Souza', nomeSegundaPessoa: null })
    await aguardarRota(montagem.roteador, 'evento')
  })

  it('[COMPONENTE] casamento sem o segundo nome bloqueia o envio', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('Ana')
    await wrapper!.get('#evento-data').setValue('2027-08-01')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', '/api/eventos')).toHaveLength(0)
    expect(wrapper!.get('#evento-nomeSegundaPessoa').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] edição carrega o tipo salvo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ tipo: 'Aniversario', nomePrimeiraPessoa: 'Helena', nomeSegundaPessoa: null }))),
    )
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    expect((wrapper!.get('[data-teste="tipo-evento-Aniversario"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper!.find('#evento-nomeSegundaPessoa').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="legenda-homenageados"]').text()).toBe('O aniversariante')
  })

  it('[COMPONENTE] erro do servidor no tipo aparece no seletor', async () => {
    rotearFetch(fetchSimulado, quando('POST', '/api/eventos', () => respostaProblema(400, { errors: { Tipo: ['Tipo de evento inválido.'] } })))
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('Ana')
    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#evento-data').setValue('2027-08-01')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-tipo-evento"]').text()).toBe('Tipo de evento inválido.')
  })
})

describe('visão do evento com tipo', () => {
  it('[COMPONENTE] aniversário mostra o tipo, um nome e rótulos da festa', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () =>
        respostaJson(eventoCompleto({ tipo: 'Aniversario', nomePrimeiraPessoa: 'Helena', nomeSegundaPessoa: null, localCerimonia: null })),
      ),
    )
    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.get('[data-teste="tipo-evento"]').text()).toBe('Aniversário')
    expect(wrapper!.get('h1').text()).toBe('Helena')
    expect(wrapper!.text()).toContain('Falta o local da festa.')
    expect(wrapper!.text()).toContain('Local da festa')
    expect(wrapper!.text()).not.toMatch(/cerimônia|recepção/i)
  })
})
