namespace Celebri.Aplicacao.Excecoes;

public class RecursoNaoEncontradoException : Exception
{
    public RecursoNaoEncontradoException(string mensagem)
        : base(mensagem)
    {
    }
}
