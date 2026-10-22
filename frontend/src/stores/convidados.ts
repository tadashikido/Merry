import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento } from '@/stores/eventos'
import { useExclusoesAdiadasStore } from '@/stores/exclusoesAdiadas'
import type {
  ConviteDto,
  FaixaEtaria,
  ListaConvitesDto,
  RespostaRsvp,
  SalvarConviteRequest,
  TotaisConvidadosDto,
  TotaisPorFaixaDto,
} from '@/tipos/convidados'
import type { LinkRsvpDto } from '@/tipos/rsvp'

export type FalhaConvidados = FalhaEvento

export type ResultadoConvidados<T> = { ok: true; valor: T } | { ok: false; falha: FalhaConvidados }

function minusculaInicial(segmento: string): string {
  return segmento.charAt(0).toLowerCase() + segmento.slice(1)
}

export function normalizarChaveCampo(chave: string): string {
  return chave.replace(/^\$\./, '').split('.').map(minusculaInicial).join('.')
}

export function interpretarFalhaConvidados(falha: unknown): FalhaConvidados {
  const interpretada = interpretarFalhaEvento(falha)
  const errosCampos: Record<string, string> = {}
  for (const [chave, mensagem] of Object.entries(interpretada.errosCampos)) {
    errosCampos[normalizarChaveCampo(chave)] = mensagem
  }
  return { ...interpretada, errosCampos }
}

