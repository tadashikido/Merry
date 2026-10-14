import type { ExportacaoBuffetDto, PainelConfirmacoesDto } from '@/tipos/confirmacoes'

export function exportacaoExemplo(dados: Partial<ExportacaoBuffetDto> = {}): ExportacaoBuffetDto {
  return {
    casamento: {
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localRecepcao: 'Espaço Jardim',
    },
    geradoEm: '2027-05-13T17:03:00Z',
    confirmados: { adultos: 3, criancas: 1, total: 4 },
    pendentes: 2,
    convites: [
      {
        nome: 'Família Souza',
        pessoas: [
          { nome: 'Célia Souza', faixaEtaria: 'Adulto', acompanhante: false, tipos: [], outraRestricao: null, necessidadeEspecial: null },
          { nome: 'Lia Souza', faixaEtaria: 'Crianca', acompanhante: false, tipos: ['SemGluten'], outraRestricao: 'sem porco', necessidadeEspecial: 'cadeira alta' },
          { nome: 'Pedro Lima', faixaEtaria: 'Adulto', acompanhante: true, tipos: [], outraRestricao: null, necessidadeEspecial: null },
        ],
      },
      {
        nome: '=HYPERLINK("x")',
        pessoas: [{ nome: '+Rafael', faixaEtaria: 'Adulto', acompanhante: false, tipos: [], outraRestricao: '@sem sal', necessidadeEspecial: '-nada' }],
      },
    ],
    restricoes: {
      porTipo: [{ tipo: 'SemGluten', quantidade: 1 }],
      outrasRestricoes: 2,
      necessidadesEspeciais: 2,
      pessoas: [{ nome: 'Lia Souza', convite: 'Família Souza', tipos: ['SemGluten'], outraRestricao: 'sem porco', necessidadeEspecial: 'cadeira alta' }],
      registrosIlegiveis: 0,
      dadosExcluidosEm: null,
    },
    ...dados,
  }
}

export function painelExemplo(dados: Partial<PainelConfirmacoesDto> = {}): PainelConfirmacoesDto {
  return {
    convites: { total: 3, naoEnviados: 1, enviados: 1, visualizados: 1, respondidos: 2, aguardandoResposta: 1 },
    pessoas: {
      convites: 3,
      pessoas: 6,
      adultos: 5,
      criancas: 1,
      acompanhantesPermitidos: 0,
      pendentes: { adultos: 1, criancas: 0, total: 1 },
      confirmados: { adultos: 3, criancas: 1, total: 4 },
      recusados: { adultos: 1, criancas: 0, total: 1 },
    },
    convidadosEstimados: 150,
    prazo: { dataLimite: '2027-05-12', diasRestantes: 5, aceitaRespostas: true },
    casamentoArquivado: false,
    pendentes: [
      {
        conviteId: '33333333-3333-4333-8333-333333333333',
        nome: 'Família Lima',
        grupo: 'Amigos',
        statusEnvio: 'NaoEnviado',
        telefone: '11987654321',
        pessoasPendentes: ['Bia Lima'],
        totalPessoas: 2,
      },
    ],
    ...dados,
  }
}
