using System.Net;
using System.Net.Http.Json;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Mesas;
using Casamento.Testes.Integracao.Convidados;

namespace Casamento.Testes.Integracao.Mesas;

public static class ClienteMesas
{
    public static string Rota(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/mesas";
    }

    public static string Rota(Guid casamentoId, Guid mesaId)
    {
        return $"{Rota(casamentoId)}/{mesaId}";
    }

    public static string RotaPessoas(Guid casamentoId, Guid mesaId)
    {
        return $"{Rota(casamentoId, mesaId)}/pessoas";
    }

    public static string RotaRetirada(Guid casamentoId)
    {
        return $"{Rota(casamentoId)}/retirada";
    }

    public static string RotaDispensa(Guid casamentoId)
    {
        return $"{Rota(casamentoId)}/avisos-saida/dispensa";
    }

    public static object Corpo(int? numero = 1, string? nome = "Padrinhos", int? capacidade = 8, bool? especial = false)
    {
        return new { numero, nome, capacidade, especial };
    }

    public static object Pessoas(params Guid[] convidadosIds)
    {
        return new { convidadosIds };
    }

    public static async Task<MesaDto> CriarAsync(HttpClient cliente, Guid casamentoId, int numero = 1, int capacidade = 8, string? nome = null, bool especial = false)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(casamentoId), Corpo(numero, nome, capacidade, especial));
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MesaDto>())!;
    }

    public static async Task<MapaMesasDto> MapaAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(Rota(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MapaMesasDto>())!;
    }

    public static Task<HttpResponseMessage> SentarAsync(HttpClient cliente, Guid casamentoId, Guid mesaId, params Guid[] convidadosIds)
    {
        return cliente.PostAsJsonAsync(RotaPessoas(casamentoId, mesaId), Pessoas(convidadosIds));
    }

    public static async Task<MapaMesasDto> SentarComSucessoAsync(HttpClient cliente, Guid casamentoId, Guid mesaId, params Guid[] convidadosIds)
    {
        var resposta = await SentarAsync(cliente, casamentoId, mesaId, convidadosIds);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<MapaMesasDto>())!;
    }

    public static async Task<ConviteDto> CriarConviteConfirmadoAsync(HttpClient cliente, Guid casamentoId, string nome, params string[] pessoas)
    {
        var convidados = pessoas
            .Select(pessoa => ClienteConvites.Pessoa(pessoa, null, null, "Adulto", "Confirmado"))
            .ToArray();
        return await ClienteConvites.CriarAsync(cliente, casamentoId, ClienteConvites.CorpoValido(nome, "Família da noiva", 0, convidados));
    }
}
