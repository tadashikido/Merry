namespace Casamento.Aplicacao.Excecoes;

public class ArquivoGrandeDemaisException : Exception
{
    public ArquivoGrandeDemaisException(string mensagem)
        : base(mensagem)
    {
    }
}
