using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Casamento.Aplicacao.Tarefas;

namespace Casamento.Testes.Integracao.Tarefas;

public static class ClienteTarefas
{
    public const string RotaPendencias = "/api/tarefas/pendencias";

    public static string Rota(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/tarefas";
    }

    public static string Rota(Guid casamentoId, Guid tarefaId)
    {
        return $"{Rota(casamentoId)}/{tarefaId}";
    }

    public static string RotaStatus(Guid casamentoId, Guid tarefaId)
    {
        return $"{Rota(casamentoId, tarefaId)}/status";
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

    public static async Task<TarefaDto> CriarAsync(HttpClient cliente, Guid casamentoId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(casamentoId), corpo ?? Corpo());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<TarefaDto>())!;
    }

    public static async Task<ListaTarefasDto> ListarAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(Rota(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ListaTarefasDto>())!;
    }

    public static Task<HttpResponseMessage> AlterarStatusAsync(HttpClient cliente, Guid casamentoId, Guid tarefaId, string status)
    {
        return cliente.PatchAsJsonAsync(RotaStatus(casamentoId, tarefaId), new { status });
    }
}
