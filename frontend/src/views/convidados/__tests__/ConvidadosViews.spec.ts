import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import type { ConviteDto, ListaConvitesDto, TotaisConvidadosDto } from '@/tipos/convidados'
import {
  ID_EVENTO,
  RaizRotas,
  eventoCompleto,
  chamadas,
  quando,
  rotearFetch,
} from '@/views/eventos/__tests__/auxiliaresEventos'

const ID_CONVITE = '33333333-3333-4333-8333-333333333333'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`

const TOTAIS: TotaisConvidadosDto = {
  convites: 2,
  pessoas: 3,
  adultos: 2,
  criancas: 1,
  acompanhantesPermitidos: 1,
  confirmados: { adultos: 1, criancas: 0, total: 1 },
  pendentes: { adultos: 0, criancas: 1, total: 1 },
  recusados: { adultos: 1, criancas: 0, total: 1 },
}

function convite(dados: Partial<ConviteDto> = {}): ConviteDto {
  return {
    id: ID_CONVITE,
    nome: 'Família Souza',
    grupo: 'Família da noiva',
    limiteAcompanhantes: 1,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: '11987654321', email: 'carla@exemplo.com', faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false },
      { id: 'p2', nome: 'Pedro Souza', telefone: null, email: null, faixaEtaria: 'Crianca', resposta: 'Pendente', acompanhante: false, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
    ...dados,
  }
}

const OUTRO_CONVITE = convite({
  id: '44444444-4444-4444-8444-444444444444',
  nome: 'Marcos Lima',
  grupo: null,
  limiteAcompanhantes: 0,
  convidados: [{ id: 'p3', nome: 'Marcos Lima', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Recusado', acompanhante: false, possuiRestricao: false }],
})

function lista(dados: Partial<ListaConvitesDto> = {}): ListaConvitesDto {
  return { convites: [convite(), OUTRO_CONVITE], totais: TOTAIS, convidadosEstimados: 150, eventoArquivado: false, ...dados }
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

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function rotasPadrao(listaConvites: ListaConvitesDto = lista(), arquivado = false) {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado }))),
    quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites)),
  ]
}

describe('ConvidadosView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] mostra totais, convites com pessoas e badges, sem telefone nem e-mail', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    const texto = wrapper!.text()
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CONVIDADOS.listaTitulo)
    expect(wrapper!.get('[data-teste="contagem-pessoas"]').text()).toContain('3')
    expect(wrapper!.get('[data-teste="contagem-pessoas"]').text()).toContain('2 adultos e 1 criança')
    expect(texto).toContain('2 convites · até 1 acompanhante · 3 de 150 estimados')
    expect(texto).toContain('Família Souza')
    expect(texto).toContain('Carla Souza')
    expect(texto).toContain('Confirmado')
    expect(texto).toContain('Criança')
    expect(texto).toContain(TEXTOS_CONVIDADOS.semGrupo)
    expect(texto).toContain('+1')
    expect(texto).not.toContain('carla@exemplo.com')
    expect(texto).not.toContain('98765')
    expect(document.title).toBe('Convidados · Ana Beatriz & Bruno · Celebri')
    expect(wrapper!.get('[data-teste="contador-resultados"]').text()).toBe('2 convites encontrados')
  })

  it('[COMPONENTE] marca quem tem restrição sem mostrar o conteúdo e leva ao relatório', async () => {
    const comRestricao = lista({
      convites: [convite({ convidados: convite().convidados.map((pessoa, indice) => ({ ...pessoa, possuiRestricao: indice === 0 })) }), OUTRO_CONVITE],
    })
    rotearFetch(fetchSimulado, ...rotasPadrao(comRestricao))
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.findAll('[data-teste="pessoa-restricao"]')).toHaveLength(1)
    expect(wrapper!.get('[data-teste="pessoa-restricao"]').text()).toBe('Restrição')

    await wrapper!.get('[data-teste="abrir-restricoes"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('restricoes-alimentares'), { timeout: 5000 })
  }, 20_000)

  it('[COMPONENTE] filtro de resposta esconde pessoas de outra resposta sem nova requisição', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(`/eventos/${ID_EVENTO}/convidados`)
    const requisicoesAntes = chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length

    const opcao = wrapper!.findAll('[data-teste="filtro-resposta"] button').find((botao) => botao.text() === 'Confirmadas')
    await opcao!.trigger('click')
    await flushPromises()

    expect(wrapper!.text()).toContain('Carla Souza')
    expect(wrapper!.text()).not.toContain('Pedro Souza')
    expect(wrapper!.text()).not.toContain('Marcos Lima')
    expect(wrapper!.get('[data-teste="pessoas-ocultas"]').text()).toBe('+ 1 outra pessoa neste convite')
    expect(wrapper!.get('[data-teste="contador-resultados"]').text()).toBe('1 convite encontrado')
    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES)).toHaveLength(requisicoesAntes)
  })

  it('[COMPONENTE] busca sem acento e caixa por nome da pessoa', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('MÁRCOS')
    await flushPromises()

    expect(wrapper!.text()).toContain('Marcos Lima')
    expect(wrapper!.text()).not.toContain('Família Souza')
    expect(
      fetchSimulado.mock.calls.some(([url]) => String(url).includes('/convites') && (String(url).includes('MÁRCOS') || String(url).includes('?'))),
    ).toBe(false)
  })

  it('[COMPONENTE] vazio convida a adicionar o primeiro convite', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(lista({ convites: [], totais: { ...TOTAIS, convites: 0, pessoas: 0 } })))

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.vazioTitulo)
    expect(wrapper!.find('[data-teste="resumo-contagem"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="adicionar-convite"]').exists()).toBe(true)
  })

  it('[COMPONENTE] evento arquivado mostra aviso e esconde ações de escrita', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(lista({ eventoArquivado: true }), true))

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_CONVIDADOS.avisoArquivado)
    expect(wrapper!.find('[data-teste="adicionar-convite"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="editar-convite"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="excluir-convite"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] evento de outra organização (404) mostra "Evento não encontrado"', async () => {
    rotearFetch(fetchSimulado)

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.eventoNaoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="voltar-eventos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha de rede mostra erro com tentar novamente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CONVITES, () => respostaProblema(500)),
    )

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.erroCarregar)
    expect(wrapper!.find('[data-teste="adicionar-convite"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão (403) informa falta de acesso', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CONVITES, () => respostaProblema(403)),
    )

    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.semAcesso)
  })

  it('[INTEGRAÇÃO] excluir pede confirmação, some na hora e envia DELETE só quando o aviso fecha', async () => {
    let listaAtual = lista()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CONVITES, () => respostaJson(listaAtual)),
      quando('DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`, () => {
        listaAtual = lista({ convites: [OUTRO_CONVITE] })
        return respostaVazia()
      }),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.findAll('[data-teste="excluir-convite"]')[0]!.trigger('click')
    const confirmacao = useConfirmacaoExclusaoStore()
    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Família Souza')
    expect(confirmacao.mensagem).toBe('As 2 pessoas deste convite também serão excluídas.')
    const aviso = confirmacao.avisoAtual()
    expect(aviso.mensagem).toBe('“Família Souza” foi excluído.')
    await confirmacao.confirmar()
    await flushPromises()

    expect(wrapper!.text()).not.toContain('Família Souza')
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(0)

    await aviso.aoFechar!()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(1)
    expect(wrapper!.text()).not.toContain('Família Souza')
  })

  it('[INTEGRAÇÃO] desfazer a exclusão devolve o convite com as pessoas e não envia DELETE', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CONVITES, () => respostaJson(lista())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaVazia()),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.findAll('[data-teste="excluir-convite"]')[0]!.trigger('click')
    const confirmacao = useConfirmacaoExclusaoStore()
    const aviso = confirmacao.avisoAtual()
    await confirmacao.confirmar()
    await flushPromises()
    expect(wrapper!.text()).not.toContain('Família Souza')

    await aviso.desfazer!()
    await aviso.aoFechar!()
    await flushPromises()

    expect(wrapper!.text()).toContain('Família Souza')
    expect(wrapper!.text()).toContain('Carla Souza')
    expect(wrapper!.text()).toContain('Pedro Souza')
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(0)
  })

  it('[SEGURANÇA] sem permissão na efetivação o convite volta para a lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_CONVITES, () => respostaJson(lista())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaProblema(403)),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.findAll('[data-teste="excluir-convite"]')[0]!.trigger('click')
    const confirmacao = useConfirmacaoExclusaoStore()
    const aviso = confirmacao.avisoAtual()
    await confirmacao.confirmar()
    await flushPromises()
    await aviso.aoFechar!()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(1)
    expect(wrapper!.text()).toContain('Família Souza')
  })

  it('[COMPONENTE] adicionar convite navega para o formulário', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.get('[data-teste="adicionar-convite"]').trigger('click')

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('convite-novo'), { timeout: 5000 })
  }, 20_000)

  it('[COMPONENTE] importar planilha navega para a importação', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    await wrapper!.get('[data-teste="importar-planilha"]').trigger('click')

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('convidados-importar'), { timeout: 5000 })
  }, 20_000)

  it('[COMPONENTE] lista vazia oferece importar planilha e arquivado esconde a ação', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(lista({ convites: [], totais: { ...TOTAIS, convites: 0, pessoas: 0 } })))
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.find('[data-teste="importar-planilha-vazio"]').exists()).toBe(true)
    expect(wrapper!.text()).toContain('Já tem a lista numa planilha? Importe de uma vez.')
    wrapper!.unmount()
    wrapper = undefined
    document.body.innerHTML = ''

    rotearFetch(fetchSimulado, ...rotasPadrao(lista({ eventoArquivado: true }), true))
    await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(wrapper!.find('[data-teste="importar-planilha"]').exists()).toBe(false)
  })
})

