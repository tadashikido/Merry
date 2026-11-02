using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Api.Autenticacao;

namespace Celebri.Testes.Integracao.Operadores;

public static class ClienteOperador
{
    public const string EmailOperador = "operador@celebri.teste";
    public const string SenhaOperador = "senhaOperador123";

    public static IReadOnlyDictionary<string, string?> ConfiguracaoProvisionamento()
    {
        return new Dictionary<string, string?>
        {
            ["OperadorInicial:Nome"] = "Equipe Celebri",
            ["OperadorInicial:Email"] = EmailOperador,
            ["OperadorInicial:Senha"] = SenhaOperador,
        };
    }

    public static Task<HttpResponseMessage> EntrarAsync(HttpClient cliente, string email = EmailOperador, string senha = SenhaOperador)
    {
        return cliente.PostAsJsonAsync("/api/operador/autenticacao/entrar", new { email, senha });
    }

    public static Task<HttpResponseMessage> RenovarAsync(HttpClient cliente, string? refreshToken, bool comCabecalho = true)
    {
        return EnviarComCookieAsync(cliente, "/api/operador/autenticacao/renovar", refreshToken, comCabecalho);
    }

    public static Task<HttpResponseMessage> SairAsync(HttpClient cliente, string? refreshToken)
    {
        return EnviarComCookieAsync(cliente, "/api/operador/autenticacao/sair", refreshToken, true);
    }

    public static async Task<HttpResponseMessage> ObterEuAsync(HttpClient cliente, string? tokenAcesso)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/operador/autenticacao/eu");
        if (tokenAcesso is not null)
        {
            requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenAcesso);
        }

        return await cliente.SendAsync(requisicao);
    }

    public static string? LerCabecalhoCookie(HttpResponseMessage resposta)
    {
        return resposta.Headers.TryGetValues("Set-Cookie", out var valores)
            ? valores.FirstOrDefault(valor => valor.StartsWith(CookieRefreshTokenOperador.Nome + "=", StringComparison.Ordinal))
            : null;
    }

    public static string? LerRefreshToken(HttpResponseMessage resposta)
    {
        var cabecalho = LerCabecalhoCookie(resposta);
        if (cabecalho is null)
        {
            return null;
        }

        var valor = cabecalho.Split(';')[0][(CookieRefreshTokenOperador.Nome.Length + 1)..];
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
            requisicao.Headers.Add("Cookie", $"{CookieRefreshTokenOperador.Nome}={refreshToken}");
        }

        if (comCabecalho)
        {
            requisicao.Headers.Add(ExigirCabecalhoRequisicaoAttribute.NomeCabecalho, ExigirCabecalhoRequisicaoAttribute.ValorCabecalho);
        }

        return await cliente.SendAsync(requisicao);
    }
}
