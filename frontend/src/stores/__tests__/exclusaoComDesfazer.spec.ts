import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { mapaExemplo, MESA_NOIVOS, MESA_PADRINHOS } from '@/__tests__/auxiliaresMesas'
import { descontarConvite, useConvidadosStore } from '@/stores/convidados'
import { useCronogramaStore } from '@/stores/cronograma'
import { ocultarMesas, useMesasStore } from '@/stores/mesas'
import type { ConviteDto, ListaConvitesDto, TotaisConvidadosDto } from '@/tipos/convidados'
import type { MapaMesasDto, MesaDto } from '@/tipos/mesas'
import { chamadas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const CASAMENTO = '11111111-1111-4111-8111-111111111111'
const OUTRO_CASAMENTO = '22222222-2222-4222-8222-222222222222'
const ROTA_CONVITES = `/api/casamentos/${CASAMENTO}/convites`
const ROTA_MESAS = `/api/casamentos/${CASAMENTO}/mesas`
const ROTA_CRONOGRAMA = `/api/casamentos/${CASAMENTO}/cronograma`
const ID_SOUZA = 'c-souza'
const ID_LIMA = 'c-lima'

const TOTAIS: TotaisConvidadosDto = {
  convites: 2,
  pessoas: 4,
  adultos: 3,
  criancas: 1,
  acompanhantesPermitidos: 1,
  pendentes: { adultos: 0, criancas: 1, total: 1 },
  confirmados: { adultos: 2, criancas: 0, total: 2 },
  recusados: { adultos: 1, criancas: 0, total: 1 },
}

function conviteSouza(): ConviteDto {
  return {
    id: ID_SOUZA,
    nome: 'Família Souza',
    grupo: null,
    limiteAcompanhantes: 2,
    statusEnvio: 'Visualizado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: true },
      { id: 'p2', nome: 'Pedro Souza', telefone: null, email: null, faixaEtaria: 'Crianca', resposta: 'Pendente', acompanhante: false, possuiRestricao: false },
      { id: 'p3', nome: 'Rafa', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: true, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: '2026-10-01T12:00:00Z',
  }
}

function conviteLima(): ConviteDto {
  return {
    ...conviteSouza(),
    id: ID_LIMA,
    nome: 'Marcos Lima',
    limiteAcompanhantes: 0,
    convidados: [
      { id: 'p4', nome: 'Marcos Lima', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Recusado', acompanhante: false, possuiRestricao: false },
    ],
  }
}

function listaConvites(): ListaConvitesDto {
  return { convites: [conviteSouza(), conviteLima()], totais: TOTAIS, convidadosEstimados: null, casamentoArquivado: false }
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exclusão com desfazer — convites', () => {
  it('[UNITÁRIO] descontarConvite tira pessoas, respostas e acompanhantes permitidos do convite', () => {
    const totais = descontarConvite(TOTAIS, conviteSouza())

    expect(totais).toEqual({
      convites: 1,
      pessoas: 1,
      adultos: 1,
      criancas: 0,
      acompanhantesPermitidos: 0,
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      confirmados: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 1, criancas: 0, total: 1 },
    })
  })

  it('[INTEGRAÇÃO] oculta o convite na hora sem DELETE e desfazer recarrega com respostas e acompanhantes', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())))
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)

    store.removerComDesfazer(CASAMENTO, ID_SOUZA)

    expect(store.lista?.convites.map((convite) => convite.id)).toEqual([ID_LIMA])
    expect(store.lista?.totais.convites).toBe(1)
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`)).toHaveLength(0)

    await store.carregar(CASAMENTO)
    expect(store.lista?.convites.map((convite) => convite.id)).toEqual([ID_LIMA])

    expect(await store.desfazerRemocao(CASAMENTO, ID_SOUZA)).toBe(true)

    const restaurado = store.lista?.convites.find((convite) => convite.id === ID_SOUZA)
    expect(restaurado?.convidados).toEqual(conviteSouza().convidados)
    expect(store.lista?.totais).toEqual(TOTAIS)
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`)).toHaveLength(0)
    expect(await store.desfazerRemocao(CASAMENTO, ID_SOUZA)).toBe(false)
  })

  it('[INTEGRAÇÃO] concluir envia um único DELETE e desfazer depois informa que já foi concluída', async () => {
    let lista = listaConvites()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CONVITES, () => respostaJson(lista)),
      quando('DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`, () => {
        lista = { ...lista, convites: [conviteLima()] }
        return respostaVazia()
      }),
    )
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)
    store.removerComDesfazer(CASAMENTO, ID_SOUZA)

    await Promise.all([store.concluirRemocao(CASAMENTO, ID_SOUZA), store.concluirRemocao(CASAMENTO, ID_SOUZA)])

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`)).toHaveLength(1)
    expect(store.lista?.convites.map((convite) => convite.id)).toEqual([ID_LIMA])
    expect(await store.desfazerRemocao(CASAMENTO, ID_SOUZA)).toBe(false)
  })

  it('[INTEGRAÇÃO] totais do painel descontam o convite pendente e voltam ao desfazer', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())),
      quando('GET', `${ROTA_CONVITES}/totais`, () => respostaJson(TOTAIS)),
    )
    const store = useConvidadosStore()
    await Promise.all([store.carregar(CASAMENTO), store.carregarTotais(CASAMENTO)])

    store.removerComDesfazer(CASAMENTO, ID_SOUZA)
    expect(store.totais?.convites).toBe(1)
    await store.carregarTotais(CASAMENTO)
    expect(store.totais).toEqual(descontarConvite(TOTAIS, conviteSouza()))

    await store.desfazerRemocao(CASAMENTO, ID_SOUZA)
    expect(store.totais).toEqual(TOTAIS)
  })

  it('[INTEGRAÇÃO] a efetivação pede keepalive para sobreviver ao fechamento da aba', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`, () => respostaVazia()),
    )
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)
    store.removerComDesfazer(CASAMENTO, ID_SOUZA)

    await store.concluirRemocao(CASAMENTO, ID_SOUZA)

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`)[0]![1]).toMatchObject({ keepalive: true })
  })

  it('[SEGURANÇA] permissão negada na efetivação devolve o convite e repassa a falha', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`, () => respostaProblema(403)),
    )
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)
    const aoFalhar = vi.fn()
    store.removerComDesfazer(CASAMENTO, ID_SOUZA, aoFalhar)

    await store.concluirRemocao(CASAMENTO, ID_SOUZA)

    expect(aoFalhar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'semPermissao' }))
    expect(store.lista?.convites.map((convite) => convite.id)).toContain(ID_SOUZA)
  })

  it('[INTEGRAÇÃO] simula erro de rede na efetivação: devolve o convite e repassa falha de conexão', async () => {
    fetchSimulado.mockImplementation(async (entrada, init) => {
      if ((init?.method ?? 'GET') === 'DELETE') {
        throw new TypeError('rede')
      }
      return respostaJson(listaConvites())
    })
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)
    const aoFalhar = vi.fn()
    store.removerComDesfazer(CASAMENTO, ID_SOUZA, aoFalhar)

    await store.concluirRemocao(CASAMENTO, ID_SOUZA)

    expect(aoFalhar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'conexao' }))
    expect(store.lista?.convites).toHaveLength(2)
  })

  it('[INTEGRAÇÃO] salvar outro convite efetiva antes a exclusão pendente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())),
      quando('DELETE', `${ROTA_CONVITES}/${ID_SOUZA}`, () => respostaVazia()),
      quando('POST', ROTA_CONVITES, () => respostaJson(conviteLima(), 201)),
    )
    const store = useConvidadosStore()
    await store.carregar(CASAMENTO)
    store.removerComDesfazer(CASAMENTO, ID_SOUZA)

    await store.criar(CASAMENTO, { nome: 'Novo', grupo: null, limiteAcompanhantes: 0, convidados: [] })

    const metodos = fetchSimulado.mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(metodos.indexOf('DELETE')).toBeGreaterThan(-1)
    expect(metodos.indexOf('DELETE')).toBeLessThan(metodos.indexOf('POST'))
  })
})

