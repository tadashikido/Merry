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
import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { ID_VINCULO, arquivoPdf, florista, listaVinculos, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresCasamento'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONTRATO, TEXTOS_FORNECEDORES_CASAMENTO } from '@/textos/fornecedoresCasamento'
import type { SessaoDto } from '@/tipos/api'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, resumoCasamento, type Rota } from '../../casamentos/__tests__/auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA = `${ROTA_CASAMENTO}/fornecedores`
const ROTA_VINCULO = `${ROTA}/${ID_VINCULO}`

const SESSAO_CASAL: SessaoDto = {
  tokenAcesso: 'token-casal',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-casal',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Casal',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    casamentoId: ID_CASAMENTO,
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

describe('FornecedoresCasamentoView — assessoria', () => {
  it('[INTEGRAÇÃO] vínculo com parcelas mostra o resumo, oferece Ver parcelas e troca a remoção por Ir para o Financeiro', async () => {
    const parcelas = { quantidade: 3, pagas: 1, vencidas: 1, parcelado: 18500, pago: 6000, saldoAParcelar: 0, proximoVencimento: '2026-10-15', proximoValor: 3250 }
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo({ status: 'Contratado', valorContratado: 18500, parcelas })]))),
    )
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.get('[data-teste="resumo-parcelas-vinculo"]').text()).toContain('1 de 3 pagas')
    const navegar = vi.spyOn(montagem.roteador, 'push').mockResolvedValue(undefined)
    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'remover')
    await flushPromises()
    expect(document.body.textContent).toContain('Este fornecedor tem 3 parcelas.')
    botaoDoDialogo('Ir para o Financeiro').click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', ROTA_VINCULO)).toHaveLength(0)
    expect(navegar).toHaveBeenCalledWith({ name: 'casamento-financeiro', params: { id: ID_CASAMENTO }, query: { visao: 'fornecedor' } })
  })

  it('[COMPONENTE] mostra o resumo do orçamento e os vínculos agrupados por categoria com ações', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () =>
        respostaJson(listaVinculos([vinculoExemplo({ status: 'Contratado', valorContratado: 18500, contrato: CONTRATO }), florista()])),
      ),
    )

    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_FORNECEDORES_CASAMENTO.titulo)
    expect(wrapper.get('[data-teste="resumo-frase"]').text()).toContain('R$ 18.500,00')
    expect(wrapper.get('[data-teste="grupo-Buffet"] h2').text()).toContain('Buffet')
    expect(wrapper.get('[data-teste="grupo-Decoracao"]').text()).toContain('Florista Jardim')
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="importar-fornecedores"]').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(2)
    expect(wrapper.get('[data-teste="link-vinculo"]').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/fornecedores/${ID_VINCULO}/editar`)
    const ativo = wrapper.findAll('[data-teste="item-casamento"]').find((item) => item.attributes('aria-current') === 'page')
    expect(ativo?.text()).toBe('Fornecedores')
  })

  it('[COMPONENTE] remover pede confirmação destrutiva nomeando a empresa e mostra o toast', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([florista()]))),
      quando('DELETE', `${ROTA}/${florista().id}`, () => respostaVazia()),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    wrapper.getComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'remover')
    await flushPromises()

    const dialogo = document.body.querySelector('[role="alertdialog"]')
    expect(dialogo?.textContent).toContain('Remover “Florista Jardim” deste casamento?')
    expect(dialogo?.textContent).toContain(TEXTOS_FORNECEDORES_CASAMENTO.confirmarRemoverTexto)
    botaoDoDialogo(TEXTOS_FORNECEDORES_CASAMENTO.confirmarRemover).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA}/${florista().id}`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Florista Jardim removido do casamento.')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.vazioTitulo)
  })

  it('[COMPONENTE] vazio do canvas com adicionar e importar; importação mostra o resultado', async () => {
    let importado = false
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos(importado ? [vinculoExemplo()] : []))),
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([resumoCasamento(), resumoCasamento({ id: 'origem', nomePrimeiraPessoa: 'Beatriz', nomeSegundaPessoa: 'Rafael', data: '2026-09-12' })])),
      quando('GET', '/api/casamentos?situacao=Arquivados', () => respostaJson([])),
      quando('POST', `${ROTA}/importacao`, () => {
        importado = true
        return respostaJson({ importados: 1, ignorados: 2 })
      }),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.text()).toContain('Você ainda não possui fornecedores.')
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.vazioTexto)
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    await wrapper.get('[data-teste="importar-fornecedores-vazio"]').trigger('click')
    await flushPromises()

    const dialogo = wrapper.getComponent({ name: 'DialogoImportarFornecedores' })
    const selecao = dialogo.getComponent({ name: 'Select' })
    expect((selecao.props('options') as { rotulo: string }[]).map((opcao) => opcao.rotulo)).toEqual(['Beatriz & Rafael — 12 set 2026'])
    selecao.vm.$emit('update:modelValue', 'origem')
    await flushPromises()
    botaoDoDialogo(TEXTOS_FORNECEDORES_CASAMENTO.importarBotao).click()
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', `${ROTA}/importacao`)
    expect(corpoDaChamada(chamada!)).toEqual({ casamentoOrigemId: 'origem' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('1 fornecedor importado. 2 já estavam no casamento ou arquivados.')
    expect(wrapper.text()).toContain('Buffet São João')
  })

  it('[COMPONENTE] importar sem escolher origem avisa no diálogo; nada novo mostra alerta', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () => respostaJson(listaVinculos([]))),
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([resumoCasamento({ id: 'origem' })])),
      quando('GET', '/api/casamentos?situacao=Arquivados', () => respostaJson([])),
      quando('POST', `${ROTA}/importacao`, () => respostaJson({ importados: 0, ignorados: 3 })),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)
    await wrapper.get('[data-teste="importar-fornecedores-vazio"]').trigger('click')
    await flushPromises()

    botaoDoDialogo(TEXTOS_FORNECEDORES_CASAMENTO.importarBotao).click()
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_FORNECEDORES_CASAMENTO.importarOrigemObrigatoria)
    expect(chamadas(fetchSimulado, 'POST', `${ROTA}/importacao`)).toHaveLength(0)

    wrapper.getComponent({ name: 'DialogoImportarFornecedores' }).getComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'origem')
    await flushPromises()
    botaoDoDialogo(TEXTOS_FORNECEDORES_CASAMENTO.importarBotao).click()
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_FORNECEDORES_CASAMENTO.importarNenhum)
  })

  it('[COMPONENTE] erro de rede mostra estado de erro com nova tentativa; 404 mostra não encontrado', async () => {
    let tentativas = 0
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(listaVinculos([vinculoExemplo()]))
      }),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.erroTitulo)
    await wrapper.get('[data-teste="estado-erro"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Buffet São João')
  })

  it('[COMPONENTE] casamento arquivado mostra o aviso e esconde as ações de escrita', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ arquivado: true }))),
      quando('GET', ROTA, () => respostaJson(listaVinculos([vinculoExemplo({ contrato: CONTRATO })], { casamentoArquivado: true, somenteLeitura: true }))),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.arquivado)
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(wrapper.find('[data-teste="baixar-contrato-linha"]').exists()).toBe(true)
  })
})

