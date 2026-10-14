import type { FornecedorDto, FornecedorResumoDto } from '@/tipos/fornecedores'

export const ID_FORNECEDOR = '33333333-3333-4333-8333-333333333333'
export const ID_FORNECEDOR_2 = '44444444-4444-4444-8444-444444444444'

export function resumoFornecedor(dados: Partial<FornecedorResumoDto> = {}): FornecedorResumoDto {
  return {
    id: ID_FORNECEDOR,
    categoria: 'Buffet',
    nomeEmpresa: 'Buffet São João',
    responsavel: 'Marta Souza',
    telefone: '11987654321',
    email: 'contato@saojoao.com.br',
    site: 'https://saojoao.com.br',
    instagram: 'buffetsaojoao',
    arquivado: false,
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export function fornecedorCompleto(dados: Partial<FornecedorDto> = {}): FornecedorDto {
  return {
    ...resumoFornecedor(),
    observacoes: 'Pede sinal de 30%.',
    arquivadoEm: null,
    criadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}
