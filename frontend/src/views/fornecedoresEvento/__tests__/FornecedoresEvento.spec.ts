import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { ID_VINCULO, arquivoPdf, florista, listaVinculos, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONTRATO, TEXTOS_FORNECEDORES_EVENTO, TEXTOS_RESUMO_ORCAMENTO } from '@/textos/fornecedoresEvento'
import type { SessaoDto } from '@/tipos/api'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, resumoEvento, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-fornecedores', 'evento', 'fornecedor-evento-novo', 'fornecedor-evento-editar')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA = `${ROTA_EVENTO}/fornecedores`
const ROTA_VINCULO = `${ROTA}/${ID_VINCULO}`

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

const CONTRATO = { nomeArquivo: 'contrato-buffet.pdf', tamanhoBytes: 1_258_291, enviadoEm: '2026-09-28T13:00:00Z' }

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
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
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

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function botaoDoDialogo(rotulo: string): HTMLButtonElement {
  return Array.from(document.body.querySelectorAll('[role="alertdialog"] button, [role="dialog"] button')).find(
    (botao) => botao.textContent?.trim() === rotulo,
  ) as HTMLButtonElement
}

describe('FornecedoresEventoView — assessoria', () => {
  it('[INTEGRAÇÃO] vínculo com parcelas mostra o resumo, oferece Ver parcelas e troca a remoção por Ir para o Financeiro', async () => {
    const parcelas = { quantidade: 3, pagas: 1, vencidas: 1, parcelado: 18500, pago: 6000, saldoAParcelar: 0, proximoVencimento: '2026-10-15', proximoValor: 3250 }
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo({ status: 'Contratado', valorContratado: 18500, parcelas })]))),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.get('[data-teste="resumo-parcelas-vinculo"]').text()).toContain('1 de 3 pagas')
    const navegar = vi.spyOn(montagem.roteador, 'push').mockResolvedValue(undefined)
    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'remover')
    await flushPromises()
    expect(document.body.textContent).toContain('Este fornecedor tem 3 parcelas.')
    botaoDoDialogo('Ir para o Financeiro').click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', ROTA_VINCULO)).toHaveLength(0)
    expect(navegar).toHaveBeenCalledWith({ name: 'evento-financeiro', params: { id: ID_EVENTO }, query: { visao: 'fornecedor' } })
  })

  it('[COMPONENTE] mostra o resumo do orçamento e os vínculos agrupados por categoria com ações', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () =>
        respostaJson(listaVinculos([vinculoExemplo({ status: 'Contratado', valorContratado: 18500, contrato: CONTRATO }), florista()])),
      ),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_FORNECEDORES_EVENTO.titulo)
    expect(wrapper.get('[data-teste="resumo-frase"]').text()).toContain('R$ 18.500,00')
    expect(wrapper.get('[data-teste="grupo-Buffet"] h2').text()).toContain('Buffet')
    expect(wrapper.get('[data-teste="grupo-Decoracao"]').text()).toContain('Florista Jardim')
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="importar-fornecedores"]').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(2)
    expect(wrapper.get('[data-teste="link-vinculo"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)
    const ativo = wrapper.findAll('[data-teste="item-evento"]').find((item) => item.attributes('aria-current') === 'page')
    expect(ativo?.text()).toBe('Fornecedores')
  })

  it('[COMPONENTE] remover pede confirmação destrutiva nomeando a empresa e mostra o toast', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([florista()]))),
      quando('DELETE', `${ROTA}/${florista().id}`, () => respostaVazia()),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'remover')
    await flushPromises()

    const dialogo = document.body.querySelector('[role="alertdialog"]')
    expect(dialogo?.textContent).toContain('Remover “Florista Jardim” deste evento?')
    expect(dialogo?.textContent).toContain(TEXTOS_FORNECEDORES_EVENTO.confirmarRemoverTexto)
    botaoDoDialogo(TEXTOS_FORNECEDORES_EVENTO.confirmarRemover).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA}/${florista().id}`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Florista Jardim removido do evento.')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.vazioTitulo)
  })

  it('[COMPONENTE] vazio do canvas com adicionar e importar; importação mostra o resultado', async () => {
    let importado = false
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos(importado ? [vinculoExemplo()] : []))),
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento(), resumoEvento({ id: 'origem', nomePrimeiraPessoa: 'Beatriz', nomeSegundaPessoa: 'Rafael', data: '2026-09-12' })])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
      quando('POST', `${ROTA}/importacao`, () => {
        importado = true
        return respostaJson({ importados: 1, ignorados: 2 })
      }),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.text()).toContain('Você ainda não possui fornecedores.')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.vazioTexto)
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    await wrapper.get('[data-teste="importar-fornecedores-vazio"]').trigger('click')
    await flushPromises()

    const dialogo = wrapper.getComponent({ name: 'DialogoImportarFornecedores' })
    const selecao = dialogo.getComponent({ name: 'Select' })
    expect((selecao.props('options') as { rotulo: string }[]).map((opcao) => opcao.rotulo)).toEqual(['Beatriz & Rafael — 12 set 2026'])
    selecao.vm.$emit('update:modelValue', 'origem')
    await flushPromises()
    botaoDoDialogo(TEXTOS_FORNECEDORES_EVENTO.importarBotao).click()
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', `${ROTA}/importacao`)
    expect(corpoDaChamada(chamada!)).toEqual({ eventoOrigemId: 'origem' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('1 fornecedor importado. 2 já estavam no evento ou arquivados.')
    expect(wrapper.text()).toContain('Buffet São João')
  })

  it('[COMPONENTE] importar sem escolher origem avisa no diálogo; nada novo mostra alerta', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([]))),
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento({ id: 'origem' })])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
      quando('POST', `${ROTA}/importacao`, () => respostaJson({ importados: 0, ignorados: 3 })),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)
    await wrapper.get('[data-teste="importar-fornecedores-vazio"]').trigger('click')
    await flushPromises()

    botaoDoDialogo(TEXTOS_FORNECEDORES_EVENTO.importarBotao).click()
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_FORNECEDORES_EVENTO.importarOrigemObrigatoria)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA}/importacao`)).toHaveLength(0)

    wrapper.getComponent({ name: 'DialogoImportarFornecedores' }).getComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'origem')
    await flushPromises()
    botaoDoDialogo(TEXTOS_FORNECEDORES_EVENTO.importarBotao).click()
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_FORNECEDORES_EVENTO.importarNenhum)
  })

  it('[COMPONENTE] erro de rede mostra estado de erro com nova tentativa; 404 mostra não encontrado', async () => {
    let tentativas = 0
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(listaVinculos([vinculoExemplo()]))
      }),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroTitulo)
    await wrapper.get('[data-teste="estado-erro"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Buffet São João')
  })

  it('[COMPONENTE] evento arquivado mostra o aviso e esconde as ações de escrita', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true }))),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo({ contrato: CONTRATO })], { eventoArquivado: true, somenteLeitura: true }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_FORNECEDORES_EVENTO.arquivado)
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(wrapper.find('[data-teste="baixar-contrato-linha"]').exists()).toBe(true)
  })
})

