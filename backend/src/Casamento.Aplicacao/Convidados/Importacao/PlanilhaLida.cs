namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record PlanilhaLida(IReadOnlyList<string> Cabecalho, IReadOnlyList<LinhaPlanilha> Linhas);