export function rotaConvites(eventoId: string, conviteId?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/convites`
  return conviteId ? `${base}/${encodeURIComponent(conviteId)}` : base
}

export function escopoConvites(eventoId: string): string {
  return `convites:${eventoId}`
}

function descontarFaixa(totais: TotaisPorFaixaDto, adultos: number, criancas: number): TotaisPorFaixaDto {
  return {
    adultos: totais.adultos - adultos,
    criancas: totais.criancas - criancas,
    total: totais.total - adultos - criancas,
  }
}

export function descontarConvite(totais: TotaisConvidadosDto, convite: ConviteDto): TotaisConvidadosDto {
  const contar = (resposta: RespostaRsvp | null, faixa: FaixaEtaria) =>
    convite.convidados.filter((pessoa) => (resposta === null || pessoa.resposta === resposta) && pessoa.faixaEtaria === faixa).length
  const acompanhantes = convite.convidados.filter((pessoa) => pessoa.acompanhante).length
  const adultos = contar(null, 'Adulto')
  const criancas = contar(null, 'Crianca')

  return {
    convites: totais.convites - 1,
    pessoas: totais.pessoas - adultos - criancas,
    adultos: totais.adultos - adultos,
    criancas: totais.criancas - criancas,
    acompanhantesPermitidos: totais.acompanhantesPermitidos - Math.max(0, convite.limiteAcompanhantes - acompanhantes),
    pendentes: descontarFaixa(totais.pendentes, contar('Pendente', 'Adulto'), contar('Pendente', 'Crianca')),
    confirmados: descontarFaixa(totais.confirmados, contar('Confirmado', 'Adulto'), contar('Confirmado', 'Crianca')),
    recusados: descontarFaixa(totais.recusados, contar('Recusado', 'Adulto'), contar('Recusado', 'Crianca')),
  }
}

export const useConvidadosStore = defineStore('convidados', () => {
  const exclusoes = useExclusoesAdiadasStore()
  const eventoId = ref<string | null>(null)
  const lista = ref<ListaConvitesDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaConvidados | null>(null)

  const convitesOcultos = new Map<string, ConviteDto>()

  const eventoIdTotais = ref<string | null>(null)
  const totais = ref<TotaisConvidadosDto | null>(null)
  const carregandoTotais = ref(false)
  const falhaTotais = ref<FalhaConvidados | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      lista.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaConvitesDto>(rotaConvites(id))
      if (eventoId.value === id) {
        lista.value = ocultarPendentes(id, resposta)
      }
    } catch (erro) {
      if (eventoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  function ocultarPendentes(id: string, atual: ListaConvitesDto): ListaConvitesDto {
    const pendentes = exclusoes.chavesPendentes(escopoConvites(id))
    if (pendentes.size === 0) {
      return atual
    }
    const removidos = atual.convites.filter((convite) => pendentes.has(convite.id))
    return {
      ...atual,
      convites: atual.convites.filter((convite) => !pendentes.has(convite.id)),
      totais: removidos.reduce(descontarConvite, atual.totais),
    }
  }

  function descontarOcultos(id: string, atual: TotaisConvidadosDto): TotaisConvidadosDto {
    const pendentes = exclusoes.chavesPendentes(escopoConvites(id))
    return [...convitesOcultos.entries()]
      .filter(([conviteId]) => pendentes.has(conviteId))
      .reduce((parcial, [, convite]) => descontarConvite(parcial, convite), atual)
  }

  async function carregarTotais(id: string): Promise<void> {
    if (eventoIdTotais.value !== id) {
      totais.value = null
    }
    eventoIdTotais.value = id
    carregandoTotais.value = true
    falhaTotais.value = null

    try {
      const resposta = await requisitar<TotaisConvidadosDto>(`${rotaConvites(id)}/totais`)
      if (eventoIdTotais.value === id) {
        totais.value = descontarOcultos(id, resposta)
      }
    } catch (erro) {
      if (eventoIdTotais.value === id) {
        totais.value = null
        falhaTotais.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (eventoIdTotais.value === id) {
        carregandoTotais.value = false
      }
    }
  }

  async function obter(id: string, conviteId: string): Promise<ResultadoConvidados<ConviteDto>> {
    try {
      return { ok: true, valor: await requisitar<ConviteDto>(rotaConvites(id, conviteId)) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function aposAlteracao(id: string) {
    if (eventoIdTotais.value === id) {
      totais.value = null
      eventoIdTotais.value = null
    }
  }

  async function executar<T>(id: string, acao: () => Promise<T>): Promise<ResultadoConvidados<T>> {
    try {
      const valor = await acao()
      aposAlteracao(id)
      return { ok: true, valor }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  async function criar(id: string, request: SalvarConviteRequest): Promise<ResultadoConvidados<ConviteDto>> {
    await exclusoes.efetivarEscopo(escopoConvites(id))
    return executar(id, () => requisitar<ConviteDto>(rotaConvites(id), { metodo: 'POST', corpo: request }))
  }

  async function atualizar(id: string, conviteId: string, request: SalvarConviteRequest): Promise<ResultadoConvidados<ConviteDto>> {
    await exclusoes.efetivarEscopo(escopoConvites(id))
    return executar(id, () => requisitar<ConviteDto>(rotaConvites(id, conviteId), { metodo: 'PUT', corpo: request }))
  }

  function remover(id: string, conviteId: string): Promise<ResultadoConvidados<void>> {
    return executar(id, () => requisitar<void>(rotaConvites(id, conviteId), { metodo: 'DELETE' }))
  }

  async function recarregarSeAtual(id: string): Promise<void> {
    if (eventoId.value === id) {
      await carregar(id)
    }
  }

  function removerComDesfazer(id: string, conviteId: string, aoFalhar?: (falha: FalhaConvidados) => void) {
    let falhaEfetivacao: FalhaConvidados | null = null
    exclusoes.agendar({
      escopo: escopoConvites(id),
      chave: conviteId,
      efetivar: async () => {
        const resultado = await executar(id, () =>
          requisitar<void>(rotaConvites(id, conviteId), { metodo: 'DELETE', manterAtiva: true }),
        )
        convitesOcultos.delete(conviteId)
        if (!resultado.ok) {
          falhaEfetivacao = resultado.falha
          await recarregarTotaisSeAtuais(id)
        }
        await recarregarSeAtual(id)
        return resultado.ok
      },
      aoFalhar: () => {
        if (falhaEfetivacao) {
          aoFalhar?.(falhaEfetivacao)
        }
      },
    })
    const convite = eventoId.value === id ? lista.value?.convites.find((atual) => atual.id === conviteId) : undefined
    if (convite) {
      convitesOcultos.set(conviteId, convite)
      if (eventoIdTotais.value === id && totais.value) {
        totais.value = descontarConvite(totais.value, convite)
      }
    }
    if (eventoId.value === id && lista.value) {
      lista.value = ocultarPendentes(id, lista.value)
    }
  }

  async function desfazerRemocao(id: string, conviteId: string): Promise<boolean> {
    if (!exclusoes.desfazer(escopoConvites(id), conviteId)) {
      return false
    }
    convitesOcultos.delete(conviteId)
    await Promise.all([recarregarSeAtual(id), recarregarTotaisSeAtuais(id)])
    return true
  }

  async function recarregarTotaisSeAtuais(id: string): Promise<void> {
    if (eventoIdTotais.value === id) {
      await carregarTotais(id)
    }
  }

  function concluirRemocao(id: string, conviteId: string): Promise<void> {
    return exclusoes.efetivar(escopoConvites(id), conviteId)
  }

  function substituirConvite(id: string, convite: ConviteDto) {
    if (eventoId.value !== id || !lista.value) {
      return
    }
    lista.value = {
      ...lista.value,
      convites: lista.value.convites.map((atual) => (atual.id === convite.id ? convite : atual)),
    }
  }

  function rotaLinkRsvp(id: string, conviteId: string, acao?: string): string {
    const base = `${rotaConvites(id, conviteId)}/link-rsvp`
    return acao ? `${base}/${acao}` : base
  }

  async function tentar<T>(acao: () => Promise<T>): Promise<ResultadoConvidados<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function obterOuGerarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId), { metodo: 'POST' }))
  }

  function consultarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId)))
  }

  function regenerarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId, 'regenerar'), { metodo: 'POST' }))
  }

  function revogarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<void>> {
    return tentar(() => requisitar<void>(rotaLinkRsvp(id, conviteId), { metodo: 'DELETE' }))
  }

  async function marcarEnviado(id: string, conviteId: string): Promise<ResultadoConvidados<ConviteDto>> {
    await exclusoes.efetivarEscopo(escopoConvites(id))
    const resultado = await tentar(() => requisitar<ConviteDto>(`${rotaConvites(id, conviteId)}/envio`, { metodo: 'POST' }))
    if (resultado.ok) {
      substituirConvite(id, resultado.valor)
    }
    return resultado
  }

  function invalidar(id: string) {
    aposAlteracao(id)
  }

  function limpar() {
    convitesOcultos.clear()
    eventoId.value = null
    lista.value = null
    carregando.value = false
    falha.value = null
    eventoIdTotais.value = null
    totais.value = null
    carregandoTotais.value = false
    falhaTotais.value = null
  }

  const autenticacao = useAutenticacaoStore()
  watch(
    () => autenticacao.usuario?.organizacao.id ?? null,
    (organizacaoAtual, organizacaoAnterior) => {
      if (organizacaoAtual !== organizacaoAnterior) {
        limpar()
      }
    },
  )

  return {
    eventoId,
    lista,
    carregando,
    falha,
    eventoIdTotais,
    totais,
    carregandoTotais,
    falhaTotais,
    carregar,
    carregarTotais,
    obter,
    criar,
    atualizar,
    remover,
    removerComDesfazer,
    desfazerRemocao,
    concluirRemocao,
    obterOuGerarLinkRsvp,
    consultarLinkRsvp,
    regenerarLinkRsvp,
    revogarLinkRsvp,
    marcarEnviado,
    invalidar,
    limpar,
  }
})
