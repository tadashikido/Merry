import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { AlertasPagamentosDto, ParcelaDto } from '@/tipos/financeiro'
import type { FornecedorCasamentoDto, ResumoOrcamentoDto, StatusFornecedorCasamento } from '@/tipos/fornecedoresCasamento'
import type {
  ColunaListagem,
  FiltroProblemaLinha,
  ItemDetalhe,
  ItemProblemaLinha,
  VarianteStatus,
} from '@/componentes/base/tipos'
import type { FaseCasamento } from '@/tipos/casamentos'
import type { TotaisConvidadosDto } from '@/tipos/convidados'
import type { PendenciasTarefasDto, TarefaDto } from '@/tipos/tarefas'

export type SituacaoConvidado = 'Confirmado' | 'Pendente' | 'Recusado'

export interface ConvidadoDemonstracao extends Record<string, unknown> {
  id: number
  nome: string
  grupo: string
  situacao: SituacaoConvidado
  mesa: number | null
  respondidoEm: string | null
}

export const VARIANTE_POR_SITUACAO: Record<SituacaoConvidado, VarianteStatus> = {
  Confirmado: 'sucesso',
  Pendente: 'alerta',
  Recusado: 'neutro',
}

export const CONVIDADOS_DEMONSTRACAO: ConvidadoDemonstracao[] = [
  { id: 1, nome: 'Ana Beatriz Souza', grupo: 'Família da noiva', situacao: 'Confirmado', mesa: 4, respondidoEm: '2026-09-12T14:20:00Z' },
  { id: 2, nome: 'Carlos Henrique Lima', grupo: 'Amigos do noivo', situacao: 'Pendente', mesa: null, respondidoEm: null },
  { id: 3, nome: 'Dona Célia Andrade', grupo: 'Família do noivo', situacao: 'Confirmado', mesa: 1, respondidoEm: '2026-09-03T10:05:00Z' },
  { id: 4, nome: 'João Pedro Martins', grupo: 'Trabalho da noiva', situacao: 'Recusado', mesa: null, respondidoEm: '2026-09-20T22:40:00Z' },
  { id: 5, nome: 'Marina e Túlio Farias', grupo: 'Padrinhos', situacao: 'Confirmado', mesa: 2, respondidoEm: '2026-08-29T18:00:00Z' },
]

export const COLUNAS_DEMONSTRACAO: ColunaListagem<ConvidadoDemonstracao>[] = [
  { campo: 'nome', titulo: 'Nome', ordenavel: true, principal: true },
  { campo: 'grupo', titulo: 'Grupo', ocultarNoTablet: true },
  { campo: 'situacao', titulo: 'Situação' },
  { campo: 'mesa', titulo: 'Mesa', largura: '6rem', ocultarNoTablet: true },
  { campo: 'respondidoEm', titulo: 'Respondido em', ocultarNoTablet: true },
]

export const FASES_DEMONSTRACAO: FaseCasamento[] = ['Planejamento', 'RetaFinal', 'SemanaDoCasamento', 'DiaDoCasamento', 'Realizado']

export const CONTAGENS_DEMONSTRACAO = [229, 1, 0, -1, -261]

export const DETALHES_DEMONSTRACAO: ItemDetalhe[] = [
  { rotulo: 'Data do casamento', valor: '15 de maio de 2027' },
  { rotulo: 'Horário da cerimônia', valor: '16:30' },
  { rotulo: 'Local da cerimônia', valor: 'Capela São José' },
  { rotulo: 'Local da recepção', valor: null },
  { rotulo: 'Convidados estimados', valor: '150' },
  { rotulo: 'Observações', valor: 'Noiva prefere flores brancas.\nCerimônia ao ar livre se não chover.', multilinha: true },
]

export const TOTAIS_DEMONSTRACAO: TotaisConvidadosDto = {
  convites: 12,
  pessoas: 42,
  adultos: 36,
  criancas: 6,
  acompanhantesPermitidos: 5,
  confirmados: { adultos: 15, criancas: 3, total: 18 },
  pendentes: { adultos: 17, criancas: 3, total: 20 },
  recusados: { adultos: 4, criancas: 0, total: 4 },
}

export const TOTAIS_ZERADOS_DEMONSTRACAO: TotaisConvidadosDto = {
  convites: 1,
  pessoas: 1,
  adultos: 1,
  criancas: 0,
  acompanhantesPermitidos: 0,
  confirmados: { adultos: 0, criancas: 0, total: 0 },
  pendentes: { adultos: 1, criancas: 0, total: 1 },
  recusados: { adultos: 0, criancas: 0, total: 0 },
}

