namespace Casamento.Dominio.Usuarios;

public static class PoliticaSenha
{
    public const int TamanhoMinimo = 10;
    public const int TamanhoMaximo = 128;
    public const string MensagemSenhaFraca = "Use 10 caracteres ou mais, com pelo menos uma letra e um número.";
    public const string MensagemSenhaLonga = "Use no máximo 128 caracteres.";
    public const string MensagemSenhaIgualEmail = "A senha não pode ser igual ao e-mail.";

    public static string? Validar(string? senha, string? email = null)
    {
        if (string.IsNullOrEmpty(senha))
        {
            return MensagemSenhaFraca;
        }

        if (senha.Length > TamanhoMaximo)
        {
            return MensagemSenhaLonga;
        }

        if (senha.Length < TamanhoMinimo || !senha.Any(char.IsLetter) || !senha.Any(char.IsDigit))
        {
            return MensagemSenhaFraca;
        }

        if (!string.IsNullOrWhiteSpace(email)
            && string.Equals(senha.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return MensagemSenhaIgualEmail;
        }

        return null;
    }
}