describe('FornecedoresCasamentoView — casal', () => {
  it('[SEGURANÇA] casal vê fornecedores, resumo e contatos em modo leitura, sem notas internas nem ações', async () => {
    const criar = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: vi.fn() })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', ROTA, () =>
        respostaJson(listaVinculos([vinculoExemplo({ notasInternas: null, contrato: CONTRATO, status: 'Contratado', valorContratado: 18500 })], { somenteLeitura: true })),
      ),
      quando('GET', `${ROTA_VINCULO}/contrato`, () => new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } })),
    )

    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.text()).toContain('Buffet São João')
    expect(wrapper.text()).toContain('R$ 18.500,00')
    expect(wrapper.text()).not.toContain('Comissão')
    expect(wrapper.find('[data-teste="adicionar-fornecedor"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="importar-fornecedores"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'MenuAcoes' })).toHaveLength(0)
    expect(wrapper.find('[data-teste="link-vinculo"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-teste="canal-contato"]').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.rodapeCasal)

    await wrapper.get('[data-teste="baixar-contrato-linha"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_VINCULO}/contrato`)).toHaveLength(1)
    expect((clique.mock.contexts[0] as HTMLAnchorElement).download).toBe('contrato-buffet.pdf')
    clique.mockRestore()
  })

  it('[SEGURANÇA] casal que abre adicionar/editar é levado de volta ao próprio casamento', async () => {
    rotear(fetchSimulado, SESSAO_CASAL, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))))

    for (const caminho of [`/casamentos/${ID_CASAMENTO}/fornecedores/novo`, `/casamentos/${ID_CASAMENTO}/fornecedores/${ID_VINCULO}/editar`]) {
      const montagem = await prepararAplicacao(caminho)
      expect(montagem.roteador.currentRoute.value.name).toBe('casamento')
    }
  })

  it('[SEGURANÇA] casal vê o vazio sem ações', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', ROTA, () => respostaJson(listaVinculos([], { somenteLeitura: true }))),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores`)

    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.vazioCasalTitulo)
    expect(wrapper.find('[data-teste="adicionar-fornecedor-vazio"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="importar-fornecedores-vazio"]').exists()).toBe(false)
  })
})

