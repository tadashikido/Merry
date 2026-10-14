using Casamento.Dominio.Financeiro;

namespace Casamento.Aplicacao.Persistencia;

public sealed record ParcelaAlerta(
    ParcelaFornecedor Parcela,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string NomeEmpresa);
