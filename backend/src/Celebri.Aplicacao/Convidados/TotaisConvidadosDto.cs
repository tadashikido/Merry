namespace Celebri.Aplicacao.Convidados;

public sealed record TotaisConvidadosDto(
    int Convites,
    int Pessoas,
    int Adultos,
    int Criancas,
    int AcompanhantesPermitidos,
    TotaisPorFaixaDto Pendentes,
    TotaisPorFaixaDto Confirmados,
    TotaisPorFaixaDto Recusados);
