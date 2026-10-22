using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Convidados;

namespace Celebri.Testes.Integracao.Convidados;

public static class ClienteConvites
{
    public static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/convites";
    }

    public static string Rota(Guid eventoId, Guid conviteId)
    {
        return $"{Rota(eventoId)}/{conviteId}";
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

    public static async Task<ConviteDto> CriarAsync(HttpClient cliente, Guid eventoId, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(eventoId), corpo ?? CorpoValido());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ConviteDto>())!;
    }

    public static async Task<ListaConvitesDto> ListarAsync(HttpClient cliente, Guid eventoId)
    {
        var resposta = await cliente.GetAsync(Rota(eventoId));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<ListaConvitesDto>())!;
    }
}
