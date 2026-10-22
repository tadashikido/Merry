using System.Text.RegularExpressions;

namespace Casamento.Dominio.Fornecedores;

public static partial class NormalizadorContatoFornecedor
{
    public const int TamanhoMaximoSite = 300;
    public const int TamanhoMaximoInstagram = 30;
    public const int TamanhoMaximoEntradaInstagram = 100;

    private const string PrefixoSeguro = "https://";

    public static bool TentarNormalizarSite(string? site, out string? normalizado)
    {
        normalizado = null;

        if (string.IsNullOrWhiteSpace(site))
        {
            return true;
        }

        var texto = site.Trim();

        if (texto.Length > TamanhoMaximoSite || texto.Any(char.IsWhiteSpace))
        {
            return false;
        }

        if (!texto.Contains("://", StringComparison.Ordinal))
        {
            if (EsquemaExplicito().IsMatch(texto))
            {
                return false;
            }

            texto = PrefixoSeguro + texto;
        }

        if (!Uri.TryCreate(texto, UriKind.Absolute, out var endereco)
            || (endereco.Scheme != Uri.UriSchemeHttp && endereco.Scheme != Uri.UriSchemeHttps)
            || !string.IsNullOrEmpty(endereco.UserInfo)
            || endereco.HostNameType != UriHostNameType.Dns
            || !endereco.Host.Contains('.', StringComparison.Ordinal)
            || endereco.Host.StartsWith('.')
            || endereco.Host.EndsWith('.'))
        {
            return false;
        }

        if (texto.Length > TamanhoMaximoSite)
        {
            return false;
        }

        normalizado = texto;
        return true;
    }

    public static bool TentarNormalizarInstagram(string? instagram, out string? normalizado)
    {
        normalizado = null;

        if (string.IsNullOrWhiteSpace(instagram))
        {
            return true;
        }

        var texto = instagram.Trim();

        if (texto.Length > TamanhoMaximoEntradaInstagram)
        {
            return false;
        }

        var endereco = EnderecoInstagram().Match(texto);
        var usuario = endereco.Success ? endereco.Groups["usuario"].Value : texto.TrimStart('@');

        if (!UsuarioInstagram().IsMatch(usuario))
        {
            return false;
        }

        normalizado = usuario.ToLowerInvariant();
        return true;
    }

    public static bool SiteValido(string? site)
    {
        return TentarNormalizarSite(site, out _);
    }

    public static bool InstagramValido(string? instagram)
    {
        return TentarNormalizarInstagram(instagram, out _);
    }

    [GeneratedRegex(@"^[A-Za-z][A-Za-z0-9+.-]*:(?!\d)")]
    private static partial Regex EsquemaExplicito();

    [GeneratedRegex(@"^(?:https?://)?(?:www\.)?instagram\.com/(?<usuario>[^/?#]+)/?(?:[?#].*)?$", RegexOptions.IgnoreCase)]
    private static partial Regex EnderecoInstagram();

    [GeneratedRegex(@"^[A-Za-z0-9._]{1,30}$")]
    private static partial Regex UsuarioInstagram();
}
