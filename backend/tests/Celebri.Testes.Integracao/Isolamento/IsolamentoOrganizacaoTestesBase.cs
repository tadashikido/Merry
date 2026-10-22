using System.Net;
using System.Net.Http.Headers;
using Celebri.Api.Tratamento;
using Celebri.Infraestrutura.Persistencia;
using Celebri.Testes.Integracao.Banco;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;

namespace Celebri.Testes.Integracao.Isolamento;

public sealed record OrganizacaoTeste(Guid OrganizacaoId, Guid UsuarioId, string Email, string TokenAcesso, HttpClient Cliente);

public abstract class IsolamentoOrganizacaoTestesBase : IAsyncLifetime
{
    private readonly BancoPostgreSqlFixture _banco;
    private readonly List<HttpClient> _clientes = [];

    protected IsolamentoOrganizacaoTestesBase(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    protected FabricaApiIsolamento Fabrica { get; private set; } = null!;

    protected HttpClient ClienteAnonimo { get; private set; } = null!;

    protected OrganizacaoTeste OrganizacaoA { get; private set; } = null!;

    protected OrganizacaoTeste OrganizacaoB { get; private set; } = null!;

    protected virtual bool IncluirEntidadeTeste => false;

    public async Task InitializeAsync()
    {
        Fabrica = new FabricaApiIsolamento(_banco.CriarStringConexaoBancoNovo(), IncluirEntidadeTeste);
        ClienteAnonimo = CriarCliente();

        if (IncluirEntidadeTeste)
        {
            await using var contexto = CriarContextoSemOrganizacao();
            await contexto.Database.ExecuteSqlRawAsync(CustomizadorModeloIsolamento.SqlCriarTabela);
        }

        OrganizacaoA = await CadastrarOrganizacaoAsync();
        OrganizacaoB = await CadastrarOrganizacaoAsync();
    }

    public async Task DisposeAsync()
    {
        foreach (var cliente in _clientes)
        {
            cliente.Dispose();
        }

        await Fabrica.DisposeAsync();
    }

    protected CelebriDbContext CriarContexto(OrganizacaoTeste organizacao)
    {
        return CriarContexto(organizacao.OrganizacaoId);
    }

    protected CelebriDbContext CriarContexto(Guid? organizacaoId)
    {
        return new CelebriDbContext(Fabrica.CriarOpcoesDbContext(), new ContextoIsolamentoFixo(organizacaoId));
    }

    protected CelebriDbContext CriarContextoSemOrganizacao()
    {
        return CriarContexto((Guid?)null);
    }

    protected static async Task AssertNaoEncontradoAsync(HttpResponseMessage resposta)
    {
        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(ExcecaoGlobalHandler.TituloNaoEncontrado, json.RootElement.GetProperty("title").GetString());
    }

    private async Task<OrganizacaoTeste> CadastrarOrganizacaoAsync()
    {
        var email = EmailUnico();
        var resposta = await CadastrarAsync(ClienteAnonimo, email);
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);

        using var json = await LerJsonAsync(resposta);
        var usuario = json.RootElement.GetProperty("usuario");
        var tokenAcesso = json.RootElement.GetProperty("tokenAcesso").GetString()!;
        var cliente = CriarCliente();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenAcesso);

        return new OrganizacaoTeste(
            usuario.GetProperty("organizacao").GetProperty("id").GetGuid(),
            usuario.GetProperty("id").GetGuid(),
            email,
            tokenAcesso,
            cliente);
    }

    private HttpClient CriarCliente()
    {
        var cliente = Fabrica.CriarClienteHttps();
        _clientes.Add(cliente);
        return cliente;
    }
}