describe('FornecedoresEventoView — anfitriões', () => {
  it('[SEGURANÇA] anfitriões veem fornecedores, resumo e contatos em modo leitura, sem notas internas nem ações', async () => {
    const criar = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: vi.fn() })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA, () =>
        respostaJson(listaVinculos([vinculoExemplo({ notasInternas: null, contrato: CONTRATO, status: 'Contratado', valorContratado: 18500 })], { somenteLeitura: true })),
      ),
      quando('GET', `${ROTA_VINCULO}/contrato`, () => new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } })),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.text()).toContain('Buffet São João')
    expect(wrapper.text()).toContain('R$ 18.500,00')
    expect(wrapper.text()).not.toContain('Comissão')
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="importar-fornecedores"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(wrapper.find('[data-teste="link-vinculo"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-teste="canal-contato"]').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.rodapeAnfitriao)

    await wrapper.get('[data-teste="baixar-contrato-linha"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_VINCULO}/contrato`)).toHaveLength(1)
    expect((clique.mock.contexts[0] as HTMLAnchorElement).download).toBe('contrato-buffet.pdf')
    clique.mockRestore()
  })

  it('[SEGURANÇA] anfitriões que abrem adicionar/editar são levados de volta ao próprio evento', async () => {
    rotear(fetchSimulado, SESSAO_ANFITRIAO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))))

    for (const caminho of [`/eventos/${ID_EVENTO}/fornecedores/novo`, `/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`]) {
      const montagem = await prepararAplicacao(caminho)
      expect(montagem.roteador.currentRoute.value.name).toBe('evento')
    }
  })

  it('[SEGURANÇA] anfitriões veem o vazio sem ações', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA, () => respostaJson(listaVinculos([], { somenteLeitura: true }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.vazioAnfitriaoTitulo)
    expect(wrapper.find('[data-teste="adicionar-fornecedor-vazio"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="importar-fornecedores-vazio"]').exists()).toBe(false)
  })
})

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

