namespace Casamento.Aplicacao.Financeiro;

public sealed record ParcelaAlertaDto(
    Guid ParcelaId,
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    Guid FornecedorCasamentoId,
    string NomeEmpresa,
    int Numero,
    int TotalParcelas,
    decimal Valor,
    DateOnly Vencimento,
    int DiasParaVencimento);
