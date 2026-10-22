namespace Casamento.Dominio.Excecoes;

public class ConcorrenciaException : Exception
{
    public ConcorrenciaException(string mensagem, Exception? excecaoInterna = null)
        : base(mensagem, excecaoInterna)
    {
    }
}
