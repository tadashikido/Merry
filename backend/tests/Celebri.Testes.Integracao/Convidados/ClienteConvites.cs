using System.Net;
using System.Net.Http.Json;
using Casamento.Aplicacao.Convidados;

namespace Casamento.Testes.Integracao.Convidados;

public static class ClienteConvites
{
    public static string Rota(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/convites";
    }

    public static string Rota(Guid casamentoId, Guid conviteId)
    {
        return $"{Rota(casamentoId)}/{conviteId}";
    }

    public static object Pessoa(
        string nome = "Carla Souza",
        string? telefone = "(11) 98765-4321",
        string? email = "Carla@Exemplo.com",
        string? faixaEtaria = "Adulto",
        string? resposta = null,
        Guid? id = null)
    {
        return new { id, nome, telefone, email, faixaEtaria, resposta };
    }

    public static object CorpoValido(
        string? nome = "Família Souza",
        string? grupo = "Família da noiva",
        int? limiteAcompanhantes = 1,
        params object[] convidados)
    {
        return new
        {
            nome,
            grupo,
            limiteAcompanhantes,
            convidados = convidados.Length > 0
                ? convidados
                : [Pessoa(), Pessoa("Pedro Souza", null, null, "Crianca")],
        };
    }

    public static async Task<ConviteDto> CriarAsync(HttpClient cliente, Guid casamentoId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(casamentoId), corpo ?? CorpoValido());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ConviteDto>())!;
    }

    public static async Task<ListaConvitesDto> ListarAsync(HttpClient cliente, Guid casamentoId)
    {
        var resposta = await cliente.GetAsync(Rota(casamentoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ListaConvitesDto>())!;
    }
}
