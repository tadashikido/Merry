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
import { painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_ACEITE_CASAL, TEXTOS_ACESSO_CASAL, TEXTOS_AREA_CASAL } from '@/textos/acessoCasal'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import type { AcessoCasalDto, ConviteAcessoCasalDto } from '@/tipos/acessoCasal'
import type { SessaoDto } from '@/tipos/api'
import type { ListaConvitesDto } from '@/tipos/convidados'
import { ID_CASAMENTO, ID_OUTRO, RaizRotas, casamentoCompleto, chamadas, quando, type Rota } from './auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

function notificado(texto: string): boolean {
  return [...notificacoes.sucesso.mock.calls, ...notificacoes.erro.mock.calls].some((chamada) => chamada.some((argumento) => argumento === texto))
}

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_ACESSOS = `${ROTA_CASAMENTO}/acessos-casal`
const TOKEN_CONVITE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ'

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

const CONVITE_CASAL: ConviteAcessoCasalDto = {
  nome: 'Lívia Moraes',
  email: 'livia@exemplo.com',
  nomePrimeiraPessoa: 'Ana Beatriz',
  nomeSegundaPessoa: 'Bruno',
  organizacao: 'Albuquerque Assessoria',
  expiraEm: '2026-10-06T12:00:00Z',
}

function acesso(dados: Partial<AcessoCasalDto> = {}): AcessoCasalDto {
  return {
    id: 'a1',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    situacao: 'Pendente',
    convidadoEm: '2026-09-29T12:00:00Z',
    conviteExpiraEm: '2026-10-06T12:00:00Z',
    aceitoEm: null,
    ...dados,
  }
}

const LISTA_VAZIA: ListaConvitesDto = {
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
  convidadosEstimados: 150,
  casamentoArquivado: false,
}

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto | null, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return sessao ? respostaJson(sessao) : respostaProblema(401)
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
  window.history.replaceState(null, '', '/')
})

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

