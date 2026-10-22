namespace Casamento.Infraestrutura.Seguranca;

public class OpcoesDadosSensiveis
{
    public const string Secao = "DadosSensiveis";
    public const string MensagemChaveInvalida =
        "A chave de cifragem de dados sensíveis não foi configurada ou é inválida. Defina a variável de ambiente 'DadosSensiveis__ChaveCifragem' com 32 bytes aleatórios em Base64 (por exemplo, a saída de 'openssl rand -base64 32'). Use uma chave diferente da chave JWT e guarde uma cópia segura: sem ela as restrições gravadas não podem ser lidas.";

    public string ChaveCifragem { get; set; } = string.Empty;

    public static bool ChaveValida(string? chave)
    {
        return TentarObterBytes(chave, out _);
    }

    public byte[] ObterBytesChave()
    {
        return TentarObterBytes(ChaveCifragem, out var bytes)
            ? bytes
            : throw new InvalidOperationException(MensagemChaveInvalida);
    }

    private static bool TentarObterBytes(string? chave, out byte[] bytes)
    {
        bytes = [];

        if (string.IsNullOrWhiteSpace(chave))
        {
            return false;
        }

        var destino = new byte[CifraAesGcm.TamanhoChaveBytes + 3];

        if (!Convert.TryFromBase64String(chave.Trim(), destino, out var escritos) || escritos != CifraAesGcm.TamanhoChaveBytes)
        {
            return false;
        }

        bytes = destino[..escritos];
        return true;
    }
}
