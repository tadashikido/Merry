import type { PreVisualizacaoImportacaoDto } from '@/tipos/importacaoConvidados'

export function previaExemplo(dados: Partial<PreVisualizacaoImportacaoDto> = {}): PreVisualizacaoImportacaoDto {
  return {
    resumo: {
      linhas: 4,
      convites: 3,
      pessoas: 4,
      convitesValidos: 2,
      pessoasValidas: 3,
      adultosValidos: 2,
      criancasValidas: 1,
      linhasComErro: 1,
      linhasDuplicadas: 0,
      linhasComAviso: 0,
      convidadosExistentes: 20,
      limitePorCasamento: 5000,
    },
    colunasReconhecidas: ['Convite', 'Nome', 'Telefone'],
    colunasIgnoradas: [],
    convites: [
      {
        nome: 'Família Conceição',
        grupo: 'Família da noiva',
        limiteAcompanhantes: 1,
        valido: true,
        pessoas: [
          { linha: 2, nome: 'João Conceição', faixaEtaria: 'Adulto', resposta: 'Pendente', situacao: 'Valida' },
          { linha: 3, nome: 'Maria da Conceição', faixaEtaria: 'Crianca', resposta: 'Pendente', situacao: 'Valida' },
        ],
      },
      {
        nome: 'Irene Araújo',
        grupo: null,
        limiteAcompanhantes: 0,
        valido: true,
        pessoas: [{ linha: 4, nome: 'Irene Araújo', faixaEtaria: 'Adulto', resposta: 'Confirmado', situacao: 'Valida' }],
      },
      {
        nome: '=HYPERLINK("http://x")',
        grupo: null,
        limiteAcompanhantes: 0,
        valido: false,
        pessoas: [{ linha: 5, nome: '=HYPERLINK("http://x")', faixaEtaria: 'Adulto', resposta: 'Pendente', situacao: 'ComErro' }],
      },
    ],
    linhasComProblema: [
      {
        linha: 5,
        valores: {
          convite: '',
          grupo: '',
          nome: '=HYPERLINK("http://x")',
          telefone: '123',
          email: '@evil',
          faixaEtaria: '',
          acompanhantes: '',
          resposta: '',
        },
        problemas: [
          { tipo: 'Erro', coluna: 'Telefone', mensagem: 'Informe o telefone com DDD, como (11) 98765-4321.' },
          { tipo: 'Erro', coluna: 'Email', mensagem: 'Informe um e-mail válido, como nome@exemplo.com.' },
        ],
      },
    ],
    ...dados,
  }
}
