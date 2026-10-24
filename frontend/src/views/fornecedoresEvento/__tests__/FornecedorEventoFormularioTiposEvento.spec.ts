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
import { aguardarAte, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { ID_FORNECEDOR, resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { ID_VINCULO, listaVinculos, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FORNECEDORES_EVENTO, TEXTOS_HISTORICO_FORNECEDOR_EVENTO } from '@/textos/fornecedoresEvento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { FornecedorEventoDto, ParticipacaoFornecedorDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('fornecedor-evento-novo', 'fornecedor-evento-editar', 'evento-fornecedores')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA = `${ROTA_EVENTO}/fornecedores`
const ID_FLORISTA = '44444444-4444-4444-8444-444444444444'
const ROTA_HISTORICO_FLORISTA = `/api/fornecedores/${ID_FLORISTA}/eventos`
const ROTA_HISTORICO_VINCULO = `/api/fornecedores/${ID_FORNECEDOR}/eventos`

function vinculo(categoria: CategoriaFornecedor, status: StatusFornecedorEvento): FornecedorEventoDto {
  const id = `${categoria}-${status}`
  return vinculoExemplo({
    id,
    status,
    valorContratado: status === 'Contratado' ? 1000 : null,
    fornecedor: { ...vinculoExemplo().fornecedor, id: `f-${id}`, categoria, nomeEmpresa: `Empresa ${categoria}` },
  })
}

const VINCULOS = [vinculo('Buffet', 'Contratado'), vinculo('Fotografia', 'EmNegociacao')]

function participacao(dados: Partial<ParticipacaoFornecedorDto>): ParticipacaoFornecedorDto {
  return {
    eventoId: 'e-1',
    nomePrimeiraPessoa: 'Beatriz',
    nomeSegundaPessoa: 'Caio',
    dataEvento: '2026-12-12',
    eventoArquivado: false,
    status: 'Contratado',
    ...dados,
  }
}

const PARTICIPACOES: ParticipacaoFornecedorDto[] = [
  participacao({ eventoId: 'e-1' }),
  participacao({ eventoId: ID_EVENTO, nomePrimeiraPessoa: 'Atual', nomeSegundaPessoa: null, status: 'Cotacao' }),
  participacao({ eventoId: 'e-2', nomePrimeiraPessoa: 'Marina', nomeSegundaPessoa: null, dataEvento: '2026-03-03', status: 'Cotacao' }),
  participacao({ eventoId: 'e-3', nomePrimeiraPessoa: 'Lu', nomeSegundaPessoa: 'Rafa', dataEvento: '2025-09-20', eventoArquivado: true }),
  participacao({ eventoId: 'e-4', nomePrimeiraPessoa: 'Helena', nomeSegundaPessoa: null, dataEvento: '2025-04-10', status: 'Cancelado' }),
  participacao({ eventoId: 'e-5', nomePrimeiraPessoa: 'Otávio', nomeSegundaPessoa: null, dataEvento: '2024-11-02' }),
]

function rotear(fetchSimulado: Mock<typeof fetch>, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(SESSAO_EXEMPLO)
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

async function abrirNovo(tipo: TipoEvento | null, historico: () => Response = () => respostaJson(PARTICIPACOES)) {
  rotear(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson({ ...eventoCompleto(), tipo: tipo as TipoEvento })),
    quando('GET', ROTA, () => respostaJson(listaVinculos(VINCULOS))),
    quando('GET', '/api/fornecedores', () =>
      respostaJson([
        resumoFornecedor({ id: ID_FLORISTA, categoria: 'Decoracao', nomeEmpresa: 'Florista Jardim', responsavel: null }),
        resumoFornecedor({ id: 'f-transporte', categoria: 'Transporte', nomeEmpresa: 'Van Executiva', responsavel: null }),
      ]),
    ),
    quando('GET', ROTA_HISTORICO_FLORISTA, historico),
    quando('GET', '/api/fornecedores/f-transporte/eventos', () => respostaJson([])),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/fornecedores/novo`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

async function escolher(alvo: VueWrapper, id: string) {
  alvo.getComponent({ name: 'Select' }).vm.$emit('update:modelValue', id)
  await flushPromises()
}

describe('FornecedorEventoFormularioView — eventos', () => {
  it('[COMPONENTE] antes de escolher orienta sem chamar o histórico; ao escolher mostra contagem, recentes e mais N sem o evento atual', async () => {
    const alvo = await abrirNovo('Casamento')

    expect(alvo.get('[data-teste="historico-sem-escolha"]').text()).toBe(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.semEscolha)
    expect(chamadas(fetchSimulado, 'GET', ROTA_HISTORICO_FLORISTA)).toHaveLength(0)

    await escolher(alvo, ID_FLORISTA)
    await aguardarAte(() => expect(alvo.find('[data-teste="historico-lista"]').exists()).toBe(true))

    expect(chamadas(fetchSimulado, 'GET', ROTA_HISTORICO_FLORISTA)).toHaveLength(1)
    const historico = alvo.get('[data-teste="historico-fornecedor"]')
    expect(historico.element.tagName).toBe('SECTION')
    expect(historico.get('h2').text()).toBe(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.titulo)
    expect(historico.attributes('aria-labelledby')).toBe(historico.get('h2').attributes('id'))
    expect(historico.get('[data-teste="historico-total"]').text()).toContain('5')
    expect(historico.get('[data-teste="historico-total"]').text()).toContain(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.legenda(5))
    expect(historico.get('[data-teste="historico-contratados"]').text()).toBe(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.contratados(3))
    const itens = historico.findAll('[data-teste="historico-item"]')
    expect(itens).toHaveLength(4)
    expect(itens[0]!.text()).toContain('Beatriz')
    expect(historico.text()).not.toContain('Atual')
    expect(itens[2]!.text()).toContain(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.arquivado)
    expect(historico.get('[data-teste="historico-mais"]').text()).toBe(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.maisN(1))
    expect(historico.findAll('a')).toHaveLength(0)
    expect(historico.text()).not.toMatch(/@|\d{8,}/)
  })

  it('[COMPONENTE] fornecedor sem outros eventos mostra o vazio; falha mostra erro com nova tentativa', async () => {
    let falhar = true
    const alvo = await abrirNovo('Aniversario', () =>
      falhar ? respostaProblema(500, { title: 'Erro' }) : respostaJson([participacao({ eventoId: ID_EVENTO })]),
    )

    await escolher(alvo, ID_FLORISTA)
    await aguardarAte(() => expect(alvo.find('[data-teste="historico-erro"]').exists()).toBe(true))
    expect(alvo.get('[data-teste="historico-erro"]').text()).toContain(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.erro)
    expect(alvo.find('[data-teste="formulario-vinculo"]').exists()).toBe(true)

    falhar = false
    await alvo.get('[data-teste="historico-tentar-novamente"]').trigger('click')
    await aguardarAte(() => expect(alvo.find('[data-teste="historico-vazio"]').exists()).toBe(true))
    expect(alvo.get('[data-teste="historico-vazio"]').text()).toBe(TEXTOS_HISTORICO_FORNECEDOR_EVENTO.vazio)
  })

  it.each([
    ['Casamento', 'o casamento'],
    ['QuinzeAnos', 'a festa de 15 anos'],
    ['Aniversario', 'o aniversário'],
    ['Comemoracao', 'a comemoração'],
  ] as const)('[COMPONENTE] %s lista as categorias essenciais do tipo e a situação da categoria escolhida', async (tipo, artigo) => {
    const alvo = await abrirNovo(tipo)

    const bloco = alvo.get('[data-teste="contratacao-fornecedores"]')
    expect(bloco.get('h2').text()).toBe(TEXTOS_FORNECEDORES_EVENTO.essenciaisPara(artigo))
    const essenciais = VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais
    expect(bloco.findAll('[data-teste^="essencial-"]')).toHaveLength(essenciais.length)
    expect(bloco.get('[data-teste="essencial-Buffet"]').attributes('data-situacao')).toBe('Contratado')

    await escolher(alvo, ID_FLORISTA)
    expect(alvo.get('[data-teste="fornecedor-escolhido"]').text()).toBe(
      TEXTOS_FORNECEDORES_EVENTO.categoriaComSituacao(
        ROTULOS_CATEGORIA_FORNECEDOR.Decoracao,
        TEXTOS_FORNECEDORES_EVENTO.categoriaEssencial.SemFornecedor,
      ),
    )

    await escolher(alvo, 'f-transporte')
    expect(alvo.get('[data-teste="fornecedor-escolhido"]').text()).toBe(ROTULOS_CATEGORIA_FORNECEDOR.Transporte)
    expect(alvo.text()).not.toMatch(tipo === 'Casamento' ? /casal/i : /casamento|casal/i)
  })

  it('[COMPONENTE] tipo desconhecido não mostra categorias essenciais nem cai no vocabulário de casamento', async () => {
    const alvo = await abrirNovo('Corporativo' as TipoEvento)

    expect(alvo.find('[data-teste="contratacao-fornecedores"]').exists()).toBe(false)
    expect(alvo.find('[data-teste="historico-fornecedor"]').exists()).toBe(true)
    await escolher(alvo, ID_FLORISTA)
    expect(alvo.get('[data-teste="fornecedor-escolhido"]').text()).toBe(ROTULOS_CATEGORIA_FORNECEDOR.Decoracao)
    expect(alvo.text()).not.toMatch(/casamento|casal/i)
  })

  it('[COMPONENTE] edição mostra o contrato e depois o histórico do mesmo fornecedor, sem o bloco de essenciais', async () => {
    rotear(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson({ ...eventoCompleto(), tipo: 'QuinzeAnos' })),
      quando('GET', `${ROTA}/${ID_VINCULO}`, () => respostaJson(vinculoExemplo())),
      quando('GET', ROTA_HISTORICO_VINCULO, () => respostaJson(PARTICIPACOES)),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()
    await aguardarAte(() => expect(wrapper!.find('[data-teste="historico-lista"]').exists()).toBe(true))

    const contrato = wrapper.get('[data-teste="lateral-contrato"]')
    const historico = wrapper.get('[data-teste="historico-fornecedor"]')
    expect(contrato.element.compareDocumentPosition(historico.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(chamadas(fetchSimulado, 'GET', ROTA_HISTORICO_VINCULO)).toHaveLength(1)
    expect(historico.text()).not.toContain('Atual')
    expect(wrapper.find('[data-teste="contratacao-fornecedores"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-vinculo__pagina').classes()).toContain('com-lateral__pagina--ativa')
  })
})
