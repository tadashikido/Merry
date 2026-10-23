import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
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
import { listaTarefas, tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import type { ItemModeloChecklistDto, ModeloChecklistDto, ModeloChecklistResumoDto } from '@/tipos/checklist'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { ListaTarefasDto } from '@/tipos/tarefas'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-tarefas', 'evento-checklist')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_TAREFAS = `${ROTA_EVENTO}/tarefas`
const ROTA_MODELOS = '/api/modelos-checklist'

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

const ID_MODELO: Record<TipoEvento, string> = {
  Casamento: 'mc000000-0000-4000-8000-000000000001',
  QuinzeAnos: 'mc000000-0000-4000-8000-000000000002',
  Aniversario: 'mc000000-0000-4000-8000-000000000003',
  Comemoracao: 'mc000000-0000-4000-8000-000000000004',
}
const ID_PROPRIO = 'mc000000-0000-4000-8000-000000000009'

const NOME_MODELO: Record<TipoEvento, string> = {
  Casamento: 'Casamento completo',
  QuinzeAnos: 'Festa de 15 anos essencial',
  Aniversario: 'Aniversário em casa',
  Comemoracao: 'Bodas e encontros',
}

function resumoModelo(dados: Partial<ModeloChecklistResumoDto>): ModeloChecklistResumoDto {
  return {
    tipoEvento: null,
    id: ID_PROPRIO,
    nome: 'Modelo da casa',
    descricao: null,
    sugerido: false,
    quantidadeItens: 3,
    atualizadoEm: '2026-09-01T12:00:00Z',
    ...dados,
  }
}

function item(id: string, titulo: string, diasAntesDoEvento: number): ItemModeloChecklistDto {
  return { id, titulo, descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento }
}

function modeloCompleto(id: string, nome: string, tipoEvento: TipoEvento | null, itens: ItemModeloChecklistDto[]): ModeloChecklistDto {
  return {
    tipoEvento,
    id,
    nome,
    descricao: null,
    sugerido: tipoEvento !== null,
    itens,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
  }
}

const ITENS_PADRAO = [
  item('i1', 'Fechar fotógrafo', 300),
  item('i2', 'Reservar o local', 360),
  item('i3', 'Enviar convites', 60),
  item('i4', 'Prova de roupa', 30),
  item('i5', 'Confirmar buffet', 15),
  item('i6', 'Montar playlist', 90),
]

function listaModelos(): ModeloChecklistResumoDto[] {
  return [
    resumoModelo({ id: ID_PROPRIO }),
    ...TIPOS_EVENTO.map((tipo) =>
      resumoModelo({ id: ID_MODELO[tipo], nome: NOME_MODELO[tipo], tipoEvento: tipo, sugerido: true, quantidadeItens: ITENS_PADRAO.length }),
    ),
  ]
}

function rotasModelos(): Rota[] {
  return [
    quando('GET', ROTA_MODELOS, () => respostaJson(listaModelos())),
    ...TIPOS_EVENTO.map((tipo) =>
      quando('GET', `${ROTA_MODELOS}/${ID_MODELO[tipo]}`, () => respostaJson(modeloCompleto(ID_MODELO[tipo], NOME_MODELO[tipo], tipo, ITENS_PADRAO))),
    ),
  ]
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

const AVULSA = tarefaExemplo({ id: 'v', titulo: 'Visitar o salão', prazo: null, diasParaPrazo: null })
const DO_MODELO = tarefaExemplo({ id: 'm', titulo: 'Reservar o local', geradaDeModelo: true, prazo: null, diasParaPrazo: null })

function chamadasModelos(fetchSimulado: Mock<typeof fetch>) {
  return fetchSimulado.mock.calls.filter(([entrada]) => String(entrada).startsWith(ROTA_MODELOS))
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

async function abrir() {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/tarefas`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('TarefasView — tarefas típicas por tipo de evento', () => {
  it.each(TIPOS_EVENTO)('[COMPONENTE] %s sem tarefas: vazio cita o evento pelo tipo e sugere o modelo do tipo', async (tipo) => {
    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo, nomeSegundaPessoa: tipo === 'Casamento' ? 'Bruno' : null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([]))),
      ...rotasModelos(),
    )

    const tela = await abrir()

    expect(tela.text()).toContain(`Registre o que falta fazer para ${vocabulario.referencia.artigo}.`)
    expect(tela.find('[data-teste="nova-tarefa-vazio"]').exists()).toBe(true)
    const sugestao = tela.get('[data-teste="sugestao-tarefas-modelo"]')
    expect(sugestao.get('h2').text()).toBe(TEXTOS_TAREFAS.sugestaoTitulo)
    expect(sugestao.text()).toContain(`O modelo sugerido para ${vocabulario.referencia.indefinido}`)
    expect(sugestao.get('[data-teste="sugestao-modelo-nome"]').text()).toBe(NOME_MODELO[tipo])
    for (const outro of TIPOS_EVENTO.filter((valor) => valor !== tipo)) {
      expect(sugestao.text()).not.toContain(NOME_MODELO[outro])
    }
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_MODELOS}/${ID_MODELO[tipo]}`)).toHaveLength(1)
    const mencionaCasamento = tela.get('main').text().toLocaleLowerCase('pt-BR').includes('casamento')
    expect(mencionaCasamento).toBe(tipo === 'Casamento')
  })

  it('[COMPONENTE] com tarefas avulsas, a sugestão fica na lateral após o progresso com 4 exemplos, restante e link para o checklist', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'Aniversario', nomeSegundaPessoa: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA]))),
      ...rotasModelos(),
    )

    const tela = await abrir()

    const lateral = tela.get('[data-teste="lateral-tarefas"]')
    const sugestao = lateral.get('[data-teste="sugestao-tarefas-modelo"]')
    const html = lateral.html()
    expect(html.indexOf('data-teste="progresso-tarefas"')).toBeLessThan(html.indexOf('data-teste="sugestao-tarefas-modelo"'))
    expect(sugestao.attributes('aria-labelledby')).toBe('titulo-sugestao-tarefas')
    expect(sugestao.get('[data-teste="sugestao-modelo-quantidade"]').text()).toBe('6 tarefas')
    expect(sugestao.findAll('[data-teste="sugestao-item"]').map((linha) => linha.text())).toEqual([
      'Reservar o local',
      'Fechar fotógrafo',
      'Montar playlist',
      'Enviar convites',
    ])
    expect(sugestao.get('ul').attributes('aria-label')).toBe(TEXTOS_TAREFAS.sugestaoListaRotulo)
    expect(sugestao.get('[data-teste="sugestao-mais"]').text()).toBe('e mais 2')
    const link = sugestao.get('[data-teste="sugestao-aplicar"]')
    expect(link.text()).toBe(TEXTOS_TAREFAS.sugestaoAplicar)
    expect(link.attributes('href')).toBe(`/eventos/${ID_EVENTO}/checklist`)
  })

  it('[COMPONENTE] sem modelo do tipo usa o modelo próprio da assessoria; sem nenhum modelo, nada aparece', async () => {
    const proprio = modeloCompleto(ID_PROPRIO, 'Modelo da casa', null, [item('p1', 'Reunião inicial', 200)])
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ id: ID_MODELO.Casamento, tipoEvento: 'Casamento', sugerido: true }), resumoModelo({ id: ID_PROPRIO })])),
      quando('GET', `${ROTA_MODELOS}/${ID_PROPRIO}`, () => respostaJson(proprio)),
    )

    const tela = await abrir()

    const sugestao = tela.get('[data-teste="sugestao-tarefas-modelo"]')
    expect(sugestao.get('[data-teste="sugestao-modelo-nome"]').text()).toBe('Modelo da casa')
    expect(sugestao.get('[data-teste="sugestao-modelo-quantidade"]').text()).toBe('1 tarefa')
    expect(sugestao.find('[data-teste="sugestao-mais"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_MODELOS}/${ID_MODELO.Casamento}`)).toHaveLength(0)

    wrapper?.unmount()
    wrapper = undefined
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ id: ID_MODELO.Casamento, tipoEvento: 'Casamento', sugerido: true })])),
    )
    const semModelo = await abrir()
    expect(semModelo.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(semModelo.find('[data-teste="progresso-tarefas"]').exists()).toBe(true)
  })

  it('[COMPONENTE] checklist já aplicado: sem sugestão e sem consultar modelos', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA, DO_MODELO]))),
      ...rotasModelos(),
    )

    const tela = await abrir()

    expect(tela.find('[data-teste="lateral-tarefas"]').exists()).toBe(true)
    expect(tela.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(chamadasModelos(fetchSimulado)).toHaveLength(0)
  })

  it('[COMPONENTE] erro ao listar ou ao abrir o modelo esconde a sugestão sem afetar a lista', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA]))),
      quando('GET', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro interno.' })),
    )
    const comErroLista = await abrir()
    expect(comErroLista.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(comErroLista.findAll('[data-teste="titulo-tarefa"]').map((linha) => linha.text())).toEqual(['Visitar o salão'])

    wrapper?.unmount()
    wrapper = undefined
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([AVULSA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson(listaModelos())),
      quando('GET', `${ROTA_MODELOS}/${ID_MODELO.Casamento}`, () => respostaProblema(404, { title: 'Recurso não encontrado.' })),
    )
    const comErroDetalhe = await abrir()
    expect(comErroDetalhe.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(comErroDetalhe.find('[data-teste="progresso-tarefas"]').exists()).toBe(true)
  })
})

