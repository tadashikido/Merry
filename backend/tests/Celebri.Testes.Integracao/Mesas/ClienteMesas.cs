using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Mesas;
using Celebri.Testes.Integracao.Convidados;

namespace Celebri.Testes.Integracao.Mesas;

public static class ClienteMesas
{
    public static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/mesas";
    }

    public static string Rota(Guid eventoId, Guid mesaId)
    {
        return $"{Rota(eventoId)}/{mesaId}";
    }

    public static string RotaPessoas(Guid eventoId, Guid mesaId)
    {
        return $"{Rota(eventoId, mesaId)}/pessoas";
    }

    public static string RotaRetirada(Guid eventoId)
    {
        return $"{Rota(eventoId)}/retirada";
    }

    public static string RotaDispensa(Guid eventoId)
    {
        return $"{Rota(eventoId)}/avisos-saida/dispensa";
    }

    public static object Corpo(int? numero = 1, string? nome = "Padrinhos", int? capacidade = 8, bool? especial = false)
    {
        return new { numero, nome, capacidade, especial };
    }

    public static object Pessoas(params Guid[] convidadosIds)
    {
        return new { convidadosIds };
    }

    public static async Task<MesaDto> CriarAsync(HttpClient cliente, Guid eventoId, int numero = 1, int capacidade = 8, string? nome = null, bool especial = false)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(eventoId), Corpo(numero, nome, capacidade, especial));
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MesaDto>())!;
    }

    public static async Task<MapaMesasDto> MapaAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(Rota(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MapaMesasDto>())!;
    }

    public static Task<HttpResponseMessage> SentarAsync(HttpClient cliente, Guid eventoId, Guid mesaId, params Guid[] convidadosIds)
    {
        return cliente.PostAsJsonAsync(RotaPessoas(eventoId, mesaId), Pessoas(convidadosIds));
    }

    public static async Task<MapaMesasDto> SentarComSucessoAsync(HttpClient cliente, Guid eventoId, Guid mesaId, params Guid[] convidadosIds)
    {
        var resposta = await SentarAsync(cliente, eventoId, mesaId, convidadosIds);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MapaMesasDto>())!;
    }

    public static async Task<ConviteDto> CriarConviteConfirmadoAsync(HttpClient cliente, Guid eventoId, string nome, params string[] pessoas)
    {
        var convidados = pessoas
            .Select(pessoa => ClienteConvites.Pessoa(pessoa, null, null, "Adulto", "Confirmado"))
            .ToArray();
        return await ClienteConvites.CriarAsync(cliente, eventoId, ClienteConvites.CorpoValido(nome, "Família da noiva", 0, convidados));
    }
}
