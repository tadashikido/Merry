namespace Celebri.Infraestrutura.Email;

public class OpcoesEmail
{
    public const string Secao = "Email";

    public string Remetente { get; set; } = string.Empty;

    public OpcoesSmtp Smtp { get; set; } = new();
}

public class OpcoesSmtp
{
    public string Host { get; set; } = string.Empty;

    public int Porta { get; set; } = 587;

    public bool UsarSsl { get; set; } = true;

    public string? Usuario { get; set; }

    public string? Senha { get; set; }
}
