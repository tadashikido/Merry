using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Checklists;

namespace Celebri.Testes.Integracao.Checklists;

public static class ClienteChecklist
{
    public const string RotaModelos = "/api/modelos-checklist";

    public static string RotaModelo(Guid modeloId)
    {
        return $"{RotaModelos}/{modeloId}";
    }

    public static string RotaItens(Guid modeloId)
    {
        return $"{RotaModelo(modeloId)}/itens";
    }

    public static string RotaItem(Guid modeloId, Guid itemId)
    {
        return $"{RotaItens(modeloId)}/{itemId}";
    }

    public static string RotaChecklist(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/checklist";
    }

    public static string RotaPrevia(Guid casamentoId, Guid modeloId)
    {
        return $"{RotaChecklist(casamentoId)}/previa?modeloId={modeloId}";
    }

    public static string RotaAplicacoes(Guid casamentoId)
    {
        return $"{RotaChecklist(casamentoId)}/aplicacoes";
    }

    public static string RotaRecalculo(Guid casamentoId)
    {
        return $"{RotaChecklist(casamentoId)}/recalculo-prazos";
    }

    public static object CorpoItem(
        string titulo = "Contratar buffet",
        int? dias = 365,
        string responsavel = "Assessoria",
        string categoria = "Fornecedores",
        string? descricao = null)
    {
        return new { titulo, descricao, responsavel, categoria, diasAntesDoCasamento = dias };
    }

    public static async Task<IReadOnlyList<ModeloChecklistResumoDto>> ListarModelosAsync(HttpClient cliente)
    {
        var resposta = await cliente.GetAsync(RotaModelos);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<List<ModeloChecklistResumoDto>>())!;
    }

    public static async Task<ModeloChecklistDto> CriarModeloAsync(HttpClient cliente, string nome = "Casamento no campo", string? descricao = null)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaModelos, new { nome, descricao });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ModeloChecklistDto>())!;
    }

    public static async Task<ItemModeloChecklistDto> CriarItemAsync(HttpClient cliente, Guid modeloId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaItens(modeloId), corpo ?? CorpoItem());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ItemModeloChecklistDto>())!;
    }

    public static async Task<ModeloChecklistDto> CriarModeloComItensAsync(HttpClient cliente, IEnumerable<int> dias, string nome = "Modelo completo")
    {
        var modelo = await CriarModeloAsync(cliente, nome);
        var indice = 0;
        foreach (var valor in dias)
        {
            indice++;
            await CriarItemAsync(cliente, modelo.Id, CorpoItem($"Item {indice:000}", valor, indice % 3 == 0 ? "Casal" : "Assessoria"));
        }

        return (await cliente.GetFromJsonAsync<ModeloChecklistDto>(RotaModelo(modelo.Id)))!;
    }

    public static async Task<HttpResponseMessage> AplicarAsync(HttpClient cliente, Guid casamentoId, Guid modeloId)
    {
        return await cliente.PostAsJsonAsync(RotaAplicacoes(casamentoId), new { modeloId });
    }

    public static async Task<AplicacaoModeloChecklistDto> AplicarComSucessoAsync(HttpClient cliente, Guid casamentoId, Guid modeloId)
    {
        var resposta = await AplicarAsync(cliente, casamentoId, modeloId);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<AplicacaoModeloChecklistDto>())!;
    }

    public static async Task<ChecklistCasamentoDto> ObterChecklistAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(RotaChecklist(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ChecklistCasamentoDto>())!;
    }
}