describe('exclusão com desfazer — mesas', () => {
  it('[UNITÁRIO] ocultarMesas tira a mesa, devolve as pessoas para sem mesa e ajusta os totais', () => {
    const mapa = mapaExemplo()
    const oculto = ocultarMesas(mapa, new Set([MESA_PADRINHOS]))
    const mesasRestantes: MesaDto[] = mapa.mesas.filter((mesa) => mesa.id !== MESA_PADRINHOS)
    const esperado: MapaMesasDto = mapaExemplo({
      mesas: mesasRestantes,
      pessoas: mapa.pessoas.map((pessoa) => (pessoa.mesaId === MESA_PADRINHOS ? { ...pessoa, mesaId: null } : pessoa)),
    })

    expect(oculto.mesas.map((mesa) => mesa.id)).not.toContain(MESA_PADRINHOS)
    expect(oculto.pessoas.find((pessoa) => pessoa.id === 'p-rui')?.mesaId).toBeNull()
    expect(oculto.totais).toEqual(esperado.totais)
    expect(ocultarMesas(mapa, new Set())).toBe(mapa)
  })

  it('[INTEGRAÇÃO] desfazer devolve a mesa com as pessoas sentadas sem enviar DELETE', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MESAS, () => respostaJson(mapaExemplo())))
    const store = useMesasStore()
    await store.carregar(CASAMENTO)

    store.removerMesaComDesfazer(CASAMENTO, MESA_PADRINHOS)
    expect(store.mapa?.mesas.map((mesa) => mesa.id)).not.toContain(MESA_PADRINHOS)

    expect(await store.desfazerRemocaoMesa(CASAMENTO, MESA_PADRINHOS)).toBe(true)

    expect(store.mapa?.mesas.map((mesa) => mesa.id)).toContain(MESA_PADRINHOS)
    expect(store.mapa?.pessoas.find((pessoa) => pessoa.id === 'p-rui')?.mesaId).toBe(MESA_PADRINHOS)
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_MESAS}/${MESA_PADRINHOS}`)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] criar outra mesa efetiva a exclusão pendente antes do POST', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MESAS, () => respostaJson(mapaExemplo())),
      quando('DELETE', `${ROTA_MESAS}/${MESA_PADRINHOS}`, () => respostaVazia()),
      quando('POST', ROTA_MESAS, () => respostaJson(mapaExemplo().mesas[1], 201)),
    )
    const store = useMesasStore()
    await store.carregar(CASAMENTO)
    store.removerMesaComDesfazer(CASAMENTO, MESA_PADRINHOS)

    await store.criarMesa(CASAMENTO, { numero: 2, nome: null, capacidade: 8, especial: false })

    const metodos = fetchSimulado.mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(metodos.indexOf('DELETE')).toBeLessThan(metodos.indexOf('POST'))
    expect(await store.desfazerRemocaoMesa(CASAMENTO, MESA_PADRINHOS)).toBe(false)
  })

  it('[INTEGRAÇÃO] efetivar depois de abrir outro casamento não troca o mapa exibido', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MESAS, () => respostaJson(mapaExemplo())),
      quando('GET', `/api/casamentos/${OUTRO_CASAMENTO}/mesas`, () => respostaJson(mapaExemplo({ mesas: [] }))),
      quando('DELETE', `${ROTA_MESAS}/${MESA_NOIVOS}`, () => respostaVazia()),
    )
    const store = useMesasStore()
    await store.carregar(CASAMENTO)
    store.removerMesaComDesfazer(CASAMENTO, MESA_NOIVOS)
    await store.carregar(OUTRO_CASAMENTO)

    await store.concluirRemocaoMesa(CASAMENTO, MESA_NOIVOS)

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_MESAS}/${MESA_NOIVOS}`)).toHaveLength(1)
    expect(store.casamentoId).toBe(OUTRO_CASAMENTO)
    expect(store.mapa?.mesas).toEqual([])
  })
})