describe('FornecedoresEventoView — reestruturação da fundação', () => {
  it('[COMPONENTE] resumo fica antes da lista sem região duplicada; grupos usam rótulo e cartão', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo(), florista()]))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    const lateral = wrapper.get('[data-teste="lateral-orcamento"]')
    expect(lateral.element.tagName).toBe('DIV')
    expect(lateral.attributes('aria-label')).toBeUndefined()
    expect(wrapper.get('.fornecedores-evento').findAll('aside')).toHaveLength(0)
    expect(wrapper.findAll('section h2').filter((titulo) => titulo.text() === TEXTOS_RESUMO_ORCAMENTO.titulo)).toHaveLength(1)
    expect(lateral.find('[data-teste="resumo-orcamento"]').exists()).toBe(true)

    const corpo = wrapper.get('.fornecedores-evento__corpo')
    const lista = wrapper.get('[data-teste="lista-vinculos"]')
    expect(corpo.element.contains(lista.element)).toBe(true)
    expect(lateral.element.compareDocumentPosition(lista.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const titulo = wrapper.get('[data-teste="grupo-Buffet"] h2')
    expect(titulo.classes()).toContain('texto-rotulo')
    expect(titulo.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.quantidadeGrupo(1))
    const listaGrupo = wrapper.get('[data-teste="grupo-Buffet"] ul')
    expect(listaGrupo.classes()).toContain('cartao')
    expect(listaGrupo.attributes('aria-labelledby')).toBe('grupo-vinculos-Buffet')
    expect(wrapper.get('[data-teste="grupo-Decoracao"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--campo']))
  })

  it('[COMPONENTE] rodapé dos anfitriões usa a legenda da fundação', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo({ notasInternas: null })], { somenteLeitura: true }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores`)

    const rodape = wrapper.get('.fornecedores-evento__rodape')
    expect(rodape.classes()).toContain('texto-legenda')
    expect(rodape.text()).toBe(TEXTOS_FORNECEDORES_EVENTO.rodapeAnfitriao)
  })

  it('[UNITÁRIO] a view não tem largura própria, usa só o ritmo e abre a lateral por contêiner', () => {
    const estilo = estiloDe(lerFonte('views/fornecedoresEvento/FornecedoresEventoView.vue'))

    expect(estilo).not.toMatch(/max-width/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).toMatch(/container:\s*fornecedores-evento\s*\/\s*inline-size/)
    expect(estilo).toMatch(/container:\s*lista-vinculos\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container fornecedores-evento \(min-width: 64rem\)/)
    expect(estilo).toMatch(/'principal orcamento'\s*'principal contratacao'/)
    expect(estilo).not.toMatch(/sticky/)
    expect(estilo).not.toMatch(/@media/)
  })

  it('[UNITÁRIO] ResumoOrcamento abre a tabela só pelo próprio contêiner e mantém as cores da régua', () => {
    const estilo = estiloDe(lerFonte('componentes/base/ResumoOrcamento.vue'))

    expect(estilo).toMatch(/container:\s*resumo-orcamento\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container resumo-orcamento \(min-width: 30rem\)/)
    expect(estilo).not.toMatch(/@media \(min-width/)
    expect(estilo).toMatch(/\.resumo-orcamento__camada--pago\s*\{\s*background:\s*var\(--p-cor-primaria-escura\)/)
    expect(estilo).toMatch(/\.resumo-orcamento__camada--a-pagar\s*\{\s*background:\s*var\(--p-cor-acento\)/)
  })

  it('[UNITÁRIO] LinhaFornecedorEvento empilha numa lista estreita e usa o ritmo no espaçamento interno', () => {
    const estilo = estiloDe(lerFonte('componentes/base/LinhaFornecedorEvento.vue'))

    expect(estilo).toMatch(/padding:\s*var\(--p-ritmo-grupo\) var\(--p-ritmo-cartao\)/)
    expect(estilo).toMatch(/@container lista-vinculos \(max-width: 47\.99rem\)/)
    expect(estilo.indexOf('@container lista-vinculos')).toBeGreaterThan(estilo.indexOf('@media (min-width: 1024px)'))
  })
})

describe('FornecedorEventoFormularioView', () => {
  it('[COMPONENTE] exige fornecedor, oferece só ativos não vinculados e cria o vínculo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo()]))),
      quando('GET', '/api/fornecedores', () =>
        respostaJson([
          resumoFornecedor(),
          resumoFornecedor({ id: '44444444-4444-4444-8444-444444444444', categoria: 'Decoracao', nomeEmpresa: 'Florista Jardim', responsavel: null }),
          resumoFornecedor({ id: 'arq', categoria: 'Buffet', nomeEmpresa: 'Antigo', arquivado: true }),
        ]),
      ),
      quando('POST', ROTA, () => respostaJson(florista(), 201)),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/novo`)

    expect(wrapper.get('[data-teste="contrato-depois"]').text()).toBe(TEXTOS_CONTRATO.antesDeSalvar)
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroFornecedorObrigatorio)
    expect(chamadas(fetchSimulado, 'POST', ROTA)).toHaveLength(0)

    const selecao = wrapper.getComponent({ name: 'Select' })
    const grupos = selecao.props('options') as { rotulo: string; itens: { rotulo: string }[] }[]
    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Decoração'])
    expect(grupos[0]!.itens.map((item) => item.rotulo)).toEqual(['Florista Jardim'])
    selecao.vm.$emit('update:modelValue', '44444444-4444-4444-8444-444444444444')
    await wrapper.get('[data-teste="campo-servico"]').setValue('  Arranjos ')
    wrapper.findAllComponents({ name: 'InputNumber' })[0]!.vm.$emit('update:modelValue', 15800)
    await flushPromises()
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA)
    expect(corpoDaChamada(chamada!)).toEqual({
      fornecedorId: '44444444-4444-4444-8444-444444444444',
      servico: 'Arranjos',
      valorOrcado: 15800,
      valorContratado: null,
      status: 'Cotacao',
      notasInternas: null,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Florista Jardim adicionado ao evento.')
    await aguardarRota(montagem.roteador, 'evento-fornecedores')
  })

  it('[COMPONENTE] na edição Contratado sem valor é barrado no cliente e 422 do servidor aparece sob o campo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo())),
      quando('PUT', ROTA_VINCULO, () => respostaProblema(422, { title: 'Regra', detail: 'Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até 2 casas decimais.', campo: 'valorOrcado' })),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    expect(wrapper.get('[data-teste="fornecedor-fixo"]').text()).toContain('Buffet São João')
    expect((wrapper.get('[data-teste="campo-notas"]').element as HTMLTextAreaElement).value).toBe('Comissão de 10%')
    wrapper.getComponent({ name: 'SelectButton' }).vm.$emit('update:modelValue', 'Contratado')
    await flushPromises()
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)
    expect(chamadas(fetchSimulado, 'PUT', ROTA_VINCULO)).toHaveLength(0)

    wrapper.findAllComponents({ name: 'InputNumber' })[1]!.vm.$emit('update:modelValue', 18500)
    await flushPromises()
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PUT', ROTA_VINCULO)[0]!)).toMatchObject({ status: 'Contratado', valorContratado: 18500 })
    expect(wrapper.text()).toContain('Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até 2 casas decimais.')
  })

  it('[SEGURANÇA] contrato que não é PDF é barrado no cliente; PDF válido é enviado e substitui o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo())),
      quando('PUT', `${ROTA_VINCULO}/contrato`, () => respostaJson(vinculoExemplo({ contrato: CONTRATO }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    const anexo = wrapper.getComponent({ name: 'AnexoContrato' })
    anexo.vm.$emit('selecionar', new File(['\u0089PNG'], 'foto.pdf', { type: 'application/pdf' }))
    await flushPromises()
    await aguardarAte(() => expect(wrapper.text()).toContain(TEXTOS_CONTRATO.erroFormato))
    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_VINCULO}/contrato`)).toHaveLength(0)

    anexo.vm.$emit('selecionar', arquivoPdf())
    await aguardarAte(() => expect(chamadas(fetchSimulado, 'PUT', `${ROTA_VINCULO}/contrato`)).toHaveLength(1))
    await flushPromises()
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_CONTRATO.toastAnexado)
    expect(wrapper.get('[data-teste="contrato-nome"]').text()).toBe('contrato-buffet.pdf')
  })

  it('[COMPONENTE] remover contrato pede confirmação e atualiza o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo({ contrato: CONTRATO }))),
      quando('DELETE', `${ROTA_VINCULO}/contrato`, () => respostaJson(vinculoExemplo())),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    await wrapper.get('[data-teste="remover-contrato"]').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain('Remover o contrato de “Buffet São João”?')
    botaoDoDialogo(TEXTOS_CONTRATO.remover).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_VINCULO}/contrato`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_CONTRATO.toastRemovido)
    expect(wrapper.find('[data-teste="contrato-anexado"]').exists()).toBe(false)
  })
})

