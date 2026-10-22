using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresEvento;

namespace Celebri.Testes.Integracao.Cronogramas;

public static class ClienteCronograma
{
    public static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/cronograma";
    }

    public static string Rota(Guid eventoId, Guid itemId)
    {
        return $"{Rota(eventoId)}/{itemId}";
    }

    public static object Corpo(
        string atividade = "Cerimônia",
        string? inicio = "16:30",
        int? duracaoMinutos = 45,
        string? dia = "DiaDoEvento",
        string? local = "Capela São José",
        string? responsavel = "Fernanda",
        Guid? fornecedorEventoId = null,
        string? instrucoes = "Chegar 15 minutos antes.",
        string? notasInternas = "Celebrante cobra hora extra.")
    {
        return new
        {
            dia,
            inicio,
            duracaoMinutos,
            atividade,
            local,
            responsavel,
            fornecedorEventoId,
            instrucoes,
            notasInternas,
        };
    }

    public static async Task<ItemCronogramaDto> CriarAsync(HttpClient cliente, Guid eventoId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(eventoId), corpo ?? Corpo());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ItemCronogramaDto>())!;
    }

    public static async Task<CronogramaDto> ListarAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(Rota(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<CronogramaDto>())!;
    }

    public static async Task<Guid> CriarVinculoAsync(HttpClient cliente, Guid eventoId, string nome, string status = "Cotacao")
    {
        var fornecedor = await cliente.PostAsJsonAsync("/api/fornecedores", new
        {
            categoria = "Musica",
            nomeEmpresa = nome,
            responsavel = "Marta",
            telefone = "(11) 98765-4321",
            email = (string?)null,
            site = (string?)null,
            instagram = (string?)null,
            observacoes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.Created, fornecedor.StatusCode);
        var fornecedorId = (await fornecedor.Content.ReadFromJsonAsync<FornecedorDto>())!.Id;

        var vinculo = await cliente.PostAsJsonAsync($"/api/eventos/{eventoId}/fornecedores", new
        {
            fornecedorId,
            servico = "Música da cerimônia",
            valorOrcado = 3_000m,
            valorContratado = status == "Contratado" ? 3_000m : (decimal?)null,
            status,
            notasInternas = (string?)null,
        });
        Assert.Equal(HttpStatusCode.Created, vinculo.StatusCode);
        return (await vinculo.Content.ReadFromJsonAsync<FornecedorEventoDto>())!.Id;
    }
}
