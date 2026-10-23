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
import { listaVinculos, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONTRATACAO_FORNECEDORES, TEXTOS_FORNECEDORES_EVENTO } from '@/textos/fornecedoresEvento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import type { TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { FornecedorEventoDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-fornecedores')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA = `${ROTA_EVENTO}/fornecedores`
const CAMINHO = `/eventos/${ID_EVENTO}/fornecedores`

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

function vinculo(categoria: CategoriaFornecedor, status: StatusFornecedorEvento): FornecedorEventoDto {
  const id = `${categoria}-${status}`
  return vinculoExemplo({
    id,
    status,
    valorContratado: status === 'Contratado' ? 1000 : null,
    fornecedor: { ...vinculoExemplo().fornecedor, id: `f-${id}`, categoria, nomeEmpresa: `Empresa ${categoria}` },
  })
}

const VINCULOS_PADRAO = [vinculo('Buffet', 'Contratado'), vinculo('Fotografia', 'EmNegociacao'), vinculo('Decoracao', 'Cotacao')]

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

async function abrir(tipo: TipoEvento | null, vinculos: FornecedorEventoDto[], sessao: SessaoDto = SESSAO_EXEMPLO) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () =>
      respostaJson({ ...eventoCompleto(), tipo: tipo as TipoEvento }),
    ),
    quando('GET', ROTA, () => respostaJson(listaVinculos(vinculos, { somenteLeitura: sessao !== SESSAO_EXEMPLO }))),
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function situacoes(alvo: VueWrapper) {
  return alvo
    .findAll('[data-teste^="essencial-"]')
    .map((item) => [item.attributes('data-teste')?.replace('essencial-', ''), item.attributes('data-situacao')])
}

