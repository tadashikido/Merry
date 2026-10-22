namespace Celebri.Dominio.Excecoes;

public class RegraNegocioException : Exception
{
    public RegraNegocioException(string mensagem)
        : base(mensagem)
    {
    }

    public RegraNegocioException(string mensagem, string campo)
        : base(mensagem)
    {
        Campo = campo;
    }

    public string? Campo { get; }
}
