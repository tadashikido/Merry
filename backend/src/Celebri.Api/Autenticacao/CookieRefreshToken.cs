namespace Celebri.Api.Autenticacao;

public static class CookieRefreshToken
{
    public const string Nome = "casamento_rt";
    public const string Caminho = "/api/autenticacao";

    public static void Gravar(HttpResponse resposta, string valor, DateTimeOffset expiraEm)
    {
        resposta.Cookies.Append(Nome, valor, CriarOpcoes(expiraEm));
    }

    public static string? Ler(HttpRequest requisicao)
    {
        return requisicao.Cookies.TryGetValue(Nome, out var valor) ? valor : null;
    }

    public static void Remover(HttpResponse resposta)
    {
        resposta.Cookies.Delete(Nome, CriarOpcoes(null));
    }

    public static CookieOptions CriarOpcoes(DateTimeOffset? expiraEm)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = Caminho,
            Expires = expiraEm,
            IsEssential = true,
        };
    }
}
