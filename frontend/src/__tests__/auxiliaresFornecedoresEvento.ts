import type { FornecedorEventoDto, ListaFornecedoresEventoDto } from '@/tipos/fornecedoresEvento'
import { calcularResumoLocal } from '@/utilitarios/fornecedoresEvento'

export const ID_VINCULO = '77777777-7777-4777-8777-777777777777'
export const ID_VINCULO_2 = '88888888-8888-4888-8888-888888888888'

export function vinculoExemplo(dados: Partial<FornecedorEventoDto> = {}): FornecedorEventoDto {
  return {
    id: ID_VINCULO,
    fornecedor: {
      id: '33333333-3333-4333-8333-333333333333',
      categoria: 'Buffet',
      nomeEmpresa: 'Buffet São João',
      responsavel: 'Marta Souza',
      telefone: '11987654321',
      email: 'contato@saojoao.com.br',
      site: null,
      instagram: null,
      arquivado: false,
    },
    servico: 'Jantar para 200',
    valorOrcado: 18000,
    valorContratado: null,
    status: 'Cotacao',
    notasInternas: 'Comissão de 10%',
    contrato: null,
    criadoEm: '2026-09-30T12:00:00Z',
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export function florista(dados: Partial<FornecedorEventoDto> = {}): FornecedorEventoDto {
  return vinculoExemplo({
    id: ID_VINCULO_2,
    fornecedor: {
      id: '44444444-4444-4444-8444-444444444444',
      categoria: 'Decoracao',
      nomeEmpresa: 'Florista Jardim',
      responsavel: null,
      telefone: null,
      email: null,
      site: null,
      instagram: null,
      arquivado: false,
    },
    servico: 'Arranjos',
    valorOrcado: 15800,
    valorContratado: null,
    status: 'EmNegociacao',
    notasInternas: null,
    ...dados,
  })
}

export function listaVinculos(
  vinculos: FornecedorEventoDto[],
  dados: Partial<ListaFornecedoresEventoDto> = {},
): ListaFornecedoresEventoDto {
  return {
    vinculos,
    resumo: calcularResumoLocal(vinculos),
    eventoArquivado: false,
    somenteLeitura: false,
    ...dados,
  }
}

export function arquivoPdf(nome = 'contrato.pdf', conteudo = '%PDF-1.4 conteúdo'): File {
  return new File([conteudo], nome, { type: 'application/pdf' })
}
