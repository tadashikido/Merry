using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Eventos;
using Celebri.Infraestrutura.Calendario;

namespace Celebri.Testes.Integracao.Eventos;

public static class ClienteEventos
{
    public const string Rota = "/api/eventos";

    public static DateOnly HojeEmSaoPaulo()
    {
        return new CalendarioSaoPaulo(TimeProvider.System).Hoje();
    }

    public static object CorpoValido(
        string nomePrimeiraPessoa = "Ana Beatriz",
        string nomeSegundaPessoa = "Bruno",
        string? data = "2027-05-15",
        string? horario = "16:30",
        string? localCerimonia = "Capela São José",
        string? localRecepcao = "Espaço Jardim",
        int? convidadosEstimados = 150,
        string? observacoes = "Flores brancas")
    {
        return new
        {
            nomePrimeiraPessoa,
            nomeSegundaPessoa,
            data,
            horario,
            localCerimonia,
            localRecepcao,
            convidadosEstimados,
            observacoes,
        };
    }

    public static async Task<EventoDto> CriarAsync(HttpClient cliente, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota, corpo ?? CorpoValido());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;
    }

    public static async Task<IReadOnlyList<EventoResumoDto>> ListarAsync(HttpClient cliente, string? situacao = null)
    {
        var rota = situacao is null ? Rota : $"{Rota}?situacao={situacao}";
        var resposta = await cliente.GetAsync(rota);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<List<EventoResumoDto>>())!;
    }
}
