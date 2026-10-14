namespace Casamento.Dominio.Excecoes;

public class CredenciaisInvalidasException : Exception
{
    public CredenciaisInvalidasException(string mensagem)
        : base(mensagem)
    {
    }
}
