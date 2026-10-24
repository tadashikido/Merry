import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('convite-novo', 'convite-editar', 'evento-convidados')

const ID_CONVITE = '33333333-3333-4333-8333-333333333333'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const CAMINHO_NOVO = `/eventos/${ID_EVENTO}/convidados/novo`
const CAMINHO_EDICAO = `/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`

function convite(): ConviteDto {
  return {
    id: ID_CONVITE,
    nome: 'Família Souza',
    grupo: 'Família da noiva',
    limiteAcompanhantes: 1,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: '11987654321', email: 'carla@exemplo.com', faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

function lista(): ListaConvitesDto {
  return {
    convites: [convite()],
    totais: {
      convites: 1,
      pessoas: 1,
      adultos: 1,
      criancas: 0,
      acompanhantesPermitidos: 1,
      confirmados: { adultos: 1, criancas: 0, total: 1 },
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
  }
}

function rotasPadrao() {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_CONVITES, () => respostaJson(lista())),
  ]
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
  return wrapper
}

function textosDeErro(): string[] {
  return wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
}

describe('ConviteFormularioView reestruturado', { timeout: 20_000 }, () => {
  it('[COMPONENTE] cabeçalho e formulário ficam em .pagina-formulario com o ritmo da fundação', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(CAMINHO_NOVO)

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('h1').text()).toBe(TEXTOS_CONVIDADOS.novoConviteTitulo)
    expect(pagina.find('.pilha.pilha--cartao').exists()).toBe(true)

    const formulario = wrapper!.get('[data-teste="formulario-convite"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['formulario-convite', 'pilha', 'pilha--bloco']))
    expect(formulario.get('fieldset.formulario-convite__grupo').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
    expect(formulario.get('legend.formulario-convite__legenda').classes()).toContain('texto-rotulo')
    expect(formulario.get('legend.formulario-convite__legenda').text()).toBe(TEXTOS_CONVIDADOS.grupoConvite)
    expect(formulario.get('#titulo-pessoas').classes()).toContain('texto-rotulo')
    expect(formulario.get('[data-teste="dados-pessoa"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
    expect(document.activeElement?.id).toBe('convite-nome')
  })

  it('[COMPONENTE] sair de campos inválidos antes de salvar não mostra erro', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(CAMINHO_NOVO)

    await wrapper!.get('[data-teste="campo-nome-convite"]').setValue('X')
    await wrapper!.get('[data-teste="campo-nome-convite"]').trigger('blur')
    await wrapper!.get('[data-teste="campo-nome-pessoa"]').trigger('blur')
    await wrapper!.get('[data-teste="campo-telefone"]').setValue('123')
    await wrapper!.get('[data-teste="campo-telefone"]').trigger('blur')
    await wrapper!.get('[data-teste="campo-email"]').setValue('carla@')
    await wrapper!.get('[data-teste="campo-email"]').trigger('blur')
    await flushPromises()

    expect(textosDeErro()).toEqual([])
    expect(wrapper!.get('[data-teste="campo-telefone"]').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar salvar, digitar valor válido limpa o erro sem sair do campo', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(CAMINHO_NOVO)

    await wrapper!.get('[data-teste="campo-nome-convite"]').setValue('X')
    await wrapper!.get('[data-teste="campo-telefone"]').setValue('123')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()
    expect(wrapper!.find('#convite-nome-erro').exists()).toBe(true)
    expect(wrapper!.find('#convite-pessoa-0-telefone-erro').exists()).toBe(true)
    expect(wrapper!.find('#convite-pessoa-0-nome-erro').exists()).toBe(true)

    await wrapper!.get('[data-teste="campo-telefone"]').setValue('(11) 98765-4321')
    await wrapper!.get('[data-teste="campo-nome-convite"]').setValue('Família Souza')
    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla Souza')
    await flushPromises()

    expect(wrapper!.find('#convite-pessoa-0-telefone-erro').exists()).toBe(false)
    expect(wrapper!.find('#convite-nome-erro').exists()).toBe(false)
    expect(wrapper!.find('#convite-pessoa-0-nome-erro').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONVITES)).toHaveLength(0)
  })

  it('[COMPONENTE] depois de tentar salvar, sair de um campo que ficou inválido mostra o erro', async () => {
    rotearFetch(fetchSimulado, ...rotasPadrao())
    await abrir(CAMINHO_NOVO)

    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()
    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla')
    await flushPromises()
    expect(wrapper!.find('#convite-pessoa-0-email-erro').exists()).toBe(false)

    await wrapper!.get('[data-teste="campo-email"]').setValue('carla@')
    await flushPromises()
    expect(wrapper!.find('#convite-pessoa-0-email-erro').exists()).toBe(false)

    await wrapper!.get('[data-teste="campo-email"]').trigger('blur')
    await flushPromises()
    expect(wrapper!.find('#convite-pessoa-0-email-erro').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] edição mantém "Excluir convite" na barra de ações e envia PUT', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
      quando('PUT', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
    )
    await abrir(CAMINHO_EDICAO)

    const acoes = wrapper!.get('.formulario-convite__acoes')
    expect(acoes.find('[data-teste="excluir-convite"]').exists()).toBe(true)
    expect(acoes.get('.formulario-convite__acoes-principais').find('[data-teste="salvar-convite"]').exists()).toBe(true)

    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_CONVITES}/${ID_CONVITE}`)).toHaveLength(1)
  })

  it('[SEGURANÇA] 403 ao salvar deixa o formulário somente leitura com aviso de permissão', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('POST', ROTA_CONVITES, () => respostaProblema(403, { title: 'Proibido' })),
    )
    await abrir(CAMINHO_NOVO)

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_CONVIDADOS.semPermissao)
    expect(wrapper!.get('[data-teste="salvar-convite"]').attributes('disabled')).toBeDefined()
    expect(wrapper!.find('[data-teste="remover-item"]').exists()).toBe(false)
  })

  it('[COMPONENTE] falha do serviço ao carregar a edição mostra erro com volta para convidados', async () => {
    rotearFetch(
      fetchSimulado,
      ...rotasPadrao(),
      quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaProblema(500, { title: 'Erro interno' })),
    )
    await abrir(CAMINHO_EDICAO)

    expect(wrapper!.text()).toContain(TEXTOS_CONVIDADOS.erroCarregarTitulo)
    expect(wrapper!.get('.pilha.pilha--cartao').find('[data-teste="voltar-convidados"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="formulario-convite"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos usam @container e ritmo, sem @media, espaços soltos nem largura própria', () => {
    const fonte = readFileSync(resolve(__dirname, '../ConviteFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).toContain('container: formulario-convite / inline-size')
    expect(estilo).toContain('container: pessoa-convite / inline-size')
    expect(estilo).toMatch(/@container formulario-convite \(min-width: 32rem\)/)
    expect(estilo).toMatch(/@container pessoa-convite \(min-width: 28rem\)/)
    expect(estilo).not.toMatch(/--p-espaco-/)
    const foraDeContainer = estilo.replace(/@container[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    expect(foraDeContainer).not.toMatch(/^\s*max-width:/m)
    expect(estilo).not.toMatch(/@container formulario-convite-tela /)
    expect(estilo).not.toMatch(/calc\(-1/)
    expect(estilo).not.toMatch(/\d+px/)
    expect(fonte).not.toMatch(/validarCampoConvite\('nome'\)"|@blur="validarCampoPessoa/)
  })
})