describe('FornecedoresEventoView — contratação por tipo de evento', () => {
  it.each([
    ['Casamento', 10, 'um casamento'],
    ['QuinzeAnos', 10, 'uma festa de 15 anos'],
    ['Aniversario', 6, 'um aniversário'],
    ['Comemoracao', 4, 'uma comemoração'],
  ] as const)('[COMPONENTE] %s mostra as essenciais do tipo e a nota com a referência do evento', async (tipo, total, indefinido) => {
    const alvo = await abrir(tipo, VINCULOS_PADRAO)

    const bloco = alvo.get('[data-teste="contratacao-fornecedores"]')
    expect(bloco.element.tagName).toBe('SECTION')
    expect(bloco.get('h2').text()).toBe(TEXTOS_CONTRATACAO_FORNECEDORES.titulo)
    expect(bloco.attributes('aria-labelledby')).toBe(bloco.get('h2').attributes('id'))
    expect(alvo.get('[data-teste="contratacao-contagem"]').text()).toBe(`1 ${TEXTOS_CONTRATACAO_FORNECEDORES.legenda(total)}`)
    expect(alvo.findAll('[data-teste^="essencial-"]')).toHaveLength(total)
    expect(alvo.get('[data-teste="contratacao-nota"]').text()).toBe(TEXTOS_CONTRATACAO_FORNECEDORES.nota(indefinido))
    const categorias = situacoes(alvo).map(([categoria]) => categoria)
    expect([...categorias].sort()).toEqual([...VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais].sort())
    expect(bloco.text().toLocaleLowerCase('pt-BR').includes('casamento')).toBe(tipo === 'Casamento')
  })

  it('[COMPONENTE] lista sem fornecedor primeiro, depois em conversa e contratadas por último, com situação em texto', async () => {
    const alvo = await abrir('Comemoracao', [...VINCULOS_PADRAO, vinculo('EspacoLocal', 'Cancelado')])

    expect(situacoes(alvo)).toEqual([
      ['EspacoLocal', 'SemFornecedor'],
      ['Decoracao', 'Cotacao'],
      ['Fotografia', 'EmNegociacao'],
      ['Buffet', 'Contratado'],
    ])
    const fotografia = alvo.get('[data-teste="essencial-Fotografia"]')
    expect(fotografia.text()).toContain(ROTULOS_CATEGORIA_FORNECEDOR.Fotografia)
    expect(fotografia.text()).toContain(TEXTOS_CONTRATACAO_FORNECEDORES.situacoes.EmNegociacao)
    expect(fotografia.get('.contratacao__marcador').attributes('aria-hidden')).toBe('true')
    expect(alvo.get('[data-teste="contratacao-em-conversa"]').text()).toBe(TEXTOS_CONTRATACAO_FORNECEDORES.emConversa(1, 1))
  })

  it('[COMPONENTE] com todas as essenciais contratadas mostra a frase de conclusão', async () => {
    const alvo = await abrir(
      'Comemoracao',
      VOCABULARIO_TIPO_EVENTO.Comemoracao.fornecedoresEssenciais.map((categoria) => vinculo(categoria, 'Contratado')),
    )

    expect(alvo.get('[data-teste="contratacao-todas"]').text()).toBe(TEXTOS_CONTRATACAO_FORNECEDORES.todas)
    expect(alvo.find('[data-teste="contratacao-contagem"]').exists()).toBe(false)
    expect(alvo.find('[data-teste="contratacao-em-conversa"]').exists()).toBe(false)
  })

  it('[COMPONENTE] o bloco vem depois da lista no DOM e o orçamento antes', async () => {
    const alvo = await abrir('Casamento', VINCULOS_PADRAO)

    const orcamento = alvo.get('[data-teste="lateral-orcamento"]').element
    const lista = alvo.get('[data-teste="lista-vinculos"]').element
    const bloco = alvo.get('[data-teste="contratacao-fornecedores"]').element
    expect(orcamento.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(lista.compareDocumentPosition(bloco) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('[COMPONENTE] estado vazio da assessoria mantém as ações e ensina com as essenciais do tipo', async () => {
    const alvo = await abrir('QuinzeAnos', [])

    expect(alvo.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.vazioTitulo)
    expect(alvo.find('[data-teste="adicionar-fornecedor-vazio"]').exists()).toBe(true)
    expect(alvo.find('[data-teste="importar-fornecedores-vazio"]').exists()).toBe(true)
    expect(alvo.find('.fornecedores-evento__corpo--vazio').exists()).toBe(true)
    const itens = situacoes(alvo)
    expect(itens).toHaveLength(VOCABULARIO_TIPO_EVENTO.QuinzeAnos.fornecedoresEssenciais.length)
    expect(itens.every(([, situacao]) => situacao === 'SemFornecedor')).toBe(true)
    expect(alvo.get('[data-teste="contratacao-contagem"]').text()).toBe(`0 ${TEXTOS_CONTRATACAO_FORNECEDORES.legenda(10)}`)
  })

  it('[COMPONENTE] anfitrião vê o bloco sem ações e sem dados de contato', async () => {
    const alvo = await abrir('Aniversario', VINCULOS_PADRAO, SESSAO_ANFITRIAO)

    const bloco = alvo.get('[data-teste="contratacao-fornecedores"]')
    expect(bloco.findAll('button, a')).toHaveLength(0)
    expect(bloco.text()).not.toMatch(/@|\d{8,}/)
    expect(alvo.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem tipo de evento conhecido o bloco não aparece (nunca supõe casamento)', async () => {
    const alvo = await abrir(null, VINCULOS_PADRAO)

    expect(alvo.find('[data-teste="lista-vinculos"]').exists()).toBe(true)
    expect(alvo.find('[data-teste="contratacao-fornecedores"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] falha ao carregar a lista mostra o erro e não mostra o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson({ ...eventoCompleto(), tipo: 'Casamento' })),
      quando('GET', ROTA, () => respostaProblema(500, { title: 'Erro' })),
    )
    const montagem = await prepararAplicacao(CAMINHO)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroTitulo)
    expect(wrapper.find('[data-teste="contratacao-fornecedores"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão (403) não mostra o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson({ ...eventoCompleto(), tipo: 'Casamento' })),
      quando('GET', ROTA, () => respostaProblema(403, { title: 'Proibido' })),
    )
    const montagem = await prepararAplicacao(CAMINHO)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.semAcesso)
    expect(wrapper.find('[data-teste="contratacao-fornecedores"]').exists()).toBe(false)
  })
})
