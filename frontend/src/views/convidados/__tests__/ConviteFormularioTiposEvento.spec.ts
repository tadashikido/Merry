import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('convite-novo', 'convite-editar', 'evento-convidados')

const ID_CONVITE = '33333333-3333-4333-8333-333333333333'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const CAMINHO_NOVO = `/eventos/${ID_EVENTO}/convidados/novo`
const CAMINHO_EDICAO = `/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`

function convite(id: string, grupo: string | null): ConviteDto {
  return {
    id,
    nome: `Convite ${id}`,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: `p-${id}`, nome: 'Carla Souza', telefone: '11987654321', email: 'carla@exemplo.com', faixaEtaria: 'Adulto', resposta: 'Pendente', acompanhante: false, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

function lista(convites: ConviteDto[]): ListaConvitesDto {
  return {
    convites,
    totais: {
      convites: convites.length,
      pessoas: convites.length,
      adultos: convites.length,
      criancas: 0,
      acompanhantesPermitidos: 0,
      confirmados: { adultos: 0, criancas: 0, total: 0 },
      pendentes: { adultos: convites.length, criancas: 0, total: convites.length },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
  }
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

async function abrir(caminho: string, tipo: TipoEvento, convites: ConviteDto[] = [], segundo: string | null = null) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo, nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: segundo }))),
    quando('GET', ROTA_CONVITES, () => respostaJson(lista(convites))),
    quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson({ ...convite(ID_CONVITE, 'Família'), nome: 'Família Souza' })),
    quando('POST', ROTA_CONVITES, () => respostaJson(convite(ID_CONVITE, null))),
  )
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function dicaGrupo(): string {
  return wrapper!.get('#convite-grupo-dica').text()
}

async function digitarGrupo(valor: string) {
  await wrapper!.get('#convite-grupo').setValue(valor)
  await flushPromises()
}

describe('ConviteFormularioView por tipo de evento', { timeout: 20_000 }, () => {
  it('[COMPONENTE] dica do grupo cita os grupos da festa de 15 anos', async () => {
    await abrir(CAMINHO_NOVO, 'QuinzeAnos')

    expect(dicaGrupo()).toBe('Por exemplo: Família, Corte, Amigos da escola ou Amigos da família.')
    expect(dicaGrupo()).not.toContain('Padrinhos')
  })

  it('[COMPONENTE] dica do grupo no aniversário cita Vizinhos e não Padrinhos', async () => {
    await abrir(CAMINHO_NOVO, 'Aniversario')

    expect(dicaGrupo()).toBe('Por exemplo: Família, Amigos, Trabalho ou Vizinhos.')
  })

  it('[COMPONENTE] tipo desconhecido usa grupos e frase neutros, sem casamento', async () => {
    await abrir(CAMINHO_NOVO, 'Corporativo' as TipoEvento)

    expect(dicaGrupo()).toBe('Por exemplo: Família, Amigos ou Convidados de honra.')
    expect(wrapper!.get('[data-teste="previa-celebracao"]').text()).toBe('vai celebrar')
    expect(wrapper!.get('main').text()).not.toMatch(/casamento|casar|padrinhos/i)
  })

  it('[COMPONENTE] grupo já usado no evento troca a dica pela contagem, com o rótulo existente', async () => {
    await abrir(CAMINHO_NOVO, 'Casamento', [convite('a', 'Família'), convite('b', 'família'), convite('c', 'Amigos')], 'Rui')

    await digitarGrupo('FAMILIA')
    expect(dicaGrupo()).toBe(TEXTOS_CONVIDADOS.dicaGrupoExistente(2, 'Família'))

    await digitarGrupo('Amigos')
    expect(dicaGrupo()).toBe('1 outro convite já está em Amigos.')

    await digitarGrupo('Vizinhos')
    expect(dicaGrupo()).toBe('Por exemplo: Família, Padrinhos, Amigos ou Trabalho.')
  })

  it('[COMPONENTE] edição desconta o próprio convite da contagem do grupo', async () => {
    await abrir(CAMINHO_EDICAO, 'Casamento', [convite(ID_CONVITE, 'Família'), convite('b', 'Família')], 'Rui')

    expect(dicaGrupo()).toBe('1 outro convite já está em Família.')
  })

  it('[COMPONENTE] prévia acompanha o que é digitado e não mostra contatos', async () => {
    await abrir(CAMINHO_NOVO, 'Casamento', [], 'Rui')

    const previa = () => wrapper!.get('[data-teste="previa-convite"]')
    expect(previa().get('[data-teste="previa-celebracao"]').text()).toBe('vão se casar')
    expect(previa().get('[data-teste="previa-nome-convite"]').text()).toBe('Nome do convite')

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla Souza')
    await wrapper!.get('[data-teste="campo-telefone"]').setValue('(11) 98765-4321')
    await wrapper!.get('[data-teste="campo-email"]').setValue('carla@exemplo.com')
    await flushPromises()

    expect(previa().get('[data-teste="previa-nome-convite"]').text()).toBe('Carla Souza')
    expect(previa().get('[data-teste="previa-pessoa"]').text()).toBe('Carla Souza')
    expect(previa().text()).not.toContain('98765')
    expect(previa().text()).not.toContain('carla@exemplo.com')
    expect(previa().get('[data-teste="previa-prazo"]').text()).toContain('5 de maio')
  })

  it('[INTEGRAÇÃO] salvar envia o mesmo contrato, sem campo novo', async () => {
    await abrir(CAMINHO_NOVO, 'QuinzeAnos')

    await wrapper!.get('[data-teste="campo-nome-pessoa"]').setValue('Carla Souza')
    await digitarGrupo('Corte')
    await wrapper!.get('[data-teste="formulario-convite"]').trigger('submit')
    await flushPromises()

    const [envio] = chamadas(fetchSimulado, 'POST', ROTA_CONVITES)
    const corpo = JSON.parse(String(envio?.[1]?.body)) as Record<string, unknown>
    expect(Object.keys(corpo).sort()).toEqual(['convidados', 'grupo', 'limiteAcompanhantes', 'nome'])
    expect(corpo.grupo).toBe('Corte')
  })

  it('[COMPONENTE] lateral com a prévia ativa o modificador da página e fica depois do formulário', async () => {
    await abrir(CAMINHO_NOVO, 'Casamento')

    const pagina = wrapper!.get('.formulario-convite-tela__pagina')
    expect(pagina.classes()).toContain('formulario-convite-tela__pagina--com-lateral')
    const corpo = wrapper!.get('.formulario-convite-tela__corpo').element
    expect(corpo.lastElementChild?.classList.contains('formulario-convite-tela__lateral')).toBe(true)
  })

  it('[COMPONENTE] falha ao carregar o evento mantém o formulário sem lateral', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaProblema(500, { title: 'Erro interno' })),
      quando('GET', ROTA_CONVITES, () => respostaJson(lista([]))),
    )
    const montagem = await prepararAplicacao(CAMINHO_NOVO)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.find('[data-teste="formulario-convite"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="previa-convite"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-convite-tela__pagina').classes()).not.toContain('formulario-convite-tela__pagina--com-lateral')
    expect(dicaGrupo()).toBe('Por exemplo: Família, Amigos ou Convidados de honra.')
  })
})
