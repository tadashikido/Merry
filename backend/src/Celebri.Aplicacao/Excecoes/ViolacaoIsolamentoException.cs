namespace Celebri.Aplicacao.Excecoes;

public class ViolacaoIsolamentoException : Exception
{
    public ViolacaoIsolamentoException(string entidade)
        : base($"Gravação de '{entidade}' fora da organização corrente foi bloqueada.")
    {
        Entidade = entidade;
    }

    public string Entidade { get; }
}