export const TOTAIS_GRANDES_DEMONSTRACAO: TotaisConvidadosDto = {
  convites: 1250,
  pessoas: 4870,
  adultos: 4100,
  criancas: 770,
  acompanhantesPermitidos: 310,
  confirmados: { adultos: 3020, criancas: 610, total: 3630 },
  pendentes: { adultos: 980, criancas: 140, total: 1120 },
  recusados: { adultos: 100, criancas: 20, total: 120 },
}

export const GRUPOS_DEMONSTRACAO = ['Família da noiva', 'Família do noivo', 'Amigos da noiva', 'Amigos do noivo', 'Padrinhos', 'Trabalho da noiva']

export interface PessoaDemonstracao {
  chave: string
  nome: string
}

export const PROBLEMAS_DEMONSTRACAO: ItemProblemaLinha[] = [
  {
    linha: 6,
    titulo: 'Marcos Lima',
    problemas: [
      { tipo: 'Erro', rotuloTipo: 'Erro', variante: 'erro', campo: 'Telefone', mensagem: 'Informe o telefone com DDD, como (11) 98765-4321.' },
      { tipo: 'Erro', rotuloTipo: 'Erro', variante: 'erro', campo: 'E-mail', mensagem: 'Informe um e-mail válido, como nome@exemplo.com.' },
    ],
  },
  {
    linha: 9,
    titulo: 'Carla Souza',
    problemas: [{ tipo: 'Duplicado', rotuloTipo: 'Repetida', variante: 'alerta', campo: null, mensagem: 'Pessoa repetida: igual à linha 2.' }],
  },
  {
    linha: 12,
    titulo: 'Ana Ribeiro',
    problemas: [
      { tipo: 'Aviso', rotuloTipo: 'Aviso', variante: 'informacao', campo: 'Nome', mensagem: 'Possível duplicado: há outra pessoa com este nome sem telefone para comparar.' },
    ],
  },
]

export const FILTROS_PROBLEMAS_DEMONSTRACAO: FiltroProblemaLinha[] = [
  { tipo: 'Erro', rotulo: 'Erros' },
  { tipo: 'Duplicado', rotulo: 'Repetidas' },
  { tipo: 'Aviso', rotulo: 'Avisos' },
]

export const TAREFAS_DEMONSTRACAO: TarefaDto[] = [
  {
    id: 't1',
    titulo: 'Assinar contrato da decoração',
    descricao: 'Contrato enviado por e-mail pela assessoria.',
    responsavel: 'Casal',
    categoria: 'Documentos',
    status: 'AFazer',
    prazo: '2026-09-26',
    atrasada: true,
    venceNaSemana: false,
    diasParaPrazo: -4,
    concluidaEm: null,
    concluidaPor: null,
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
  },
  {
    id: 't2',
    titulo: 'Confirmar buffet para 460 pessoas',
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Fornecedores',
    status: 'AFazer',
    prazo: '2026-10-02',
    atrasada: false,
    venceNaSemana: true,
    diasParaPrazo: 2,
    concluidaEm: null,
    concluidaPor: null,
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
  },
  {
    id: 't3',
    titulo: 'Fechar roteiro da cerimônia',
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Cerimonia',
    status: 'EmAndamento',
    prazo: '2026-11-10',
    atrasada: false,
    venceNaSemana: false,
    diasParaPrazo: 41,
    concluidaEm: null,
    concluidaPor: null,
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
  },
  {
    id: 't4',
    titulo: 'Escolher música da entrada',
    descricao: null,
    responsavel: 'Casal',
    categoria: 'Cerimonia',
    status: 'Concluida',
    prazo: null,
    atrasada: false,
    venceNaSemana: false,
    diasParaPrazo: null,
    concluidaEm: '2026-09-28T15:00:00Z',
    concluidaPor: 'Casal',
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-28T15:00:00Z',
  },
  {
    id: 't5',
    titulo: 'Reservar van para convidados',
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Convidados',
    status: 'Cancelada',
    prazo: '2026-10-20',
    atrasada: false,
    venceNaSemana: false,
    diasParaPrazo: 20,
    concluidaEm: null,
    concluidaPor: null,
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-20T12:00:00Z',
  },
]

