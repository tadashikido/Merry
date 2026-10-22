using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Tarefas;

namespace Celebri.Testes.Integracao.Tarefas;

public static class ClienteTarefas
{
    public const string RotaPendencias = "/api/tarefas/pendencias";

    public static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/tarefas";
    }

    public static string Rota(Guid eventoId, Guid tarefaId)
    {
        return $"{Rota(eventoId)}/{tarefaId}";
    }

    public static string RotaStatus(Guid eventoId, Guid tarefaId)
    {
        return $"{Rota(eventoId, tarefaId)}/status";
    }

    public static string Data(DateOnly data)
    {
        return data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    public static object Corpo(
        string titulo = "Contratar fotógrafo",
        string responsavel = "Assessoria",
        DateOnly? prazo = null,
        string categoria = "Fornecedores",
        string? descricao = "Pedir três orçamentos")
    {
        return new
        {
            titulo,
            descricao,
            responsavel,
            categoria,
            prazo = prazo is { } valor ? Data(valor) : null,
        };
    }

    public static async Task<TarefaDto> CriarAsync(HttpClient cliente, Guid eventoId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(eventoId), corpo ?? Corpo());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<TarefaDto>())!;
    }

    public static async Task<ListaTarefasDto> ListarAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(Rota(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ListaTarefasDto>())!;
    }

    public static Task<HttpResponseMessage> AlterarStatusAsync(HttpClient cliente, Guid eventoId, Guid tarefaId, string status)
    {
        return cliente.PatchAsJsonAsync(RotaStatus(eventoId, tarefaId), new { status });
    }
}
