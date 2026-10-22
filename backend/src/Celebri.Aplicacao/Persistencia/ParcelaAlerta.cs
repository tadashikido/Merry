using Celebri.Dominio.Financeiro;

namespace Celebri.Aplicacao.Persistencia;

public sealed record ParcelaAlerta(
    ParcelaFornecedor Parcela,
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    string NomeEmpresa);