export const PENDENCIAS_DEMONSTRACAO: PendenciasTarefasDto = {
  totalAtrasadas: 7,
  totalEstaSemana: 3,
  casamentosComAtraso: 4,
  atrasadas: [
    {
      id: 'p1',
      casamentoId: '00000000-0000-0000-0000-000000000001',
      nomePrimeiraPessoa: 'Luísa',
      nomeSegundaPessoa: 'Pedro',
      titulo: 'Confirmar horário do DJ',
      responsavel: 'Assessoria',
      categoria: 'Fornecedores',
      status: 'AFazer',
      prazo: '2026-09-27',
      diasParaPrazo: -3,
    },
    {
      id: 'p2',
      casamentoId: '00000000-0000-0000-0000-000000000002',
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: 'João',
      titulo: 'Assinar contrato da decoração',
      responsavel: 'Casal',
      categoria: 'Documentos',
      status: 'AFazer',
      prazo: '2026-09-29',
      diasParaPrazo: -1,
    },
  ],
  estaSemana: [
    {
      id: 'p3',
      casamentoId: '00000000-0000-0000-0000-000000000002',
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: 'João',
      titulo: 'Pagar parcela da fotografia',
      responsavel: 'Casal',
      categoria: 'Financeiro',
      status: 'AFazer',
      prazo: '2026-09-30',
      diasParaPrazo: 0,
    },
  ],
}

function vinculoDemonstracao(
  id: string,
  categoria: CategoriaFornecedor,
  nomeEmpresa: string,
  status: StatusFornecedorCasamento,
  servico: string | null,
  valorOrcado: number | null,
  valorContratado: number | null,
  comContrato = false,
): FornecedorCasamentoDto {
  return {
    id,
    fornecedor: {
      id: `f-${id}`,
      categoria,
      nomeEmpresa,
      responsavel: null,
      telefone: '11987654321',
      email: null,
      site: null,
      instagram: null,
      arquivado: false,
    },
    servico,
    valorOrcado,
    valorContratado,
    status,
    notasInternas: null,
    contrato: comContrato ? { nomeArquivo: `contrato-${id}.pdf`, tamanhoBytes: 1_258_291, enviadoEm: '2026-09-28T13:00:00Z' } : null,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-28T13:00:00Z',
  }
}

export const VINCULOS_DEMONSTRACAO: FornecedorCasamentoDto[] = [
  vinculoDemonstracao('v1', 'Buffet', 'Buffet São João', 'Contratado', 'Jantar para 200', 18_000, 18_500, true),
  vinculoDemonstracao('v2', 'Decoracao', 'Florista Jardim', 'EmNegociacao', 'Arranjos baixos e velas', 15_800, null),
  vinculoDemonstracao('v3', 'Fotografia', 'Luz & Afeto Fotografia', 'Contratado', 'Cobertura completa', 8_000, 7_400, true),
  vinculoDemonstracao('v4', 'BoloDoces', 'Doce Ateliê', 'Cotacao', null, 1_500, null),
  vinculoDemonstracao('v5', 'Musica', 'Quarteto Aurora', 'Cancelado', 'Cerimônia', 4_500, null),
]

export const HOJE_DEMONSTRACAO = '2026-09-30'

export const RESUMO_PAGAMENTOS_DEMONSTRACAO: ResumoOrcamentoDto = {
  categorias: [
    { categoria: 'Buffet', quantidade: 1, contratados: 1, orcado: 18000, contratado: 18500, pago: 12000, pendente: 6500, vencido: 0, parcelado: 18500 },
    { categoria: 'Decoracao', quantidade: 1, contratados: 1, orcado: 15800, contratado: 15800, pago: 6000, pendente: 9800, vencido: 0, parcelado: 15800 },
    { categoria: 'Fotografia', quantidade: 1, contratados: 1, orcado: 8000, contratado: 7400, pago: 5400, pendente: 2000, vencido: 2000, parcelado: 7400 },
    { categoria: 'Musica', quantidade: 1, contratados: 1, orcado: 4500, contratado: 4200, pago: 4200, pendente: 0, vencido: 0, parcelado: 4200 },
    { categoria: 'BoloDoces', quantidade: 1, contratados: 0, orcado: 1200, contratado: 0, pago: 0, pendente: 0, vencido: 0, parcelado: 0 },
  ],
  totalOrcado: 47500,
  totalContratado: 45900,
  quantidadeFornecedores: 5,
  quantidadeContratados: 4,
  totalPago: 27600,
  totalPendente: 18300,
  totalVencido: 2000,
  totalParcelado: 45900,
}

