using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Rsvp;
using Celebri.Testes.Integracao.Convidados;

namespace Celebri.Testes.Integracao.Rsvp;

public static class ClienteRsvp
{
    public const string RotaConsulta = "/api/rsvp/consulta";
    public const string RotaResposta = "/api/rsvp/resposta";

    public static string RotaLink(Guid casamentoId, Guid conviteId)
    {
        return $"{ClienteConvites.Rota(casamentoId, conviteId)}/link-rsvp";
    }

    public static string RotaEnvio(Guid casamentoId, Guid conviteId)
    {
        return $"{ClienteConvites.Rota(casamentoId, conviteId)}/envio";
    }

    public static async Task<LinkRsvpDto> GerarLinkAsync(HttpClient cliente, Guid casamentoId, Guid conviteId)
    {
        var resposta = await cliente.PostAsync(RotaLink(casamentoId, conviteId), null);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<LinkRsvpDto>())!;
    }

    public static Task<HttpResponseMessage> ConsultarAsync(HttpClient cliente, string? token)
    {
        return cliente.PostAsJsonAsync(RotaConsulta, new { token });
    }

    public static async Task<RsvpPublicoDto> ConsultarComSucessoAsync(HttpClient cliente, string token)
    {
        var resposta = await ConsultarAsync(cliente, token);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<RsvpPublicoDto>())!;
    }

    public static Task<HttpResponseMessage> ResponderAsync(
        HttpClient cliente,
        string token,
        IEnumerable<(Guid Id, string Resposta)> pessoas,
        params object[] acompanhantes)
    {
        return cliente.PutAsJsonAsync(RotaResposta, new
        {
            token,
            pessoas = pessoas.Select(pessoa => new { id = pessoa.Id, resposta = pessoa.Resposta }).ToList(),
            acompanhantes,
        });
    }

    public static object Acompanhante(string nome, string faixaEtaria = "Adulto", Guid? id = null)
    {
        return new { id, nome, faixaEtaria };
    }
}
