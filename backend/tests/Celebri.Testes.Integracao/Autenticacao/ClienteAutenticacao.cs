using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Casamento.Api.Autenticacao;

namespace Casamento.Testes.Integracao.Autenticacao;

public static class ClienteAutenticacao
{
    public const string SenhaValida = "senhaForte123";

    public static string EmailUnico()
    {
        return $"ana.{Guid.NewGuid():N}@exemplo.com";
    }

    public static Task<HttpResponseMessage> CadastrarAsync(HttpClient cliente, string email, string senha = SenhaValida)
    {
        return cliente.PostAsJsonAsync("/api/autenticacao/cadastro", new
        {
            nomeAssessoria = "Assessoria Ana",
            nome = "Ana Souza",
            email,
            senha,
        });
    }

    public static Task<HttpResponseMessage> EntrarAsync(HttpClient cliente, string email, string senha = SenhaValida)
    {
        return cliente.PostAsJsonAsync("/api/autenticacao/entrar", new { email, senha });
    }

    public static Task<HttpResponseMessage> RenovarAsync(HttpClient cliente, string? refreshToken, bool comCabecalho = true)
    {
        return EnviarComCookieAsync(cliente, "/api/autenticacao/renovar", refreshToken, comCabecalho);
    }

    public static Task<HttpResponseMessage> SairAsync(HttpClient cliente, string? refreshToken)
    {
        return EnviarComCookieAsync(cliente, "/api/autenticacao/sair", refreshToken, true);
    }

    public static async Task<HttpResponseMessage> ObterEuAsync(HttpClient cliente, string? tokenAcesso)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/autenticacao/eu");
        if (tokenAcesso is not null)
        {
            requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenAcesso);
        }

        return await cliente.SendAsync(requisicao);
    }

    public static string? LerCabecalhoCookie(HttpResponseMessage resposta)
    {
        return resposta.Headers.TryGetValues("Set-Cookie", out var valores)
            ? valores.FirstOrDefault(valor => valor.StartsWith(CookieRefreshToken.Nome + "=", StringComparison.Ordinal))
            : null;
    }

    public static string? LerRefreshToken(HttpResponseMessage resposta)
    {
        var cabecalho = LerCabecalhoCookie(resposta);
        if (cabecalho is null)
        {
            return null;
        }

        var valor = cabecalho.Split(';')[0][(CookieRefreshToken.Nome.Length + 1)..];
        return string.IsNullOrEmpty(valor) ? null : valor;
    }

    public static async Task<string> LerTokenAcessoAsync(HttpResponseMessage resposta)
    {
        using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return documento.RootElement.GetProperty("tokenAcesso").GetString()!;
    }

    public static async Task<JsonDocument> LerJsonAsync(HttpResponseMessage resposta)
    {
        return JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
    }

    private static async Task<HttpResponseMessage> EnviarComCookieAsync(HttpClient cliente, string rota, string? refreshToken, bool comCabecalho)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, rota);
        if (refreshToken is not null)
        {
            requisicao.Headers.Add("Cookie", $"{CookieRefreshToken.Nome}={refreshToken}");
        }

        if (comCabecalho)
        {
            requisicao.Headers.Add(ExigirCabecalhoRequisicaoAttribute.NomeCabecalho, ExigirCabecalhoRequisicaoAttribute.ValorCabecalho);
        }

        return await cliente.SendAsync(requisicao);
    }
}
