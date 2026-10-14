using System.Text;

namespace Casamento.Infraestrutura.Seguranca;

public class OpcoesJwt
{
    public const string Secao = "Jwt";
    public const int TamanhoMinimoChaveBytes = 32;
    public const string MensagemChaveInvalida =
        "A chave de assinatura JWT não foi configurada ou tem menos de 32 bytes. Defina a variável de ambiente 'Jwt__ChaveAssinatura' com um valor aleatório de 32 bytes ou mais.";

    public string ChaveAssinatura { get; set; } = string.Empty;

    public string Emissor { get; set; } = "casamento-api";

    public string Audiencia { get; set; } = "casamento-web";

    public static bool ChaveValida(string? chave)
    {
        return !string.IsNullOrWhiteSpace(chave) && Encoding.UTF8.GetByteCount(chave) >= TamanhoMinimoChaveBytes;
    }

    public byte[] ObterBytesChave()
    {
        return Encoding.UTF8.GetBytes(ChaveAssinatura);
    }
}