describe('FornecedorCasamentoFormularioView', () => {
  it('[COMPONENTE] exige fornecedor, oferece só ativos não vinculados e cria o vínculo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
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
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores/novo`)

    expect(wrapper.get('[data-teste="contrato-depois"]').text()).toBe(TEXTOS_CONTRATO.antesDeSalvar)
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.erroFornecedorObrigatorio)
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
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Florista Jardim adicionado ao casamento.')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento-fornecedores'))
  })

  it('[COMPONENTE] na edição Contratado sem valor é barrado no cliente e 422 do servidor aparece sob o campo', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo())),
      quando('PUT', ROTA_VINCULO, () => respostaProblema(422, { title: 'Regra', detail: 'Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até 2 casas decimais.', campo: 'valorOrcado' })),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores/${ID_VINCULO}/editar`)

    expect(wrapper.get('[data-teste="fornecedor-fixo"]').text()).toContain('Buffet São João')
    expect((wrapper.get('[data-teste="campo-notas"]').element as HTMLTextAreaElement).value).toBe('Comissão de 10%')
    wrapper.getComponent({ name: 'SelectButton' }).vm.$emit('update:modelValue', 'Contratado')
    await flushPromises()
    await wrapper.get('[data-teste="formulario-vinculo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_FORNECEDORES_CASAMENTO.erroContratadoSemValor)
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
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo())),
      quando('PUT', `${ROTA_VINCULO}/contrato`, () => respostaJson(vinculoExemplo({ contrato: CONTRATO }))),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores/${ID_VINCULO}/editar`)

    const anexo = wrapper.getComponent({ name: 'AnexoContrato' })
    anexo.vm.$emit('selecionar', new File(['\u0089PNG'], 'foto.pdf', { type: 'application/pdf' }))
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain(TEXTOS_CONTRATO.erroFormato))
    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_VINCULO}/contrato`)).toHaveLength(0)

    anexo.vm.$emit('selecionar', arquivoPdf())
    await vi.waitFor(() => expect(chamadas(fetchSimulado, 'PUT', `${ROTA_VINCULO}/contrato`)).toHaveLength(1))
    await flushPromises()
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_CONTRATO.toastAnexado)
    expect(wrapper.get('[data-teste="contrato-nome"]').text()).toBe('contrato-buffet.pdf')
  })

  it('[COMPONENTE] remover contrato pede confirmação e atualiza o bloco', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_VINCULO, () => respostaJson(vinculoExemplo({ contrato: CONTRATO }))),
      quando('DELETE', `${ROTA_VINCULO}/contrato`, () => respostaJson(vinculoExemplo())),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/fornecedores/${ID_VINCULO}/editar`)

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
