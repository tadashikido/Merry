using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Tarefas;

public sealed record TarefaPendente(
    Guid Id,
    Guid CasamentoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string Titulo,
    ResponsavelTarefa Responsavel,
    CategoriaTarefa Categoria,
    StatusTarefa Status,
    DateOnly Prazo);
