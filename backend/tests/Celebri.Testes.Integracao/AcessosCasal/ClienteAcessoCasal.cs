using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Celebri.Aplicacao.AcessosCasal;
using Celebri.Testes.Integracao.Infraestrutura;

namespace Celebri.Testes.Integracao.AcessosCasal;

public static partial class ClienteAcessoCasal
{
    public const string RotaConsulta = "/api/acesso-casal/consulta";
    public const string RotaAceite = "/api/acesso-casal/aceite";
    public const string SenhaCasal = "casalFeliz2027";

    public static string Rota(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/acessos-casal";
    }

    public static string Rota(Guid casamentoId, Guid acessoId)
    {
        return $"{Rota(casamentoId)}/{acessoId}";
    }

    public static string EmailCasalUnico()
    {
        return $"casal-{Guid.NewGuid():N}@exemplo.com";
    }

    public static Task<HttpResponseMessage> ConvidarAsync(HttpClient cliente, Guid casamentoId, string email, string nome = "Lívia Moraes")
    {
        return cliente.PostAsJsonAsync(Rota(casamentoId), new { nome, email });
    }

    public static async Task<AcessoCasalDto> ConvidarComSucessoAsync(HttpClient cliente, Guid casamentoId, string email, string nome = "Lívia Moraes")
    {
        var resposta = await ConvidarAsync(cliente, casamentoId, email, nome);
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<AcessoCasalDto>())!;
    }

    public static string UltimoToken(EnvioEmailMemoria email, string destinatario)
    {
        var mensagem = email.Enviadas.Last(item => item.Destinatario == destinatario);
        var correspondencia = ExpressaoToken().Match(mensagem.CorpoTexto);
        Assert.True(correspondencia.Success, "O e-mail de convite não contém o link com o token.");
        return correspondencia.Groups[1].Value;
    }

    public static int QuantidadeEmails(EnvioEmailMemoria email, string destinatario)
    {
        return email.Enviadas.Count(item => item.Destinatario == destinatario);
    }

    public static Task<HttpResponseMessage> ConsultarAsync(HttpClient cliente, string token)
    {
        return cliente.PostAsJsonAsync(RotaConsulta, new { token });
    }

    public static Task<HttpResponseMessage> AceitarAsync(HttpClient cliente, string token, string senha = SenhaCasal)
    {
        return cliente.PostAsJsonAsync(RotaAceite, new { token, senha });
    }

    [GeneratedRegex("/acesso-casal#token=([A-Za-z0-9_-]{43})")]
    private static partial Regex ExpressaoToken();
}
