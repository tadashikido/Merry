import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Select from 'primevue/select'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_ACOMPANHAMENTO_CONVITES, TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TIPO_EVENTO_NEUTRO, VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import type { ConvidadoDto, ConviteDto, ListaConvitesDto, RespostaRsvp, StatusEnvioConvite } from '@/tipos/convidados'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-convidados')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`

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

let sequencia = 0

function pessoa(resposta: RespostaRsvp): ConvidadoDto {
  sequencia += 1
  return {
    id: `p${sequencia}`,
    nome: `Pessoa ${sequencia}`,
    telefone: '11987654321',
    email: `pessoa${sequencia}@exemplo.com`,
    faixaEtaria: 'Adulto',
    resposta,
    acompanhante: false,
    possuiRestricao: false,
  }
}

function convite(nome: string, grupo: string | null, statusEnvio: StatusEnvioConvite, respostas: RespostaRsvp[]): ConviteDto {
  sequencia += 1
  return {
    id: `33333333-3333-4333-8333-${String(sequencia).padStart(12, '0')}`,
    nome,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio,
    convidados: respostas.map(pessoa),
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

function listaComConvites(): ListaConvitesDto {
  const convites = [
    convite('Família Souza', 'Família', 'Visualizado', ['Confirmado', 'Pendente']),
    convite('Tia Lúcia', 'Família', 'Enviado', ['Pendente']),
    convite('Ana e Rui', 'Padrinhos', 'NaoEnviado', ['Pendente', 'Pendente']),
    convite('Joana', 'Padrinhos', 'NaoEnviado', ['Pendente']),
    convite('Vizinhos', null, 'Visualizado', ['Confirmado', 'Recusado']),
  ]
  return {
    convites,
    totais: {
      convites: 5,
      pessoas: 8,
      adultos: 8,
      criancas: 0,
      acompanhantesPermitidos: 0,
      confirmados: { adultos: 2, criancas: 0, total: 2 },
      pendentes: { adultos: 5, criancas: 0, total: 5 },
      recusados: { adultos: 1, criancas: 0, total: 1 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
  }
}

function listaVazia(): ListaConvitesDto {
  return {
    ...listaComConvites(),
    convites: [],
    totais: {
      convites: 0,
      pessoas: 0,
      adultos: 0,
      criancas: 0,
      acompanhantesPermitidos: 0,
      confirmados: { adultos: 0, criancas: 0, total: 0 },
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
  }
}

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
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

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  sequencia = 0
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
  vi.unstubAllGlobals()
})

async function abrir(opcoes: {
  tipo?: string
  lista?: () => Response
  sessao?: SessaoDto
  evento?: Parameters<typeof eventoCompleto>[0]
} = {}) {
  const tipo = (opcoes.tipo ?? 'Casamento') as TipoEvento
  rotear(
    fetchSimulado,
    opcoes.sessao ?? SESSAO_EXEMPLO,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo, ...opcoes.evento }))),
    quando('GET', ROTA_CONVITES, opcoes.lista ?? (() => respostaJson(listaComConvites()))),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/convidados`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function estiloDe(caminho: string): string {
  const fonte = readFileSync(resolve(__dirname, caminho), 'utf-8')
  return fonte.slice(fonte.indexOf('<style scoped>'))
}

describe('ConvidadosView — evolução para eventos', { timeout: 20_000 }, () => {
  it('[COMPONENTE] bloco "Envio e respostas" conta convites a enviar, aguardando e respondidos', async () => {
    const tela = await abrir()

    const bloco = tela.get('[data-teste="acompanhamento-convites"]')
    expect(bloco.element.tagName).toBe('SECTION')
    const titulo = bloco.get('h2')
    expect(titulo.text()).toBe(TEXTOS_ACOMPANHAMENTO_CONVITES.titulo)
    expect(bloco.attributes('aria-labelledby')).toBe(titulo.attributes('id'))

    expect(bloco.get('[data-teste="acompanhamento-a-enviar"]').text()).toContain('2 convites a enviar')
    expect(bloco.get('[data-teste="acompanhamento-aguardando"]').text()).toContain('2 convites aguardando resposta')
    expect(bloco.get('[data-teste="acompanhamento-respondidos"]').text()).toContain('1 convite respondido')
  })

  it('[COMPONENTE] prazo de respostas usa a data limite do evento sem relógio do navegador', async () => {
    const tela = await abrir()
    const prazo = tela.get('[data-teste="acompanhamento-prazo"]').text()
    expect(prazo).toContain('Respostas até 5 de mai')
    expect(prazo).toContain('faltam 32 dias')

    wrapper?.unmount()
    const encerrada = await abrir({ evento: { diasRestantes: 5 } })
    expect(encerrada.get('[data-teste="acompanhamento-prazo"]').text()).toContain('Prazo encerrado em 5 de mai')
  })

  it('[INTEGRAÇÃO] "Ver quem não respondeu" filtra pendentes num toque, sem nova requisição', async () => {
    const tela = await abrir()
    const antes = chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length

    const botao = tela.get('[data-teste="ver-pendentes"]')
    expect(botao.text()).toBe(TEXTOS_ACOMPANHAMENTO_CONVITES.verPendentes(5))
    await botao.trigger('click')
    await flushPromises()

    expect(tela.get('[data-teste="contador-resultados"]').text()).toBe(TEXTOS_CONVIDADOS.resultados(4))
    expect(tela.text()).not.toContain('Vizinhos')
    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length).toBe(antes)
  })

  it('[INTEGRAÇÃO] grupo sem nenhum convite enviado vira atalho para o filtro de grupo', async () => {
    const tela = await abrir()

    const grupos = tela.findAll('[data-teste="grupo-sem-envio"]')
    expect(grupos.map((grupo) => grupo.text())).toEqual(['Padrinhos'])
    expect(grupos[0]!.attributes('aria-label')).toBe(TEXTOS_ACOMPANHAMENTO_CONVITES.filtrarGrupo('Padrinhos'))

    await grupos[0]!.trigger('click')
    await flushPromises()

    expect(tela.get('[data-teste="contador-resultados"]').text()).toBe(TEXTOS_CONVIDADOS.resultados(2))
    expect(tela.findComponent(Select).props('modelValue')).toBe('padrinhos')
  })

  it('[COMPONENTE] filtro de grupo mostra a quantidade de convites de cada grupo', async () => {
    const tela = await abrir()

    const opcoes = tela.findComponent(Select).props('options') as { chave: string; rotulo: string }[]
    expect(opcoes.map((opcao) => opcao.rotulo)).toEqual([
      TEXTOS_CONVIDADOS.todosGrupos,
      'Família (2)',
      'Padrinhos (2)',
      `${TEXTOS_CONVIDADOS.semGrupo} (1)`,
    ])
  })

  it('[COMPONENTE] tudo respondido troca o atalho de pendentes por uma frase de conclusão', async () => {
    const lista = listaComConvites()
    const respondida: ListaConvitesDto = {
      ...lista,
      convites: [convite('Família Souza', 'Família', 'Visualizado', ['Confirmado'])],
      totais: { ...lista.totais, convites: 1, pessoas: 1, pendentes: { adultos: 0, criancas: 0, total: 0 } },
    }
    const tela = await abrir({ lista: () => respostaJson(respondida) })

    expect(tela.find('[data-teste="acompanhamento-todos-respondidos"]').text()).toBe(TEXTOS_ACOMPANHAMENTO_CONVITES.todosRespondidos)
    expect(tela.find('[data-teste="ver-pendentes"]').exists()).toBe(false)
    expect(tela.find('[data-teste="grupos-sem-envio"]').exists()).toBe(false)
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] orientação de grupos e vazio variam pelo tipo %s', async (tipo) => {
    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]
    const tela = await abrir({ tipo })

    expect(tela.get('[data-teste="acompanhamento-orientacao"]').text()).toBe(
      TEXTOS_ACOMPANHAMENTO_CONVITES.orientacaoGrupos(vocabulario.gruposConvidados),
    )

    wrapper?.unmount()
    const vazia = await abrir({ tipo, lista: () => respostaJson(listaVazia()) })
    const texto = vazia.text()
    expect(texto).toContain(TEXTOS_CONVIDADOS.vazioTextoPara(vocabulario.referencia.artigo, vocabulario.gruposConvidados))
    expect(vazia.find('[data-teste="acompanhamento-convites"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cada tipo sugere grupos próprios: padrinhos no casamento, corte na festa de 15 anos', async () => {
    const casamento = await abrir({ tipo: 'Casamento', lista: () => respostaJson(listaVazia()) })
    expect(casamento.text()).toContain('Para o casamento')
    expect(casamento.text()).toContain('Padrinhos')

    wrapper?.unmount()
    const quinze = await abrir({ tipo: 'QuinzeAnos', lista: () => respostaJson(listaVazia()) })
    expect(quinze.text()).toContain('Para a festa de 15 anos')
    expect(quinze.text()).toContain('Corte')
    expect(quinze.text()).not.toContain('Padrinhos')
  })

  it('[COMPONENTE] tipo desconhecido usa referência neutra e nunca cai em casamento', async () => {
    const tela = await abrir({ tipo: 'Corporativo', lista: () => respostaJson(listaVazia()) })
    const neutro = VOCABULARIO_TIPO_EVENTO[TIPO_EVENTO_NEUTRO]

    const texto = tela.text()
    expect(texto).toContain(TEXTOS_CONVIDADOS.vazioTextoPara('o evento', neutro.gruposConvidados))
    expect(texto.toLowerCase()).not.toContain('casamento')
    expect(texto).not.toContain('Padrinhos')

    wrapper?.unmount()
    const comConvites = await abrir({ tipo: 'Corporativo' })
    expect(comConvites.get('[data-teste="acompanhamento-orientacao"]').text()).toBe(
      TEXTOS_ACOMPANHAMENTO_CONVITES.orientacaoGrupos(neutro.gruposConvidados),
    )
  })

  it('[SEGURANÇA] bloco novo não mostra telefone nem e-mail e vale igual para o anfitrião', async () => {
    const tela = await abrir({ sessao: SESSAO_ANFITRIAO })

    const bloco = tela.get('[data-teste="acompanhamento-convites"]')
    expect(bloco.html()).not.toContain('98765')
    expect(bloco.html()).not.toContain('@exemplo.com')
    expect(tela.find('[data-teste="abrir-restricoes"]').exists()).toBe(false)
    expect(document.title).not.toContain('@')
  })

  it('[COMPONENTE] falha de rede esconde o bloco junto com a faixa de visão', async () => {
    const tela = await abrir({ lista: () => respostaProblema(500) })

    expect(tela.text()).toContain(TEXTOS_CONVIDADOS.erroCarregar)
    expect(tela.find('[data-teste="acompanhamento-convites"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão (403) não monta o bloco', async () => {
    const tela = await abrir({ lista: () => respostaProblema(403) })

    expect(tela.text()).toContain(TEXTOS_CONVIDADOS.semAcesso)
    expect(tela.find('[data-teste="acompanhamento-convites"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] bloco ajusta colunas e nota só por @container, sem @media nem sticky', () => {
    const estilo = estiloDe('../../../componentes/convidados/AcompanhamentoConvites.vue')
    expect(estilo).toMatch(/\.acompanhamento \{\s*container: acompanhamento \/ inline-size;/)
    expect(estilo).toMatch(/@container acompanhamento \(min-width: 36rem\) \{\s*\.acompanhamento__corpo \{\s*grid-template-columns:/)
    expect(estilo).toMatch(/@container acompanhamento \(max-width: 29\.99rem\) \{\s*\.acompanhamento__orientacao \{\s*display: none;/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)

    const view = estiloDe('../ConvidadosView.vue')
    expect(view).not.toMatch(/@media/)
    expect(view).not.toContain('sticky')
  })
})