describe('navegação do casal', () => {
  it('[SEGURANÇA] casal que abre o início ou rotas da assessoria é levado ao próprio casamento', async () => {
    rotear(fetchSimulado, SESSAO_CASAL, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))))

    for (const caminho of ['/', '/casamentos', '/casamentos/novo', `/casamentos/${ID_CASAMENTO}/editar`, `/casamentos/${ID_CASAMENTO}/restricoes-alimentares`, `/casamentos/${ID_CASAMENTO}/confirmacoes/buffet`]) {
      const montagem = await prepararAplicacao(caminho)
      expect(montagem.roteador.currentRoute.value.name).toBe('casamento')
      expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_CASAMENTO)
    }
  })

  it('[SEGURANÇA] dona continua acessando as rotas da assessoria', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([])))

    const montagem = await prepararAplicacao('/casamentos')

    expect(montagem.roteador.currentRoute.value.name).toBe('casamentos')
  })

  it('[COMPONENTE] casal vê o casamento sem ações da assessoria, sem observações e com menu reduzido', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', `${ROTA_CASAMENTO}/convites/totais`, () => respostaJson(LISTA_VAZIA.totais)),
    )

    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.find('[data-teste="editar-casamento"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="arquivar-casamento"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="bloco-acesso-casal"]').exists()).toBe(false)
    expect(wrapper!.text()).not.toContain(TEXTOS_CASAMENTOS.observacoes)
    const menu = wrapper!.text()
    expect(menu).toContain(TEXTOS_AREA_CASAL.menuNossoCasamento)
    expect(menu).toContain(TEXTOS_AREA_CASAL.menuConfirmacoes)
    expect(menu).toContain(TEXTOS_AREA_CASAL.rodape('Albuquerque Assessoria'))
    expect(wrapper!.findAll('a').some((link) => link.attributes('href') === '/casamentos')).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_ACESSOS)).toHaveLength(0)
    const itensCasamento = wrapper!.findAll('[data-teste="item-casamento"]').map((item) => item.text())
    expect(itensCasamento).toEqual(['Visão geral', 'Tarefas', 'Cronograma', 'Fornecedores', TEXTOS_AREA_CASAL.menuConvidados, TEXTOS_AREA_CASAL.menuConfirmacoes, 'Mesas', 'Financeiro', 'Grande Dia'])
    expect(wrapper!.findAll('a').some((link) => link.attributes('href')?.endsWith('/restricoes-alimentares'))).toBe(false)
    expect(wrapper!.findAll('[data-teste="item-menu"]').map((item) => item.text())).toEqual([TEXTOS_AREA_CASAL.menuNossoCasamento])
    expect(wrapper!.get('.layout-painel').classes()).toContain('layout-painel--casal')
  })

  it('[SEGURANÇA] casamento de outro casal mostra não encontrado com volta para o próprio casamento', async () => {
    rotear(fetchSimulado, SESSAO_CASAL)

    await abrir(`/casamentos/${ID_OUTRO}`)

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.naoEncontradoTitulo)
    expect(wrapper!.get('[data-teste="voltar-nosso-casamento"]').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}`)
  })

  it('[COMPONENTE] casal não vê o atalho de restrições nominais na lista de convidados', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', `${ROTA_CASAMENTO}/convites`, () => respostaJson(LISTA_VAZIA)),
    )

    await abrir(`/casamentos/${ID_CASAMENTO}/convidados`)

    expect(wrapper!.find('[data-teste="abrir-restricoes"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="abrir-confirmacoes"]').exists()).toBe(true)
  })

  it('[COMPONENTE] casal vê no painel só o total de pessoas com restrição e não exporta para o buffet', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', `${ROTA_CASAMENTO}/painel-confirmacoes`, () => respostaJson(painelExemplo({ pessoasComRestricaoAlimentar: 3 }))),
    )

    await abrir(`/casamentos/${ID_CASAMENTO}/confirmacoes`)

    const bloco = wrapper!.get('[data-teste="restricoes-casal"]')
    expect(bloco.text()).toContain(TEXTOS_AREA_CASAL.restricoesRotulo)
    expect(bloco.text()).toContain('3')
    expect(bloco.text()).toContain(TEXTOS_AREA_CASAL.restricoesApoio)
    expect(wrapper!.find('[data-teste="baixar-planilha"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="abrir-impressao"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="ver-restricoes"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="alterar-prazo"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', `${ROTA_CASAMENTO}/restricoes-alimentares`)).toHaveLength(0)
  })
})

describe('bloco Acesso do casal (dona)', () => {
  function rotasDona(...extras: Rota[]) {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', `${ROTA_CASAMENTO}/convites/totais`, () => respostaJson(LISTA_VAZIA.totais)),
      ...extras,
    )
  }

  it('[COMPONENTE] mostra dois lugares vazios ligados pelo & quando ninguém foi convidado', async () => {
    rotasDona(quando('GET', ROTA_ACESSOS, () => respostaJson([])))

    await abrir(`/casamentos/${ID_CASAMENTO}`)

    const lugares = wrapper!.findAll('[data-teste="lugar-acesso"]')
    expect(lugares).toHaveLength(2)
    expect(lugares.every((lugar) => lugar.attributes('data-situacao') === 'vazio')).toBe(true)
    expect(wrapper!.get('[data-teste="par-lugares"]').attributes('role')).toBe('list')
    expect(wrapper!.findAll('[data-teste="convidar-casal"]')).toHaveLength(2)
  })

  it('[COMPONENTE] convida pelo lugar vazio e passa a mostrar o convite pendente', async () => {
    rotasDona(
      quando('GET', ROTA_ACESSOS, () => respostaJson([])),
      quando('POST', ROTA_ACESSOS, () => respostaJson(acesso(), 201)),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.findAll('[data-teste="convidar-casal"]')[0]!.trigger('click')
    await flushPromises()
    await wrapper!.get('#acesso-casal-0-nome').setValue('Lívia Moraes')
    await wrapper!.get('#acesso-casal-0-email').setValue('livia@exemplo.com')
    await wrapper!.get('[data-teste="formulario-convite-casal"]').trigger('submit')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'POST', ROTA_ACESSOS)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({ nome: 'Lívia Moraes', email: 'livia@exemplo.com' })
    const primeiro = wrapper!.findAll('[data-teste="lugar-acesso"]')[0]!
    expect(primeiro.attributes('data-situacao')).toBe('pendente')
    expect(primeiro.text()).toContain('Convite pendente')
    expect(primeiro.text()).toContain(TEXTOS_ACESSO_CASAL.expiraEm('06/10/2026'))
    expect(notificado(TEXTOS_ACESSO_CASAL.convidado('livia@exemplo.com'))).toBe(true)
  })

  it('[UNITÁRIO] valida campos obrigatórios antes de enviar', async () => {
    rotasDona(quando('GET', ROTA_ACESSOS, () => respostaJson([])))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.findAll('[data-teste="convidar-casal"]')[1]!.trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="formulario-convite-casal"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_ACESSOS)).toHaveLength(0)
    expect(wrapper!.get('#acesso-casal-1-nome').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] não mostra erro ao sair dos campos antes de enviar, para não deslocar as ações', async () => {
    rotasDona(quando('GET', ROTA_ACESSOS, () => respostaJson([])))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.findAll('[data-teste="convidar-casal"]')[0]!.trigger('click')
    await flushPromises()
    await wrapper!.get('#acesso-casal-0-nome').trigger('blur')
    await wrapper!.get('#acesso-casal-0-email').setValue('livia@')
    await wrapper!.get('#acesso-casal-0-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.get('#acesso-casal-0-nome').attributes('aria-invalid')).toBe('false')
    expect(wrapper!.get('#acesso-casal-0-email').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar enviar, o erro do e-mail some ao digitar e um único envio convida', async () => {
    rotasDona(
      quando('GET', ROTA_ACESSOS, () => respostaJson([])),
      quando('POST', ROTA_ACESSOS, () => respostaJson(acesso(), 201)),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.findAll('[data-teste="convidar-casal"]')[0]!.trigger('click')
    await flushPromises()
    await wrapper!.get('#acesso-casal-0-nome').setValue('Lívia Moraes')
    await wrapper!.get('#acesso-casal-0-email').setValue('livia@')
    await wrapper!.get('[data-teste="formulario-convite-casal"]').trigger('submit')
    await flushPromises()
    expect(wrapper!.get('#acesso-casal-0-email').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#acesso-casal-0-email').setValue('livia@exemplo.com')
    await flushPromises()
    expect(wrapper!.get('#acesso-casal-0-email').attributes('aria-invalid')).toBe('false')

    await wrapper!.get('[data-teste="formulario-convite-casal"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_ACESSOS)).toHaveLength(1)
  })

  it('[COMPONENTE] mostra a recusa do servidor sob o campo de e-mail', async () => {
    rotasDona(
      quando('GET', ROTA_ACESSOS, () => respostaJson([])),
      quando('POST', ROTA_ACESSOS, () => respostaProblema(422, { detail: 'Este e-mail já é usado por outra conta. Peça outro e-mail ao casal.' })),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.findAll('[data-teste="convidar-casal"]')[0]!.trigger('click')
    await flushPromises()
    await wrapper!.get('#acesso-casal-0-nome').setValue('Renata')
    await wrapper!.get('#acesso-casal-0-email').setValue('renata@exemplo.com')
    await wrapper!.get('[data-teste="formulario-convite-casal"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain('Este e-mail já é usado por outra conta')
    expect(wrapper!.find('[data-teste="formulario-convite-casal"]').exists()).toBe(true)
  })

  it('[COMPONENTE] reenviar convite expirado atualiza o lugar e avisa', async () => {
    rotasDona(
      quando('GET', ROTA_ACESSOS, () => respostaJson([acesso({ situacao: 'Expirado', conviteExpiraEm: '2026-09-20T12:00:00Z' })])),
      quando('POST', `${ROTA_ACESSOS}/a1/reenvio`, () => respostaJson(acesso({ conviteExpiraEm: '2026-10-08T12:00:00Z' }))),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)
    expect(wrapper!.text()).toContain(TEXTOS_ACESSO_CASAL.expirouEm('20/09/2026'))

    await wrapper!.get('[data-teste="reenviar-convite"]').trigger('click')
    await flushPromises()

    expect(wrapper!.text()).toContain(TEXTOS_ACESSO_CASAL.expiraEm('08/10/2026'))
    expect(notificado(TEXTOS_ACESSO_CASAL.reenviado('livia@exemplo.com'))).toBe(true)
  })

  it('[COMPONENTE] revogar pede confirmação destrutiva e libera o lugar', async () => {
    rotasDona(
      quando('GET', ROTA_ACESSOS, () => respostaJson([acesso({ situacao: 'Ativo', aceitoEm: '2026-09-30T12:00:00Z' })])),
      quando('DELETE', `${ROTA_ACESSOS}/a1`, () => respostaVazia()),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)
    expect(wrapper!.text()).toContain(TEXTOS_ACESSO_CASAL.ativoDesde('30/09/2026'))
    expect(wrapper!.find('[data-teste="reenviar-convite"]').exists()).toBe(false)

    await wrapper!.get('[data-teste="menu-acoes"]').trigger('click')
    await flushPromises()
    const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((elemento) =>
      elemento.textContent?.includes(TEXTOS_ACESSO_CASAL.revogar),
    )
    expect(item).toBeTruthy()
    ;((item!.querySelector('a, div') ?? item) as HTMLElement).click()
    await flushPromises()

    expect(document.body.textContent).toContain(TEXTOS_ACESSO_CASAL.revogarTitulo('Lívia Moraes'))
    expect(document.body.textContent).toContain(TEXTOS_ACESSO_CASAL.revogarMensagemAtivo('Lívia Moraes'))
    const confirmar = document.body.querySelector('[data-teste="dialogo-confirmacao-confirmar"]') as HTMLElement
    confirmar.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_ACESSOS}/a1`)).toHaveLength(1)
    expect(wrapper!.findAll('[data-teste="lugar-acesso"]').every((lugar) => lugar.attributes('data-situacao') === 'vazio')).toBe(true)
    expect(notificado(TEXTOS_ACESSO_CASAL.revogado('Lívia Moraes'))).toBe(true)
  })

  it('[COMPONENTE] falha ao carregar mostra erro com tentar novamente', async () => {
    rotasDona(quando('GET', ROTA_ACESSOS, () => respostaProblema(500)))

    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.text()).toContain(TEXTOS_ACESSO_CASAL.erroCarregar)
    expect(wrapper!.find('[data-teste="lugar-acesso"]').exists()).toBe(false)
  })

  it('[COMPONENTE] casamento arquivado não oferece convidar', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ arquivado: true, arquivadoEm: '2026-09-28T12:00:00Z' }))),
      quando('GET', `${ROTA_CASAMENTO}/convites/totais`, () => respostaJson(LISTA_VAZIA.totais)),
      quando('GET', ROTA_ACESSOS, () => respostaJson([])),
    )

    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.find('[data-teste="acesso-casal-arquivado"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="convidar-casal"]').exists()).toBe(false)
  })
})

