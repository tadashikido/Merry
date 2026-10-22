using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Tarefas;

public sealed record TarefaPendente(
    Guid Id,
    Guid EventoId,
    string NomePrimeiraPessoa,
    string NomeSegundaPessoa,
    string Titulo,
    ResponsavelTarefa Responsavel,
    CategoriaTarefa Categoria,
    StatusTarefa Status,
    DateOnly Prazo);