describe('TarefasView — sugestão restrita à assessoria em evento ativo', () => {
  it('[SEGURANÇA] anfitrião não vê a sugestão e a tela não consulta modelos de checklist', async () => {
    const lista: ListaTarefasDto = listaTarefas([tarefaExemplo({ id: 'x', responsavel: 'Anfitriao' })], { somenteDoAnfitriao: true })
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(lista)),
      ...rotasModelos(),
    )

    const tela = await abrir()

    expect(tela.get('h1').text()).toBe(TEXTOS_TAREFAS.tituloAnfitriao)
    expect(tela.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(chamadasModelos(fetchSimulado)).toHaveLength(0)
  })

  it('[SEGURANÇA] anfitrião sem tarefas vê o vazio próprio, sem sugestão', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([], { somenteDoAnfitriao: true }))),
      ...rotasModelos(),
    )

    const tela = await abrir()

    expect(tela.text()).toContain(TEXTOS_TAREFAS.vazioAnfitriaoTexto)
    expect(tela.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(chamadasModelos(fetchSimulado)).toHaveLength(0)
  })

  it('[COMPONENTE] evento arquivado não sugere modelo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true, arquivadoEm: '2026-09-30T12:00:00Z' }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([], { eventoArquivado: true }))),
      ...rotasModelos(),
    )

    const tela = await abrir()

    expect(tela.find('[data-teste="aviso-arquivado"]').exists()).toBe(true)
    expect(tela.find('[data-teste="sugestao-tarefas-modelo"]').exists()).toBe(false)
    expect(chamadasModelos(fetchSimulado)).toHaveLength(0)
  })
})

describe('SugestaoTarefasModelo — estilos', () => {
  it('[UNITÁRIO] usa só tokens da fundação e nenhum @media de largura', () => {
    const fonte = readFileSync(resolve(__dirname, '../../../componentes/tarefas/SugestaoTarefasModelo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estilo).not.toMatch(/@media \((min|max)-width/)
    expect(estilo).toMatch(/var\(--p-ritmo-grupo\)/)
    expect(fonte).not.toMatch(/v-html/)
  })
})
