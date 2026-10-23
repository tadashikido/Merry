namespace Celebri.Infraestrutura.Seguranca;

public class OpcoesDadosSensiveis
{
    public const string Secao = "DadosSensiveis";
    public const string MensagemChaveInvalida =
        "A chave de cifragem de dados sensíveis não foi configurada ou é inválida. Defina a variável de ambiente 'DadosSensiveis__ChaveCifragem' com 32 bytes aleatórios em Base64 (por exemplo, a saída de 'openssl rand -base64 32'). Use uma chave diferente da chave JWT e guarde uma cópia segura: sem ela as restrições gravadas não podem ser lidas.";

    public const string MensagemChaveAnteriorInvalida =
        "A chave anterior de cifragem de dados sensíveis é inválida. Em 'DadosSensiveis__ChaveCifragemAnterior' use a chave substituída (32 bytes em Base64) ou deixe vazia; ela deve ser diferente de 'DadosSensiveis__ChaveCifragem'.";

    public string ChaveCifragem { get; set; } = string.Empty;

    public string? ChaveCifragemAnterior { get; set; }

    public static bool ChaveValida(string? chave)
    {
        return TentarObterBytes(chave, out _);
    }

    public static bool ChaveAnteriorValida(string? chaveAtual, string? chaveAnterior)
    {
        if (string.IsNullOrWhiteSpace(chaveAnterior))
        {
            return true;
        }

        if (!TentarObterBytes(chaveAnterior, out var anterior))
        {
            return false;
        }

        return !TentarObterBytes(chaveAtual, out var atual) || !atual.AsSpan().SequenceEqual(anterior);
    }

    public byte[]? ObterBytesChaveAnterior()
    {
        if (string.IsNullOrWhiteSpace(ChaveCifragemAnterior))
        {
            return null;
        }

        return ChaveAnteriorValida(ChaveCifragem, ChaveCifragemAnterior) && TentarObterBytes(ChaveCifragemAnterior, out var bytes)
            ? bytes
            : throw new InvalidOperationException(MensagemChaveAnteriorInvalida);
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