describe('AceiteAcessoCasalView', () => {
  it('[COMPONENTE] lê o token do fragmento, remove da URL e mostra o casamento e o e-mail', async () => {
    rotear(fetchSimulado, null, quando('POST', '/api/acesso-casal/consulta', () => respostaJson(CONVITE_CASAL)))

    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', '/api/acesso-casal/consulta')[0]!)).toEqual({ token: TOKEN_CONVITE })
    expect(window.location.hash).toBe('')
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_ACEITE_CASAL.titulo('Ana Beatriz & Bruno'))
    expect(wrapper!.text()).toContain(TEXTOS_ACEITE_CASAL.descricao('Albuquerque Assessoria'))
    expect(wrapper!.get('[data-teste="email-convite"]').text()).toBe('livia@exemplo.com')
  })

  it('[SEGURANÇA] convite inválido, expirado ou usado mostra o estado "não vale mais"', async () => {
    rotear(fetchSimulado, null, quando('POST', '/api/acesso-casal/consulta', () => respostaProblema(422, { detail: 'Este convite não vale mais.' })))

    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    expect(wrapper!.find('[data-teste="convite-invalido"]').exists()).toBe(true)
    expect(wrapper!.text()).toContain(TEXTOS_ACEITE_CASAL.invalidoTexto)
    expect(wrapper!.find('[data-teste="formulario-aceite-casal"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem token no link não consulta a API', async () => {
    rotear(fetchSimulado, null)

    await abrir('/acesso-casal')

    expect(chamadas(fetchSimulado, 'POST', '/api/acesso-casal/consulta')).toHaveLength(0)
    expect(wrapper!.find('[data-teste="convite-invalido"]').exists()).toBe(true)
  })

  it('[UNITÁRIO] exige senha forte e confirmação igual antes de enviar', async () => {
    rotear(fetchSimulado, null, quando('POST', '/api/acesso-casal/consulta', () => respostaJson(CONVITE_CASAL)))
    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    await wrapper!.get('#aceite-senha').setValue('curta1')
    await wrapper!.get('#aceite-confirmacao').setValue('outra')
    await wrapper!.get('[data-teste="formulario-aceite-casal"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', '/api/acesso-casal/aceite')).toHaveLength(0)
    expect(wrapper!.get('#aceite-senha').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] aceita, abre a sessão e leva à página do casamento', async () => {
    rotear(
      fetchSimulado,
      null,
      quando('POST', '/api/acesso-casal/consulta', () => respostaJson(CONVITE_CASAL)),
      quando('POST', '/api/acesso-casal/aceite', () => respostaJson(SESSAO_CASAL)),
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', `${ROTA_CASAMENTO}/convites/totais`, () => respostaJson(LISTA_VAZIA.totais)),
    )
    const { montagem } = await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    await wrapper!.get('#aceite-senha').setValue('casalFeliz2027')
    await wrapper!.get('#aceite-confirmacao').setValue('casalFeliz2027')
    await wrapper!.get('[data-teste="formulario-aceite-casal"]').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', '/api/acesso-casal/aceite')[0]!)).toEqual({ token: TOKEN_CONVITE, senha: 'casalFeliz2027' })
    expect(montagem.roteador.currentRoute.value.name).toBe('casamento')
    expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_CASAMENTO)
    expect(notificado(TEXTOS_ACEITE_CASAL.boasVindas('Lívia'))).toBe(true)
  })

  it('[COMPONENTE] senha recusada pelo servidor aparece sob o campo', async () => {
    rotear(
      fetchSimulado,
      null,
      quando('POST', '/api/acesso-casal/consulta', () => respostaJson(CONVITE_CASAL)),
      quando('POST', '/api/acesso-casal/aceite', () => respostaProblema(422, { detail: 'A senha não pode ser igual ao e-mail.' })),
    )
    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    await wrapper!.get('#aceite-senha').setValue('senhaValida123')
    await wrapper!.get('#aceite-confirmacao').setValue('senhaValida123')
    await wrapper!.get('[data-teste="formulario-aceite-casal"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain('A senha não pode ser igual ao e-mail.')
  })

  it('[COMPONENTE] sem conexão mostra mensagem de rede', async () => {
    fetchSimulado.mockImplementation(async (entrada) => {
      if (String(entrada) === '/api/autenticacao/renovar') {
        return respostaProblema(401)
      }
      throw new TypeError('Failed to fetch')
    })

    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    expect(wrapper!.text()).toContain('Sem conexão')
  })

  async function abrirConviteValido() {
    rotear(fetchSimulado, null, quando('POST', '/api/acesso-casal/consulta', () => respostaJson(CONVITE_CASAL)))
    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)
  }

  async function preencherEEnviarAceite(senha: string, confirmacao: string) {
    await wrapper!.get('#aceite-senha').setValue(senha)
    await wrapper!.get('#aceite-confirmacao').setValue(confirmacao)
    await wrapper!.get('[data-teste="formulario-aceite-casal"]').trigger('submit')
    await flushPromises()
  }

  it('[COMPONENTE] fala com o casal no plural', () => {
    expect(TEXTOS_ACEITE_CASAL.titulo('Ana Beatriz & Bruno')).toBe('Acessem o casamento de Ana Beatriz & Bruno')
    expect(TEXTOS_ACEITE_CASAL.tituloPadrao).toBe('Acessem o casamento')
    expect(TEXTOS_ACEITE_CASAL.descricao('Albuquerque Assessoria')).toContain('convidou vocês')
    expect(TEXTOS_ACEITE_CASAL.invalidoTexto).toContain('Peçam à assessoria')
    expect(TEXTOS_ACEITE_CASAL.jaTemConta).toBe('Já criaram a senha?')
  })

  it('[COMPONENTE] convite inválido mostra título e texto uma única vez, com lacre decorativo e sem cartão de erro', async () => {
    rotear(fetchSimulado, null, quando('POST', '/api/acesso-casal/consulta', () => respostaProblema(422, { detail: 'Este convite não vale mais.' })))

    await abrir(`/acesso-casal#token=${TOKEN_CONVITE}`)

    expect(wrapper!.findAll('h1')).toHaveLength(1)
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_ACEITE_CASAL.invalidoTitulo)
    expect(wrapper!.find('h2').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="estado-erro"]').exists()).toBe(false)
    expect(wrapper!.text().split(TEXTOS_ACEITE_CASAL.invalidoTexto)).toHaveLength(2)
    const lacre = wrapper!.get('[data-teste="convite-invalido"]').get('[data-teste="lacre-convite-invalido"]')
    expect(lacre.attributes('aria-hidden')).toBe('true')
    expect(lacre.find('.ie-link').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="link-entrar"]').exists()).toBe(true)
    expect(document.activeElement?.id).toBe('autenticacao-titulo')
  })

  it('[COMPONENTE] organiza o formulário com as primitivas de ritmo do Nossia', async () => {
    await abrirConviteValido()

    const formulario = wrapper!.get('[data-teste="formulario-aceite-casal"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    expect(formulario.get('dl').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--campo']))
    expect(formulario.get('dt').classes()).toContain('texto-rotulo')
    const grupo = formulario.get('div.pilha.pilha--grupo')
    expect(grupo.find('#aceite-senha').exists()).toBe(true)
    expect(grupo.find('#aceite-confirmacao').exists()).toBe(true)
    expect(grupo.find('[data-teste="aceitar-convite"]').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('aceite-senha')
  })

  it('[COMPONENTE] não mostra erro ao sair dos campos vazios antes de tentar enviar', async () => {
    await abrirConviteValido()

    await wrapper!.get('#aceite-senha').trigger('blur')
    await wrapper!.get('#aceite-confirmacao').trigger('blur')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#aceite-senha').attributes('aria-invalid')).toBe('false')
    expect(wrapper!.get('#aceite-confirmacao').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar enviar, o erro da confirmação some ao digitar a mesma senha', async () => {
    await abrirConviteValido()
    await preencherEEnviarAceite('casalFeliz2027', 'casalFeliz2028')
    expect(wrapper!.text()).toContain(TEXTOS_ACEITE_CASAL.senhasDiferentes)

    await wrapper!.get('#aceite-confirmacao').setValue('casalFeliz2027')
    await flushPromises()

    expect(wrapper!.text()).not.toContain(TEXTOS_ACEITE_CASAL.senhasDiferentes)
    expect(wrapper!.get('#aceite-confirmacao').attributes('aria-invalid')).toBe('false')
    expect(chamadas(fetchSimulado, 'POST', '/api/acesso-casal/aceite')).toHaveLength(0)
  })

  it('[COMPONENTE] depois de tentar enviar, ajustar a senha para igualar a confirmação limpa o erro da confirmação', async () => {
    await abrirConviteValido()
    await preencherEEnviarAceite('casalFeliz2028', 'casalFeliz2027')
    expect(wrapper!.text()).toContain(TEXTOS_ACEITE_CASAL.senhasDiferentes)

    await wrapper!.get('#aceite-senha').setValue('casalFeliz2027')
    await flushPromises()

    expect(wrapper!.text()).not.toContain(TEXTOS_ACEITE_CASAL.senhasDiferentes)
    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] depois de tentar enviar, sair de um campo ainda inválido mantém o erro', async () => {
    await abrirConviteValido()
    await preencherEEnviarAceite('', '')
    expect(wrapper!.get('#aceite-senha').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#aceite-senha').setValue('curta')
    await wrapper!.get('#aceite-senha').trigger('blur')
    await flushPromises()

    expect(wrapper!.get('#aceite-senha').attributes('aria-invalid')).toBe('true')
    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(true)
  })

  it('[COMPONENTE] mostra o e-mail do convite e o rodapé para quem não esperava o convite', async () => {
    await abrirConviteValido()

    expect(wrapper!.get('[data-teste="email-convite"]').text()).toBe(CONVITE_CASAL.email)
    expect(wrapper!.text()).toContain(TEXTOS_ACEITE_CASAL.naoEsperava)
  })
})
