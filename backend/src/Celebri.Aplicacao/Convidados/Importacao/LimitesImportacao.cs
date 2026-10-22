namespace Casamento.Aplicacao.Convidados.Importacao;

public static class LimitesImportacao
{
    public const int TamanhoMaximoBytes = 2 * 1024 * 1024;
    public const int TamanhoMaximoRequisicao = TamanhoMaximoBytes + (64 * 1024);
    public const int LinhasMaximas = 5000;
    public const int ColunasMaximas = 50;
    public const int TamanhoMaximoCampo = 1000;
    public const int TamanhoMaximoNomeColunaIgnorada = 60;
    public const string MarcadorExemplo = "(exemplo)";
}
