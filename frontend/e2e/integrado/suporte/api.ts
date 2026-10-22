import { expect, type APIRequestContext, type APIResponse } from '@playwright/test'

import { dataFutura, novoAnfitriao, type DadosAssessoria, type DadosAnfitriao } from './dados'

const CABECALHO_AJAX = { 'X-Requested-With': 'XMLHttpRequest' }

export interface Sessao {
  tokenAcesso: string
  usuario: { id: string; nome: string; email: string; papel: string }
}

export interface EventoCriado extends DadosAnfitriao {
  id: string
  data: string
}

export interface PessoaConvite {
  nome: string
  email?: string
  faixaEtaria?: 'Adulto' | 'Crianca'
  resposta?: 'Pendente' | 'Confirmado' | 'Recusado'
}

export interface MesaE2e {
  id: string
  numero: number
  nome: string | null
  capacidade: number
  especial: boolean
  ocupacao: number
}

export interface MapaMesasE2e {
  mesas: MesaE2e[]
  pessoas: { id: string; nome: string; conviteId: string; mesaId: string | null }[]
  avisosSaida: { convidadoId: string; nome: string; resposta: string; mesaId: string | null }[]
  totais: { mesas: number; capacidadeTotal: number; confirmados: number; acomodados: number; lugaresLivres: number; semMesa: number }
}

export interface ConviteCriado {
  id: string
  nome: string
  convidados: { id: string; nome: string }[]
}

export type CategoriaFornecedor = 'Buffet' | 'Fotografia' | 'Musica' | 'Decoracao' | 'Outros'
export type StatusFornecedorEvento = 'Cotacao' | 'EmNegociacao' | 'Contratado' | 'Cancelado'

export interface ItemCronogramaE2e {
  inicio: string
  atividade: string
  dia?: 'Vespera' | 'DiaDoEvento' | 'DiaSeguinte'
  duracaoMinutos?: number | null
  local?: string | null
  responsavel?: string | null
  fornecedorEventoId?: string | null
  instrucoes?: string | null
  notasInternas?: string | null
}

export interface LinksCronogramaE2e {
  destinos: { tipo: string; fornecedorEventoId: string | null; rotulo: string | null; link: { id: string; token: string | null } | null }[]
}

async function exigirSucesso(resposta: APIResponse, operacao: string): Promise<void> {
  expect(resposta.ok(), `${operacao} falhou com ${resposta.status()}: ${await resposta.text()}`).toBeTruthy()
}

export async function cadastrarAssessoria(request: APIRequestContext, dados: DadosAssessoria): Promise<Sessao> {
  const resposta = await request.post('/api/autenticacao/cadastro', { headers: CABECALHO_AJAX, data: dados })
  await exigirSucesso(resposta, 'Cadastro da assessoria')
  return (await resposta.json()) as Sessao
}

export async function entrar(request: APIRequestContext, email: string, senha: string): Promise<Sessao> {
  const resposta = await request.post('/api/autenticacao/entrar', { headers: CABECALHO_AJAX, data: { email, senha } })
  await exigirSucesso(resposta, 'Login')
  return (await resposta.json()) as Sessao
}