describe('ConviteFormularioView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] valida campos obrigatórios e formato sem chamar a API', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    expect(document.activeElement?.id).toBe('convite-nome')
    await wrapper!.get('[data-teste="campo-telefone"]').setValue('123')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    const erros = wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toContain('Preencha este campo.')
    expect(erros).toContain(TEXTOS_CONVIDADOS.erroTelefone)
    expect(document.activeElement?.id).toBe('convite-pessoa-0-nome')
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONVITES)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] cria convite com duas pessoas e volta para a lista', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('POST', ROTA_CONVITES, () => respostaJson(convite(), 201)),
    )
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    await wrapper!.get('[data-teste="campo-nome-convite"]').setValue('  ')
    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('  Carla   Souza ')
    await wrapper!.get('[data-teste="campo-telefone"]').setValue('(11) 98765-4321')
    await wrapper!.get('[data-teste="adicionar-item"]').trigger('click')
    await flushPromises()
    await wrapper!.findAll('[data-teste="campo-nome-pessoa"]')[1]!.setValue('Pedro Souza')
    const crianca = wrapper!.findAll('[data-teste="campo-faixa-etaria"]')[1]!.findAll('button').find((botao) => botao.text() === 'Criança')
    await crianca!.trigger('click')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    const chamada = chamadas(fetchSimulado, 'POST', ROTA_CONVITES)[0]!
    expect(corpoDaChamada(chamada)).toEqual({
      nome: null,
      grupo: null,
      limiteAcompanhantes: 0,
      convidados: [
        { id: null, nome: 'Carla Souza', telefone: '(11) 98765-4321', email: null, faixaEtaria: 'Adulto', resposta: 'Pendente' },
        { id: null, nome: 'Pedro Souza', telefone: null, email: null, faixaEtaria: 'Crianca', resposta: 'Pendente' },
      ],
    })
    expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados')
  })

  it('[INTEGRAÇÃO] depois de salvar, a lista de convites é buscada uma única vez', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('POST', ROTA_CONVITES, () => respostaJson(convite(), 201)),
    )
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)
    const antes = chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados'))
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length - antes).toBe(1)
    expect(wrapper!.text()).toContain('Família Souza')
  })

  it('[COMPONENTE] remover uma pessoa preserva e reindexa os erros das demais', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    await wrapper!.get('[data-teste="campo-nome-convite"]').setValue('X')
    await wrapper!.get('[data-teste="adicionar-item"]').trigger('click')
    await flushPromises()
    await wrapper!.findAll('[data-teste="campo-nome-pessoa"]')[1]!.setValue('Bia')
    await wrapper!.findAll('[data-teste="campo-telefone"]')[1]!.setValue('123')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()
    expect(wrapper!.find('#convite-pessoa-0-nome-erro').exists()).toBe(true)
    expect(wrapper!.find('#convite-pessoa-1-telefone-erro').exists()).toBe(true)

    await wrapper!.findAll('[data-teste="remover-item"]')[0]!.trigger('click')
    await flushPromises()

    expect(wrapper!.find('#convite-pessoa-0-nome-erro').exists()).toBe(false)
    expect(wrapper!.get('#convite-pessoa-0-telefone-erro').text()).toContain(TEXTOS_CONVIDADOS.erroTelefone)
    expect(wrapper!.get('#convite-nome-erro').text()).toContain(TEXTOS_CONVIDADOS.erroNome)
  })

  it('[COMPONENTE] erro 400 da API aparece no campo da pessoa correspondente', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('POST', ROTA_CONVITES, () =>
        respostaProblema(400, { errors: { 'Convidados[0].Email': ['Informe um e-mail válido, como nome@exemplo.com.'] } }),
      ),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('#convite-pessoa-0-email-erro').text()).toContain('Informe um e-mail válido')
    expect(document.activeElement?.id).toBe('convite-pessoa-0-email')
  })

  it('[COMPONENTE] 422 de evento arquivado aparece como mensagem do formulário', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('POST', ROTA_CONVITES, () => respostaProblema(422, { detail: TEXTOS_CONVIDADOS.avisoArquivado })),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_CONVIDADOS.avisoArquivado)
  })

  it('[INTEGRAÇÃO] edição preenche os dados, preserva ids e envia PUT', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
      quando('PUT', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
    )
    await abrir(`/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`)

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CONVIDADOS.editarConviteTitulo)
    expect((wrapper!.get('[data-teste="campo-nome-convite"]').element as HTMLInputElement).value).toBe('Família Souza')
    expect((wrapper!.findAll('[data-teste="campo-telefone"]')[0]!.element as HTMLInputElement).value).toBe('(11) 98765-4321')
    expect(wrapper!.find('[data-teste="excluir-convite"]').exists()).toBe(true)

    await wrapper!.findAll('[data-teste="remover-item"]')[1]!.trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    const corpo = corpoDaChamada(chamadas(fetchSimulado, 'PUT', `${ROTA_CONVITES}/${ID_CONVITE}`)[0]!) as { convidados: { id: string | null; resposta: string }[] }
    expect(corpo.convidados).toHaveLength(1)
    expect(corpo.convidados[0]).toMatchObject({ id: 'p1', resposta: 'Confirmado' })
  })

  it('[INTEGRAÇÃO] excluir pela edição volta para a lista sem o convite e desfazer o devolve sem DELETE', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaVazia()),
    )
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`)

    await wrapper!.get('[data-teste="excluir-convite"]').trigger('click')
    const confirmacao = useConfirmacaoExclusaoStore()
    const aviso = confirmacao.avisoAtual()
    expect(aviso.desfazer).toBeTypeOf('function')
    await confirmacao.confirmar()
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados'), { timeout: 5000 })
    await flushPromises()

    await vi.waitFor(() => expect(wrapper!.text()).toContain('Marcos Lima'), { timeout: 5000 })
    expect(wrapper!.text()).not.toContain('Família Souza')
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(0)

    await aviso.desfazer!()
    await aviso.aoFechar!()
    await flushPromises()

    expect(wrapper!.text()).toContain('Família Souza')
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(0)
  })

  it('[SEGURANÇA] convite inexistente ou de outra organização mostra "Convite não encontrado"', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())

    await abrir(`/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.conviteNaoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="formulario-convite"]').exists()).toBe(false)
  })

  it('[COMPONENTE] evento arquivado deixa o formulário somente leitura', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao(lista({ eventoArquivado: true }), true))

    await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    expect(wrapper!.find('[data-teste="aviso-arquivado"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="salvar-convite"]').attributes('disabled')).toBeDefined()
    expect(wrapper!.find('[data-teste="remover-item"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] rota de edição exige GUID no id do convite', async () => {
    rotearFetch(fetchSimulado)
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/convidados/abc/editar`)

    expect(montagem.roteador.currentRoute.value.name).toBe('nao-encontrado')
  })
})

describe('Bloco de convidados na página do evento', () => {
  it('[COMPONENTE] mostra os totais vindos de /totais e o atalho para gerenciar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_CONVITES}/totais`, () => respostaJson(TOTAIS)),
    )
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}`)

    const bloco = wrapper!.get('[data-teste="bloco-convidados"]')
    expect(bloco.text()).toContain('3')
    expect(bloco.text()).toContain('3 de 150 estimados')
    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES)).toHaveLength(0)

    await bloco.get('[data-teste="gerenciar-convidados"]').trigger('click')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados'))
  })

  it('[COMPONENTE] sem convites mostra estado vazio com "Adicionar convite"', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_CONVITES}/totais`, () => respostaJson({ ...TOTAIS, convites: 0, pessoas: 0 })),
    )

    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.blocoVazioTitulo)
    expect(wrapper!.find('[data-teste="adicionar-convite-bloco"]').exists()).toBe(true)
  })

  it('[COMPONENTE] falha nos totais não derruba a página do evento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_CONVITES}/totais`, () => respostaProblema(500)),
    )

    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.get('[data-teste="erro-bloco-convidados"]').text()).toContain(TEXTOS_CONVIDADOS.erroCarregar)
    expect(wrapper!.text()).toContain('Capela São José')
  })

  it('[SEGURANÇA] sem permissão no módulo o bloco fica oculto', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_CONVITES}/totais`, () => respostaProblema(403)),
    )

    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.find('[data-teste="bloco-convidados"]').exists()).toBe(false)
  })
})
