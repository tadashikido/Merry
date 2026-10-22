namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record ProblemaLinha(int Linha, TipoProblemaLinha Tipo, ColunaImportacao? Coluna, string Mensagem);
