import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { grandeDia, itemGrandeDia } from '@/__tests__/auxiliaresGrandeDia'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CADASTRO } from '@/textos/autenticacao'
import { ROTULOS_MODULOS_EVENTO } from '@/textos/rotulos'
import type { SessaoDto } from '@/tipos/api'
import type { TotaisConvidadosDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { GrandeDiaDto } from '@/tipos/grandeDia'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-grande-dia')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_GRANDE_DIA = `${ROTA_EVENTO}/grande-dia`
const ROTA_TOTAIS = `${ROTA_EVENTO}/convites/totais`
const CAMINHO = `/eventos/${ID_EVENTO}/grande-dia`

const SESSAO_ANFITRIAO: SessaoDto = {
  tokenAcesso: 'token-anfitriao',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-anfitriao',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Anfitriao',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    eventoId: ID_EVENTO,
  },
}

const TOTAIS: TotaisConvidadosDto = {
  convites: 70,
  pessoas: 158,
  adultos: 134,
  criancas: 24,
  acompanhantesPermitidos: 0,
  pendentes: { total: 8, adultos: 6, criancas: 2 },
  confirmados: { total: 142, adultos: 120, criancas: 22 },
  recusados: { total: 8, adultos: 8, criancas: 0 },
}

const foto = { nomeEmpresa: 'Lume Fotografia', categoria: 'Fotografia', contato: 'Bruno', telefone: '11912345678' }
const dj = { nomeEmpresa: 'DJ Noite Clara', categoria: 'Musica', contato: null, telefone: null }

const ESPERADO: Record<TipoEvento, { rotulo: string; antes: string; depois: string; comeca: string; comecou: string }> = {
  Casamento: {
    rotulo: 'Hora da cerimônia',
    antes: 'O casamento ainda não chegou',
    depois: 'O casamento já passou',
    comeca: 'A cerimônia começa em 1 h 20, às 16:30',
    comecou: 'A cerimônia começou às 16:30',
  },
  QuinzeAnos: {
    rotulo: 'Hora da festa',
    antes: 'A festa de 15 anos ainda não chegou',
    depois: 'A festa de 15 anos já passou',
    comeca: 'A festa começa em 1 h 20, às 16:30',
    comecou: 'A festa começou às 16:30',
  },
  Aniversario: {
    rotulo: 'Hora da festa',
    antes: 'O aniversário ainda não chegou',
    depois: 'O aniversário já passou',
    comeca: 'A festa começa em 1 h 20, às 16:30',
    comecou: 'A festa começou às 16:30',
  },
  Comemoracao: {
    rotulo: 'Hora do evento',
    antes: 'A comemoração ainda não chegou',
    depois: 'A comemoração já passou',
    comeca: 'O evento começa em 1 h 20, às 16:30',
    comecou: 'O evento começou às 16:30',
  },
}

const TIPOS = Object.keys(ESPERADO) as TipoEvento[]

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

