namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record LinhaPlanilha(int Numero, IReadOnlyList<string> Celulas);
