using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Celebri.Aplicacao.AcessosAnfitriao;
using Celebri.Testes.Integracao.Infraestrutura;

namespace Celebri.Testes.Integracao.AcessosAnfitriao;

public static partial class ClienteAcessoAnfitriao
{
    public const string RotaConsulta = "/api/acesso-anfitriao/consulta";
    public const string RotaAceite = "/api/acesso-anfitriao/aceite";
    public const string SenhaAnfitriao = "anfitriaoFeliz2027";

    public static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/acessos-anfitriao";
    }

    public static string Rota(Guid eventoId, Guid acessoId)
    {
        return $"{Rota(eventoId)}/{acessoId}";
    }

    public static string EmailAnfitriaoUnico()
    {
        return $"anfitriao-{Guid.NewGuid():N}@exemplo.com";
    }

    public static Task<HttpResponseMessage> ConvidarAsync(HttpClient cliente, Guid eventoId, string email, string nome = "Lívia Moraes")
    {
        return cliente.PostAsJsonAsync(Rota(eventoId), new { nome, email });
    }

    public static async Task<AcessoAnfitriaoDto> ConvidarComSucessoAsync(HttpClient cliente, Guid eventoId, string email, string nome = "Lívia Moraes")
    {
        var resposta = await ConvidarAsync(cliente, eventoId, email, nome);
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<AcessoAnfitriaoDto>())!;
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

    public static Task<HttpResponseMessage> AceitarAsync(HttpClient cliente, string token, string senha = SenhaAnfitriao)
    {
        return cliente.PostAsJsonAsync(RotaAceite, new { token, senha });
    }

    [GeneratedRegex("/acesso-anfitriao#token=([A-Za-z0-9_-]{43})")]
    private static partial Regex ExpressaoToken();
}
