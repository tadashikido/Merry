namespace Celebri.Aplicacao.Financeiro;

public sealed record ParcelaAlertaDto(
    Guid ParcelaId,
    Guid EventoId,
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    Guid FornecedorEventoId,
    string NomeEmpresa,
    int Numero,
    int TotalParcelas,
    decimal Valor,
    DateOnly Vencimento,
    int DiasParaVencimento);