function rotear(fetch: Mock<typeof globalThis.fetch>, sessao: SessaoDto, ...rotas: Rota[]) {
  fetch.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(sessao)
    }
    for (const rota of rotas) {
      const resposta = rota(url, init)
      if (resposta) {
        return resposta
      }
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

async function abrir(dados: GrandeDiaDto, opcoes: { sessao?: SessaoDto; totais?: () => Response } = {}) {
  rotear(
    fetchSimulado,
    opcoes.sessao ?? SESSAO_EXEMPLO,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_GRANDE_DIA, () => respostaJson(dados)),
    quando('GET', ROTA_TOTAIS, opcoes.totais ?? (() => respostaJson(TOTAIS))),
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function textoPagina(): string {
  return wrapper!.get('[data-teste="grande-dia"]').text()
}

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

describe('GrandeDiaView — tipos de evento', () => {
  it.each(TIPOS)('[COMPONENTE] %s: nomeia o momento principal no cartão Agora e diz quando começou', async (tipo) => {
    const base = grandeDia({ tipo })
    await abrir({ ...base, itens: base.itens.map((item) => ({ ...item, atividade: item.atividade === 'Cerimônia' ? 'Momento principal' : item.atividade })) })

    expect(wrapper!.get('[data-teste="cartao-agora-momento"]').text()).toBe(ESPERADO[tipo].rotulo)
    expect(wrapper!.get('[data-teste="grande-dia-momento"]').text()).toBe(ESPERADO[tipo].comecou)
    expect(tipo === 'Casamento' || !/cerimônia/i.test(textoPagina())).toBe(true)
  })

  it.each(TIPOS)('[COMPONENTE] %s: antes do horário principal diz quanto falta', async (tipo) => {
    await abrir(grandeDia({ tipo, momento: { agora: '2027-05-15T15:10:00', fase: 'NoDia', diasParaOEvento: 0 } }))

    expect(wrapper!.get('[data-teste="grande-dia-momento"]').text()).toBe(ESPERADO[tipo].comeca)
  })

  it.each(TIPOS)('[COMPONENTE] %s: antes do dia cita o evento pelo tipo e marca o horário principal no roteiro', async (tipo) => {
    await abrir(
      grandeDia({
        tipo,
        momento: { agora: '2027-05-03T10:00:00', fase: 'AntesDoDia', diasParaOEvento: 12 },
        itens: [itemGrandeDia({ id: 'c', situacao: 'Depois', atividade: 'Momento principal' })],
      }),
    )

    expect(wrapper!.get('[data-teste="faixa-fase-dia-titulo"]').text()).toBe(ESPERADO[tipo].antes)
    expect(wrapper!.get('[data-teste="item-roteiro-momento"]').text()).toBe(ESPERADO[tipo].rotulo)
    expect(wrapper!.find('[data-teste="grande-dia-momento"]').exists()).toBe(false)
  })

  it.each(TIPOS)('[COMPONENTE] %s: depois do dia diz que o evento já passou', async (tipo) => {
    await abrir(
      grandeDia({
        tipo,
        momento: { agora: '2027-05-18T09:00:00', fase: 'DepoisDoDia', diasParaOEvento: -3 },
        itens: [itemGrandeDia({ status: 'Concluido', situacao: 'Feito', concluidoEm: '2027-05-15T20:00:00Z' })],
      }),
    )

    expect(wrapper!.get('[data-teste="faixa-fase-dia-titulo"]').text()).toBe(ESPERADO[tipo].depois)
  })

  it('[COMPONENTE] sem horário principal não mostra a frase nem o rótulo do momento', async () => {
    await abrir(grandeDia({ tipo: 'Aniversario', horarioCerimonia: null }))

    expect(wrapper!.find('[data-teste="grande-dia-momento"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="cartao-agora-momento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] o nome do modo é Grande Dia também na tela de cadastro', () => {
    expect(ROTULOS_MODULOS_EVENTO.grandeDia).toBe('Grande Dia')
    expect(TEXTOS_CADASTRO.recursoDiaTitulo).toBe(ROTULOS_MODULOS_EVENTO.grandeDia)
  })
})

describe('GrandeDiaView — contatos e convidados', () => {
  const comFornecedores = () =>
    grandeDia({
      tipo: 'QuinzeAnos',
      itens: [
        itemGrandeDia({ id: 'c' }),
        itemGrandeDia({ id: 'mk', inicio: '16:00', termino: '17:00', atividade: 'Ensaio fotográfico', fornecedor: foto, situacao: 'Agora' }),
        itemGrandeDia({ id: 'f', inicio: '17:15', termino: '18:00', atividade: 'Fotos com a família', fornecedor: foto, situacao: 'Proximo' }),
        itemGrandeDia({ id: 'v', inicio: '20:00', termino: null, atividade: 'Valsa', fornecedor: dj, situacao: 'Depois' }),
      ],
    })

  it('[COMPONENTE] contatos do momento trazem o fornecedor em andamento sem repetir o do cartão Agora', async () => {
    await abrir(comFornecedores())

    const contatos = wrapper!.get('[data-teste="grande-dia-contatos-momento"]')
    const nomes = contatos.findAll('[data-teste="fornecedor-dia"]').map((linha) => linha.find('.fornecedores-dia__nome span').text())
    expect(nomes).toEqual(['Lume Fotografia'])
    expect(contatos.get('[data-teste="contato-ligar"]').attributes('href')).toContain('11912345678')
    expect(contatos.text()).not.toContain('Coral Harmonia')
  })

  it('[COMPONENTE] a lista completa de fornecedores fica recolhida e ensina quando falta telefone', async () => {
    await abrir(comFornecedores())

    const lista = wrapper!.get('[data-teste="grande-dia-fornecedores"]')
    expect(lista.element.tagName).toBe('DETAILS')
    expect(lista.get('summary').text()).toBe('Fornecedores do dia (3)')
    expect(lista.get('[data-teste="fornecedor-dia-sem-telefone"]').text()).toBe('Sem telefone no cadastro')
  })

  it('[SEGURANÇA] nenhum telefone aparece como texto na página', async () => {
    await abrir(comFornecedores())

    expect(textoPagina()).not.toContain('11912345678')
    expect(textoPagina()).not.toContain('11987654321')
  })

  it('[COMPONENTE] mostra as pessoas confirmadas e quantas ainda não responderam', async () => {
    await abrir(comFornecedores())

    const bloco = wrapper!.get('[data-teste="grande-dia-convidados"]')
    expect(bloco.get('[data-teste="grande-dia-confirmados"]').text()).toBe('142 pessoas confirmadas')
    expect(bloco.text()).toContain('120 adultos e 22 crianças')
    expect(bloco.text()).toContain('8 ainda sem resposta')
    expect(fetchSimulado.mock.calls.filter(([url]) => String(url) === ROTA_TOTAIS)).toHaveLength(1)
  })

  it('[COMPONENTE] falha nos totais esconde só o bloco de convidados', async () => {
    await abrir(comFornecedores(), { totais: () => respostaProblema(500, { title: 'Erro.' }) })

    expect(wrapper!.find('[data-teste="grande-dia-convidados"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="cartao-agora"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="grande-dia-contatos-momento"]').exists()).toBe(true)
  })

  it('[COMPONENTE] lista sem convidados não mostra o bloco', async () => {
    await abrir(comFornecedores(), { totais: () => respostaJson({ ...TOTAIS, pessoas: 0 }) })

    expect(wrapper!.find('[data-teste="grande-dia-convidados"]').exists()).toBe(false)
  })

  it('[COMPONENTE] antes do dia a lateral fica ao lado do roteiro com fornecedores abertos e convidados', async () => {
    await abrir(
      grandeDia({
        tipo: 'Comemoracao',
        momento: { agora: '2027-05-03T10:00:00', fase: 'AntesDoDia', diasParaOEvento: 12 },
        itens: [itemGrandeDia({ id: 'c', situacao: 'Depois' }), itemGrandeDia({ id: 'v', inicio: '20:00', fornecedor: dj, situacao: 'Depois' })],
      }),
    )

    const envelope = wrapper!.get('[data-teste="grande-dia"]')
    expect(envelope.classes()).toContain('grande-dia--com-lateral')
    const lateral = envelope.get('[data-teste="grande-dia-lateral"]')
    expect(lateral.get('[data-teste="grande-dia-fornecedores"]').element.tagName).toBe('SECTION')
    expect(lateral.find('[data-teste="grande-dia-convidados"]').exists()).toBe(true)
    expect(lateral.find('[data-teste="grande-dia-contatos-momento"]').exists()).toBe(false)
    expect(lateral.find('[data-teste="fornecedor-dia-situacao"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] anfitrião vê contatos e convidados, sem botões de marcar', async () => {
    await abrir(grandeDia({ ...comFornecedores(), somenteLeitura: true }), { sessao: SESSAO_ANFITRIAO })

    expect(wrapper!.find('[data-teste="grande-dia-contatos-momento"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="grande-dia-convidados"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="grande-dia-marcar-feito"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grande-dia-feito-paralelo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] Atualizar recarrega também os totais de convidados', async () => {
    await abrir(comFornecedores())

    await wrapper!.get('[data-teste="grande-dia-atualizar"]').trigger('click')
    await flushPromises()

    expect(fetchSimulado.mock.calls.filter(([url]) => String(url) === ROTA_TOTAIS)).toHaveLength(2)
  })
})