export class ClienteApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly tokenAcesso: string,
  ) {}

  private cabecalhos(): Record<string, string> {
    return { ...CABECALHO_AJAX, Authorization: `Bearer ${this.tokenAcesso}` }
  }

  private async enviar<T>(metodo: 'post' | 'put', caminho: string, corpo: object, operacao: string): Promise<T> {
    const resposta = await this.request[metodo](caminho, { headers: this.cabecalhos(), data: corpo })
    await exigirSucesso(resposta, operacao)
    const texto = await resposta.text()
    return (texto ? JSON.parse(texto) : {}) as T
  }

  async criarEvento(dados: Partial<EventoCriado> & { horario?: string; localCerimonia?: string } = {}): Promise<EventoCriado> {
    const anfitriao = { ...novoAnfitriao(), ...dados }
    const data = dados.data ?? dataFutura(180)
    const criado = await this.enviar<{ id: string }>(
      'post',
      '/api/eventos',
      {
        tipo: 'Casamento',
        nomePrimeiraPessoa: anfitriao.nomePrimeiraPessoa,
        nomeSegundaPessoa: anfitriao.nomeSegundaPessoa,
        data,
        horario: dados.horario ?? '16:30',
        localCerimonia: dados.localCerimonia ?? 'Capela Santa Luzia',
        localRecepcao: 'Espaço Jardim',
        convidadosEstimados: 120,
        observacoes: null,
      },
      'Criação do evento',
    )
    return { id: criado.id, data, nomePrimeiraPessoa: anfitriao.nomePrimeiraPessoa, nomeSegundaPessoa: anfitriao.nomeSegundaPessoa }
  }

  async criarConvite(eventoId: string, pessoas: PessoaConvite[], opcoes: { nome?: string; grupo?: string; limiteAcompanhantes?: number } = {}): Promise<ConviteCriado> {
    return this.enviar<ConviteCriado>(
      'post',
      `/api/eventos/${eventoId}/convites`,
      {
        nome: opcoes.nome ?? null,
        grupo: opcoes.grupo ?? null,
        limiteAcompanhantes: opcoes.limiteAcompanhantes ?? 0,
        convidados: pessoas.map((pessoa) => ({
          id: null,
          nome: pessoa.nome,
          telefone: null,
          email: pessoa.email ?? null,
          faixaEtaria: pessoa.faixaEtaria ?? 'Adulto',
          resposta: pessoa.resposta ?? 'Pendente',
        })),
      },
      'Criação do convite',
    )
  }

  async gerarLinkRsvp(eventoId: string, conviteId: string): Promise<string> {
    const resposta = await this.enviar<{ token: string }>(
      'post',
      `/api/eventos/${eventoId}/convites/${conviteId}/link-rsvp`,
      {},
      'Geração do link RSVP',
    )
    return resposta.token
  }

  async criarFornecedor(nomeEmpresa: string, categoria: CategoriaFornecedor = 'Fotografia', telefone: string | null = null): Promise<{ id: string }> {
    return this.enviar<{ id: string }>(
      'post',
      '/api/fornecedores',
      {
        categoria,
        nomeEmpresa,
        responsavel: 'Carlos Lima',
        telefone,
        email: null,
        site: null,
        instagram: null,
        observacoes: null,
      },
      'Criação do fornecedor',
    )
  }

  async vincularFornecedor(
    eventoId: string,
    fornecedorId: string,
    status: StatusFornecedorEvento = 'Contratado',
    valorContratado: number | null = 6000,
  ): Promise<{ id: string }> {
    return this.enviar<{ id: string }>(
      'post',
      `/api/eventos/${eventoId}/fornecedores`,
      {
        fornecedorId,
        servico: 'Cobertura completa',
        valorOrcado: valorContratado,
        valorContratado: status === 'Contratado' ? valorContratado : null,
        status,
        notasInternas: null,
      },
      'Vínculo do fornecedor',
    )
  }

  async criarItemCronograma(eventoId: string, item: ItemCronogramaE2e): Promise<{ id: string }> {
    return this.enviar<{ id: string }>(
      'post',
      `/api/eventos/${eventoId}/cronograma`,
      {
        dia: 'DiaDoEvento',
        duracaoMinutos: 60,
        local: null,
        responsavel: null,
        fornecedorEventoId: null,
        instrucoes: null,
        notasInternas: null,
        ...item,
      },
      'Criação do item do cronograma',
    )
  }

  async atualizarItemCronograma(eventoId: string, itemId: string, item: ItemCronogramaE2e): Promise<void> {
    await this.enviar(
      'put',
      `/api/eventos/${eventoId}/cronograma/${itemId}`,
      { dia: 'DiaDoEvento', duracaoMinutos: 60, local: null, responsavel: null, fornecedorEventoId: null, instrucoes: null, notasInternas: null, ...item },
      'Atualização do item do cronograma',
    )
  }

  async listarLinksCronograma(eventoId: string): Promise<LinksCronogramaE2e> {
    const resposta = await this.request.get(`/api/eventos/${eventoId}/cronograma/links`, { headers: this.cabecalhos() })
    await exigirSucesso(resposta, 'Listagem dos links do cronograma')
    return (await resposta.json()) as LinksCronogramaE2e
  }

  async gerarLinkCronograma(eventoId: string, corpo: { tipo: 'Geral' | 'Fornecedor' | 'Responsavel'; fornecedorEventoId?: string }): Promise<string> {
    const link = await this.enviar<{ token: string }>('post', `/api/eventos/${eventoId}/cronograma/links`, corpo, 'Geração do link do cronograma')
    return link.token
  }

  async situacoesGrandeDia(eventoId: string): Promise<Record<string, string>> {
    const resposta = await this.request.get(`/api/eventos/${eventoId}/grande-dia`, { headers: this.cabecalhos() })
    await exigirSucesso(resposta, 'Consulta do Grande Dia')
    const dados = (await resposta.json()) as { itens: { atividade: string; situacao: string }[] }
    return Object.fromEntries(dados.itens.map((item) => [item.atividade, item.situacao]))
  }

  async criarMesa(eventoId: string, mesa: { numero: number; nome?: string | null; capacidade: number; especial?: boolean }): Promise<MesaE2e> {
    return this.enviar<MesaE2e>(
      'post',
      `/api/eventos/${eventoId}/mesas`,
      { numero: mesa.numero, nome: mesa.nome ?? null, capacidade: mesa.capacidade, especial: mesa.especial ?? false },
      'Criação da mesa',
    )
  }

  async sentarNaMesa(eventoId: string, mesaId: string, convidadosIds: string[]): Promise<MapaMesasE2e> {
    return this.enviar<MapaMesasE2e>('post', `/api/eventos/${eventoId}/mesas/${mesaId}/pessoas`, { convidadosIds }, 'Atribuição de mesa')
  }

  async mapaMesas(eventoId: string): Promise<MapaMesasE2e> {
    const resposta = await this.request.get(`/api/eventos/${eventoId}/mesas`, { headers: this.cabecalhos() })
    await exigirSucesso(resposta, 'Consulta do mapa de mesas')
    return (await resposta.json()) as MapaMesasE2e
  }

  async responderRsvp(token: string, pessoas: { id: string; resposta: 'Confirmado' | 'Recusado' }[]): Promise<void> {
    const resposta = await this.request.put('/api/rsvp/resposta', { headers: CABECALHO_AJAX, data: { token, pessoas, acompanhantes: [] } })
    await exigirSucesso(resposta, 'Resposta do RSVP público')
  }

  async convidarAnfitriao(eventoId: string, nome: string, email: string): Promise<void> {
    await this.enviar('post', `/api/eventos/${eventoId}/acessos-anfitriao`, { nome, email }, 'Convite de acesso dos anfitriões')
  }
}