describe('exclusão com desfazer — cronograma', () => {
  it('[INTEGRAÇÃO] oculta o item, desfazer devolve com fornecedor e concluir envia DELETE', async () => {
    const comFornecedor = itemCronograma({ id: 'i1', fornecedor: { fornecedorCasamentoId: 'v1', nomeEmpresa: 'Coral Harmonia', categoria: 'Musica' } })
    const outro = itemCronograma({ id: 'i2', atividade: 'Recepção', inicio: '18:00' })
    let itens = [comFornecedor, outro]
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CRONOGRAMA, () => respostaJson(cronogramaExemplo(itens))),
      quando('DELETE', `${ROTA_CRONOGRAMA}/i1`, () => {
        itens = [outro]
        return respostaVazia()
      }),
    )
    const store = useCronogramaStore()
    await store.carregar(CASAMENTO)

    store.removerComDesfazer(CASAMENTO, 'i1')
    expect(store.cronograma?.itens.map((item) => item.id)).toEqual(['i2'])

    expect(await store.desfazerRemocao(CASAMENTO, 'i1')).toBe(true)
    expect(store.cronograma?.itens.find((item) => item.id === 'i1')?.fornecedor?.nomeEmpresa).toBe('Coral Harmonia')

    store.removerComDesfazer(CASAMENTO, 'i1')
    await store.concluirRemocao(CASAMENTO, 'i1')

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CRONOGRAMA}/i1`)).toHaveLength(1)
    expect(store.cronograma?.itens.map((item) => item.id)).toEqual(['i2'])
  })

  it('[INTEGRAÇÃO] casamento arquivado recusa a efetivação e o item volta', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CRONOGRAMA, () => respostaJson(cronogramaExemplo([itemCronograma()]))),
      quando('DELETE', `${ROTA_CRONOGRAMA}/i1`, () => respostaProblema(422, { title: 'Casamento arquivado.' })),
    )
    const store = useCronogramaStore()
    await store.carregar(CASAMENTO)
    const aoFalhar = vi.fn()
    store.removerComDesfazer(CASAMENTO, 'i1', aoFalhar)

    await store.concluirRemocao(CASAMENTO, 'i1')

    expect(aoFalhar).toHaveBeenCalledTimes(1)
    expect(store.cronograma?.itens.map((item) => item.id)).toEqual(['i1'])
  })
})