describe('FornecedorEventoFormularioView — reestruturação da fundação', () => {
  it('[COMPONENTE] adicionar usa a largura de formulário, fieldsets com rótulo e o link de cadastro ao lado do rótulo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo()]))),
      quando('GET', '/api/fornecedores', () => respostaJson([resumoFornecedor({ id: 'f2', categoria: 'Decoracao', nomeEmpresa: 'Florista Jardim' })])),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/novo`)

    expect(wrapper.get('.formulario-vinculo__pagina').classes()).toEqual(
      expect.arrayContaining(['pagina-formulario', 'formulario-vinculo__pagina--com-lateral']),
    )
    expect(wrapper.get('[data-teste="formulario-vinculo"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const grupoFornecedor = wrapper.get('[data-teste="grupo-fornecedor"]')
    expect(grupoFornecedor.element.tagName).toBe('FIELDSET')
    expect(grupoFornecedor.get('legend').classes()).toContain('texto-rotulo')
    expect(grupoFornecedor.get('legend').text()).toBe(TEXTOS_FORNECEDORES_EVENTO.grupoFornecedor)
    expect(wrapper.get('[data-teste="grupo-contratacao"] legend').text()).toBe(TEXTOS_FORNECEDORES_EVENTO.grupoContratacao)
    expect(wrapper.get('[data-teste="grupo-contratacao"]').find('[data-teste="campo-notas"]').exists()).toBe(true)
    expect(wrapper.get('.campo-formulario__cabecalho').find('[data-teste="cadastrar-na-base"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="contrato-depois"]').classes()).toContain('texto-legenda')
    expect(wrapper.find('[data-teste="lateral-contrato"]').exists()).toBe(false)
    const formulario = wrapper.get('[data-teste="formulario-vinculo"]')
    const lateral = wrapper.get('[data-teste="lateral-vinculo"]')
    expect(lateral.element.tagName).toBe('DIV')
    expect(formulario.element.compareDocumentPosition(lateral.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('[COMPONENTE] editar abre o contrato num aside rotulado depois do formulário e destaca o fornecedor fixo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo({ contrato: CONTRATO }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    expect(wrapper.get('.formulario-vinculo__pagina').classes()).toEqual(
      expect.arrayContaining(['pagina-formulario', 'formulario-vinculo__pagina--com-lateral']),
    )
    const lateral = wrapper.get('[data-teste="lateral-contrato"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-label')).toBe(TEXTOS_FORNECEDORES_EVENTO.lateralContrato)
    expect(lateral.find('[data-teste="anexo-contrato"]').exists()).toBe(true)
    const formulario = wrapper.get('[data-teste="formulario-vinculo"]')
    expect(formulario.element.compareDocumentPosition(lateral.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const fixo = wrapper.get('[data-teste="fornecedor-fixo"]')
    expect(fixo.get('.formulario-vinculo__empresa').text()).toBe('Buffet São João')
    expect(fixo.get('.texto-legenda').text()).toBe('Buffet')
  })

  it('[COMPONENTE] não mostra erro antes da primeira tentativa e limpa o erro ao digitar um valor válido', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo())),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    const situacao = wrapper.getComponent({ name: 'SelectButton' })
    situacao.vm.$emit('update:modelValue', 'Contratado')
    situacao.vm.$emit('change', { value: 'Contratado' })
    await wrapper.get('[data-teste="campo-servico"]').trigger('blur')
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)
    expect(wrapper.find('[data-teste="erro-campo"]').exists()).toBe(false)

    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)

    wrapper.findAllComponents({ name: 'InputNumber' })[1]!.vm.$emit('update:modelValue', 18500)
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)
  })

  it('[COMPONENTE] voltar a situação para Cotação depois da tentativa tira a exigência do valor contratado', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo({ status: 'Contratado' }))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/fornecedores/${ID_VINCULO}/editar`)

    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)

    const situacao = wrapper.getComponent({ name: 'SelectButton' })
    situacao.vm.$emit('update:modelValue', 'Cotacao')
    situacao.vm.$emit('change', { value: 'Cotacao' })
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor)
  })

  it('[UNITÁRIO] a view não tem largura nem espaçamento próprios e abre a lateral por contêiner', () => {
    const fonte = lerFonte('views/fornecedoresEvento/FornecedorEventoFormularioView.vue')
    const estilo = estiloDe(fonte)

    const larguras = estilo.match(/max-width:[^;]+/g) ?? []
    expect(larguras.filter((largura) => !/100%|var\(--p-dimensao-largura-/.test(largura))).toEqual([])
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/sticky/)
    expect(estilo).toMatch(/@container formulario-vinculo-campos \(min-width: 36rem\)/)
    expect(estilo).toMatch(/formulario-vinculo__pagina--com-lateral \{\s*max-width: calc\(/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/margin[^:]*:\s*-/)
    expect(estilo).not.toMatch(/(gap|padding|margin)[^;]*\d+px/)
    expect(estilo).toMatch(/container:\s*formulario-vinculo\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container formulario-vinculo \(min-width: 64rem\)/)
    expect(estilo).toMatch(/grid-template-areas:\s*'principal lateral'/)
    expect(estilo).toMatch(/minmax\(0, var\(--p-dimensao-largura-formulario\)\) minmax\(var\(--p-dimensao-largura-gaveta\), 1fr\)/)
    expect(fonte).not.toMatch(/validarCampo\(/)
    expect(fonte).toMatch(/revalidarAoDigitar\('valorContratado'\)/)
  })

  it('[UNITÁRIO] AnexoContrato usa o ritmo e decide as colunas pelo próprio contêiner', () => {
    const estilo = estiloDe(lerFonte('componentes/base/AnexoContrato.vue'))

    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).toMatch(/container:\s*anexo-contrato\s*\/\s*inline-size/)
    expect(estilo).toMatch(/@container anexo-contrato \(min-width: 36rem\)/)
  })
})
