using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Aplicacao.ModelosCronograma;
using Microsoft.AspNetCore.Mvc;

namespace Celebri.Testes.Integracao.Cronogramas;

public static class ClienteModelosCronograma
{
    public const string RotaModelos = "/api/modelos-cronograma";

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

    public static string RotaSalvarComoModelo(Guid eventoId)
    {
        return $"{ClienteCronograma.Rota(eventoId)}/modelos";
    }

    public static string RotaPrevia(Guid eventoId, Guid modeloId)
    {
        return $"{ClienteCronograma.Rota(eventoId)}/previa?modeloId={modeloId}";
    }

    public static string RotaAplicacoes(Guid eventoId)
    {
        return $"{ClienteCronograma.Rota(eventoId)}/aplicacoes";
    }

    public static string RotaRecalculo(Guid eventoId)
    {
        return $"{ClienteCronograma.Rota(eventoId)}/recalculo-horarios";
    }

    public static object CorpoItem(
        int? minutos = -60,
        string atividade = "Chegada da banda",
        int? duracaoMinutos = 30,
        string? referenciaLocal = null,
        string? local = "Salão principal",
        string? responsavel = "Banda/DJ",
        string? categoriaFornecedor = "Musica",
        string? instrucoes = "Passagem de som.")
    {
        return new
        {
            minutosDesdeCerimonia = minutos,
            duracaoMinutos,
            atividade,
            referenciaLocal,
            local,
            responsavel,
            categoriaFornecedor,
            instrucoes,
        };
    }

    public static async Task<IReadOnlyList<ModeloCronogramaResumoDto>> ListarAsync(HttpClient cliente)
    {
        var resposta = await cliente.GetAsync(RotaModelos);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<List<ModeloCronogramaResumoDto>>())!;
    }

    public static async Task<ModeloCronogramaDto> ObterAsync(HttpClient cliente, Guid modeloId)
    {
        var resposta = await cliente.GetAsync(RotaModelo(modeloId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ModeloCronogramaDto>())!;
    }

    public static async Task<ModeloCronogramaDto> SugeridoAsync(HttpClient cliente)
    {
        var sugerido = Assert.Single(await ListarAsync(cliente), modelo => modelo.Sugerido && modelo.TipoEvento == "Casamento");
        return await ObterAsync(cliente, sugerido.Id);
    }

    public static async Task<ModeloCronogramaDto> CriarAsync(HttpClient cliente, string nome = "Roteiro fazenda", string? horarioReferencia = "16:00")
    {
        var resposta = await cliente.PostAsJsonAsync(RotaModelos, new { nome, descricao = "Ao ar livre", horarioReferencia });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ModeloCronogramaDto>())!;
    }

    public static async Task<ItemModeloCronogramaDto> CriarItemAsync(HttpClient cliente, Guid modeloId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(RotaItens(modeloId), corpo ?? CorpoItem());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ItemModeloCronogramaDto>())!;
    }

    public static Task<HttpResponseMessage> AplicarAsync(HttpClient cliente, Guid eventoId, Guid modeloId)
    {
        return cliente.PostAsJsonAsync(RotaAplicacoes(eventoId), new { modeloId });
    }

    public static async Task<AplicacaoModeloCronogramaDto> AplicarComSucessoAsync(HttpClient cliente, Guid eventoId, Guid modeloId)
    {
        var resposta = await AplicarAsync(cliente, eventoId, modeloId);
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<AplicacaoModeloCronogramaDto>())!;
    }

    public static async Task<AplicacaoModeloCronogramaDto> PreverAsync(HttpClient cliente, Guid eventoId, Guid modeloId)
    {
        var resposta = await cliente.GetAsync(RotaPrevia(eventoId, modeloId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<AplicacaoModeloCronogramaDto>())!;
    }

    public static async Task<string?> CampoAsync(HttpResponseMessage resposta)
    {
        var problema = (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
        return problema.Extensions.TryGetValue("campo", out var campo) ? campo?.ToString() : null;
    }

    public static async Task<Guid> VincularFornecedorAsync(HttpClient cliente, Guid eventoId, string nome, string categoria, string status = "Contratado")
    {
        var fornecedor = await cliente.PostAsJsonAsync("/api/fornecedores", new
        {
            categoria,
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
            servico = "Serviço do dia",
            valorOrcado = 3_000m,
            valorContratado = status == "Contratado" ? 3_000m : (decimal?)null,
            status,
            notasInternas = (string?)null,
        });
        Assert.Equal(HttpStatusCode.Created, vinculo.StatusCode);
        return (await vinculo.Content.ReadFromJsonAsync<FornecedorEventoDto>())!.Id;
    }
}
