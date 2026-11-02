namespace Celebri.Aplicacao.Operadores;

public class OpcoesOperadorInicial
{
    public const string Secao = "OperadorInicial";

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Senha { get; set; } = string.Empty;

    public bool Configurado => !string.IsNullOrWhiteSpace(Email) && !string.IsNullOrWhiteSpace(Senha);
}
