namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record ResumoImportacaoDto(
    int Linhas,
    int Convites,
    int Pessoas,
    int ConvitesValidos,
    int PessoasValidas,
    int AdultosValidos,
    int CriancasValidas,
    int LinhasComErro,
    int LinhasDuplicadas,
    int LinhasComAviso,
    int ConvidadosExistentes,
    int LimitePorEvento);