function parcelaDemonstracao(
  dados: Partial<ParcelaDto> & Pick<ParcelaDto, 'id' | 'numero' | 'totalParcelas' | 'valor' | 'vencimento'>,
): ParcelaDto {
  return {
    fornecedorCasamentoId: 'v-demo',
    observacao: null,
    situacao: 'Pendente',
    diasParaVencimento: 30,
    venceEmBreve: false,
    pagaEm: null,
    comprovante: null,
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export const PARCELAS_DEMONSTRACAO: Array<ParcelaDto & { nomeEmpresa: string }> = [
  {
    ...parcelaDemonstracao({ id: 'pd1', numero: 3, totalParcelas: 4, valor: 2000, vencimento: '2026-09-28', situacao: 'Vencida', diasParaVencimento: -2, observacao: 'Pix' }),
    nomeEmpresa: 'Fotografia Lumière',
  },
  {
    ...parcelaDemonstracao({ id: 'pd2', numero: 3, totalParcelas: 5, valor: 3250, vencimento: '2026-09-30', diasParaVencimento: 0, venceEmBreve: true, observacao: 'Boleto' }),
    nomeEmpresa: 'Buffet São João',
  },
  {
    ...parcelaDemonstracao({ id: 'pd3', numero: 2, totalParcelas: 3, valor: 4900, vencimento: '2026-10-05', diasParaVencimento: 5, venceEmBreve: true }),
    nomeEmpresa: 'Decoração Jardim',
  },
  {
    ...parcelaDemonstracao({ id: 'pd4', numero: 3, totalParcelas: 3, valor: 4900, vencimento: '2026-11-05', diasParaVencimento: 36 }),
    nomeEmpresa: 'Decoração Jardim',
  },
  {
    ...parcelaDemonstracao({
      id: 'pd5',
      numero: 2,
      totalParcelas: 2,
      valor: 1700,
      vencimento: '2026-09-20',
      situacao: 'Paga',
      diasParaVencimento: -10,
      pagaEm: '2026-09-18',
      comprovante: { nomeArquivo: 'pix-musica.png', tipoConteudo: 'image/png', tamanhoBytes: 182_000, enviadoEm: '2026-09-18T14:00:00Z' },
    }),
    nomeEmpresa: 'Banda Aurora',
  },
]

export const ALERTAS_DEMONSTRACAO: AlertasPagamentosDto = {
  totalVencidas: 2,
  valorVencidas: 5250,
  totalProximas: 4,
  valorProximas: 14300,
  casamentosComVencidas: 2,
  hoje: HOJE_DEMONSTRACAO,
  vencidas: [
    {
      parcelaId: 'a1',
      casamentoId: '00000000-0000-0000-0000-000000000002',
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: 'João',
      fornecedorCasamentoId: 'v1',
      nomeEmpresa: 'Fotografia Lumière',
      numero: 3,
      totalParcelas: 4,
      valor: 2000,
      vencimento: '2026-09-28',
      diasParaVencimento: -2,
    },
    {
      parcelaId: 'a2',
      casamentoId: '00000000-0000-0000-0000-000000000003',
      nomePrimeiraPessoa: 'Beatriz',
      nomeSegundaPessoa: 'Rafael',
      fornecedorCasamentoId: 'v2',
      nomeEmpresa: 'Buffet São João',
      numero: 2,
      totalParcelas: 5,
      valor: 3250,
      vencimento: '2026-09-25',
      diasParaVencimento: -5,
    },
  ],
  proximas: [
    {
      parcelaId: 'a3',
      casamentoId: '00000000-0000-0000-0000-000000000003',
      nomePrimeiraPessoa: 'Beatriz',
      nomeSegundaPessoa: 'Rafael',
      fornecedorCasamentoId: 'v3',
      nomeEmpresa: 'Decoração Jardim',
      numero: 3,
      totalParcelas: 3,
      valor: 4900,
      vencimento: '2026-10-02',
      diasParaVencimento: 2,
    },
  ],
}

export const ALERTAS_VAZIOS_DEMONSTRACAO: AlertasPagamentosDto = {
  totalVencidas: 0,
  valorVencidas: 0,
  totalProximas: 0,
  valorProximas: 0,
  casamentosComVencidas: 0,
  hoje: HOJE_DEMONSTRACAO,
  vencidas: [],
  proximas: [],
}
