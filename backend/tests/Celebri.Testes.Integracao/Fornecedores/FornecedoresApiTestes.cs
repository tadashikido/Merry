using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Fornecedores;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class FornecedoresApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private const string Rota = "/api/fornecedores";

    private readonly List<HttpClient> _clientesAnfitriao = [];

    public FornecedoresApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesAnfitriao)
        {
            cliente.Dispose();
        }
    }

    private static string RotaFornecedor(Guid id, string? acao = null)
    {
        return acao is null ? $"{Rota}/{id}" : $"{Rota}/{id}/{acao}";
    }

    private static object Corpo(
        string nomeEmpresa = "Buffet São João",
        string categoria = "Buffet",
        string? telefone = "(11) 98765-4321",
        string? site = "saojoao.com.br",
        string? instagram = "@Buffet.SaoJoao",
        string? observacoes = "Pede sinal de 30%.")
    {
        return new
        {
            categoria,
            nomeEmpresa,
            responsavel = "Marta Souza",
            telefone,
            email = "Contato@SaoJoao.com.br",
            site,
            instagram,
            observacoes,
        };
    }

    private static async Task<FornecedorDto> CriarAsync(HttpClient cliente, object? corpo = null)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota, corpo ?? Corpo());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<FornecedorDto>())!;
    }

    private static async Task<JsonElement> LerProblemaAsync(HttpResponseMessage resposta)
    {
        return (await resposta.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    private async Task<HttpClient> CriarClienteAnfitriaoAsync()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = ClienteAcessoAnfitriao.EmailAnfitriaoUnico();
        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);
        var aceite = await ClienteAcessoAnfitriao.AceitarAsync(ClienteAnonimo, ClienteAcessoAnfitriao.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;

        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesAnfitriao.Add(cliente);
        return cliente;
    }

    [Fact]
    public async Task Criar_DeveNormalizarGravarNaOrganizacaoDoTokenESemExporOrganizacao()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, new
        {
            categoria = "Buffet",
            nomeEmpresa = "  Buffet   São João ",
            telefone = "(11) 98765-4321",
            email = "Contato@SaoJoao.com.br",
            site = "saojoao.com.br",
            instagram = "https://www.instagram.com/Buffet.SaoJoao/",
            organizacaoId = OrganizacaoB.OrganizacaoId,
        });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("nomeNormalizado", corpo, StringComparison.OrdinalIgnoreCase);
        var fornecedor = JsonSerializer.Deserialize<FornecedorDto>(corpo, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal($"/api/fornecedores/{fornecedor.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("Buffet São João", fornecedor.NomeEmpresa);
        Assert.Equal("Buffet", fornecedor.Categoria);
        Assert.Equal("11987654321", fornecedor.Telefone);
        Assert.Equal("contato@saojoao.com.br", fornecedor.Email);
        Assert.Equal("https://saojoao.com.br", fornecedor.Site);
        Assert.Equal("buffet.saojoao", fornecedor.Instagram);
        Assert.False(fornecedor.Arquivado);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Fornecedores.SingleAsync();
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravado.OrganizacaoId);
        Assert.Equal("buffet sao joao", gravado.NomeNormalizado);
    }

    [Fact]
    public async Task ObterEListar_DevemRetornarDetalheComObservacoesEListaSemObservacoes()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        await CriarAsync(OrganizacaoA.Cliente, Corpo("Casa Aurora", "EspacoLocal"));

        var detalhe = (await OrganizacaoA.Cliente.GetFromJsonAsync<FornecedorDto>(RotaFornecedor(criado.Id)))!;
        Assert.Equal("Pede sinal de 30%.", detalhe.Observacoes);

        var respostaLista = await OrganizacaoA.Cliente.GetAsync(Rota);
        var textoLista = await respostaLista.Content.ReadAsStringAsync();
        Assert.DoesNotContain("observacoes", textoLista, StringComparison.OrdinalIgnoreCase);
        var lista = (await respostaLista.Content.ReadFromJsonAsync<List<FornecedorResumoDto>>())!;
        Assert.Equal(["Buffet São João", "Casa Aurora"], lista.Select(item => item.NomeEmpresa));
    }

    [Fact]
    public async Task Criar_NomeRepetidoNaCategoria_DeveRetornar422ComCampoEPermitirOutraCategoria()
    {
        await CriarAsync(OrganizacaoA.Cliente);

        var repetido = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, Corpo("buffet sao  JOAO"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, repetido.StatusCode);
        var problema = await LerProblemaAsync(repetido);
        Assert.Equal(MensagensFornecedores.NomeRepetido, problema.GetProperty("detail").GetString());
        Assert.Equal("nomeEmpresa", problema.GetProperty("campo").GetString());

        await CriarAsync(OrganizacaoA.Cliente, Corpo("Buffet São João", "BoloDoces"));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(2, await contexto.Fornecedores.CountAsync());
    }

    [Fact]
    public async Task Criar_NomeDeArquivado_DeveOrientarRestaurar()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync(RotaFornecedor(criado.Id, "arquivar"), null)).StatusCode);

        var repetido = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, Corpo());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, repetido.StatusCode);
        Assert.Equal(MensagensFornecedores.NomeRepetidoArquivado, (await LerProblemaAsync(repetido)).GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Criar_ConcorrenteComMesmoNome_DeveGravarUmSoEResponder422AoOutro()
    {
        var respostas = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => OrganizacaoA.Cliente.PostAsJsonAsync(Rota, Corpo("Banda Aurora", "Musica"))));

        Assert.Single(respostas, resposta => resposta.StatusCode == HttpStatusCode.Created);
        Assert.All(
            respostas.Where(resposta => resposta.StatusCode != HttpStatusCode.Created),
            resposta => Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(1, await contexto.Fornecedores.CountAsync());
    }

    [Theory]
    [InlineData("{\"nomeEmpresa\":\"Buffet\"}", "categoria")]
    [InlineData("{\"categoria\":\"Florista\",\"nomeEmpresa\":\"Buffet\"}", null)]
    [InlineData("{\"categoria\":\"Buffet\",\"nomeEmpresa\":\"B\"}", "nomeEmpresa")]
    [InlineData("{\"categoria\":\"Buffet\",\"nomeEmpresa\":\"Buffet\",\"site\":\"javascript:alert(1)\"}", "site")]
    [InlineData("{\"categoria\":\"Buffet\",\"nomeEmpresa\":\"Buffet\",\"telefone\":\"11 abc 9876\"}", "telefone")]
    [InlineData("{\"categoria\":\"Buffet\",\"nomeEmpresa\":\"Buffet\",\"email\":\"sem-arroba\"}", "email")]
    [InlineData("{\"categoria\":\"Buffet\",\"nomeEmpresa\":\"Buffet\",\"instagram\":\"com espaco\"}", "instagram")]
    public async Task Criar_DadosInvalidos_DeveRetornar400SemGravar(string json, string? campo)
    {
        using var conteudo = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(Rota, conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        if (campo is not null)
        {
            var erros = (await LerProblemaAsync(resposta)).GetProperty("errors");
            Assert.Contains(erros.EnumerateObject(), propriedade => propriedade.Name.Equals(campo, StringComparison.OrdinalIgnoreCase));
        }

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Fornecedores.AnyAsync());
    }

    [Fact]
    public async Task Criar_NoLimiteDaOrganizacao_DeveRetornar422()
    {
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var agora = DateTimeOffset.UtcNow;
            for (var indice = 0; indice < Fornecedor.LimitePorOrganizacao; indice++)
            {
                contexto.Fornecedores.Add(Fornecedor.Criar(new DadosFornecedor(CategoriaFornecedor.Outros, $"Fornecedor {indice}", null, null, null, null, null, null), agora));
            }

            await contexto.SaveChangesAsync();
        }

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, Corpo());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensFornecedores.LimiteFornecedores, (await LerProblemaAsync(resposta)).GetProperty("detail").GetString());
        Assert.Empty(await OrganizacaoB.Cliente.GetFromJsonAsync<List<FornecedorResumoDto>>(Rota) ?? []);
    }

    [Fact]
    public async Task AtualizarArquivarRestaurarERemover_DevemSeguirASituacao()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var atualizacao = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaFornecedor(criado.Id), Corpo("Buffet São João Eventos", telefone: null, site: null, instagram: null, observacoes: null));
        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);
        var atualizado = (await atualizacao.Content.ReadFromJsonAsync<FornecedorDto>())!;
        Assert.Equal("Buffet São João Eventos", atualizado.NomeEmpresa);
        Assert.Null(atualizado.Telefone);
        Assert.Null(atualizado.Observacoes);

        var arquivado = (await (await OrganizacaoA.Cliente.PostAsync(RotaFornecedor(criado.Id, "arquivar"), null)).Content.ReadFromJsonAsync<FornecedorDto>())!;
        Assert.True(arquivado.Arquivado);
        Assert.NotNull(arquivado.ArquivadoEm);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync(RotaFornecedor(criado.Id, "arquivar"), null)).StatusCode);

        var edicaoArquivado = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaFornecedor(criado.Id), Corpo("Outro nome"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, edicaoArquivado.StatusCode);
        Assert.Equal(MensagensFornecedores.ArquivadoSemEdicao, (await LerProblemaAsync(edicaoArquivado)).GetProperty("detail").GetString());

        var restaurado = (await (await OrganizacaoA.Cliente.PostAsync(RotaFornecedor(criado.Id, "restaurar"), null)).Content.ReadFromJsonAsync<FornecedorDto>())!;
        Assert.False(restaurado.Arquivado);
        Assert.Null(restaurado.ArquivadoEm);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaFornecedor(criado.Id))).StatusCode);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(RotaFornecedor(criado.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaFornecedor(criado.Id)));
    }

    [Fact]
    public async Task Atualizar_ParaNomeDeOutroFornecedor_DeveRetornar422()
    {
        await CriarAsync(OrganizacaoA.Cliente, Corpo("Buffet Oliveira"));
        var segundo = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaFornecedor(segundo.Id), Corpo("BUFFET OLIVEIRA"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal("nomeEmpresa", (await LerProblemaAsync(resposta)).GetProperty("campo").GetString());
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404EmTudoENaoAlterarNada()
    {
        var deA = await CriarAsync(OrganizacaoA.Cliente);

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaFornecedor(deA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaFornecedor(deA.Id), Corpo("Tomado por B")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaFornecedor(deA.Id, "arquivar"), null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaFornecedor(deA.Id, "restaurar"), null));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaFornecedor(deA.Id)));
        Assert.Empty((await OrganizacaoB.Cliente.GetFromJsonAsync<List<FornecedorResumoDto>>(Rota))!);

        var deB = await CriarAsync(OrganizacaoB.Cliente);
        Assert.NotEqual(deA.Id, deB.Id);

        var intacto = (await OrganizacaoA.Cliente.GetFromJsonAsync<FornecedorDto>(RotaFornecedor(deA.Id)))!;
        Assert.Equal(deA.NomeEmpresa, intacto.NomeEmpresa);
        Assert.False(intacto.Arquivado);
        Assert.Equal([deA.Id], (await OrganizacaoA.Cliente.GetFromJsonAsync<List<FornecedorResumoDto>>(Rota))!.Select(item => item.Id));
    }

    [Fact]
    public async Task Anfitriao_DeveReceber403EmTodosOsEndpoints()
    {
        var fornecedor = await CriarAsync(OrganizacaoA.Cliente);
        var anfitriao = await CriarClienteAnfitriaoAsync();

        var respostas = new[]
        {
            await anfitriao.GetAsync(Rota),
            await anfitriao.PostAsJsonAsync(Rota, Corpo("Dos anfitriões")),
            await anfitriao.GetAsync(RotaFornecedor(fornecedor.Id)),
            await anfitriao.PutAsJsonAsync(RotaFornecedor(fornecedor.Id), Corpo("Alterado")),
            await anfitriao.PostAsync(RotaFornecedor(fornecedor.Id, "arquivar"), null),
            await anfitriao.PostAsync(RotaFornecedor(fornecedor.Id, "restaurar"), null),
            await anfitriao.DeleteAsync(RotaFornecedor(fornecedor.Id)),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Fornecedores.SingleAsync();
        Assert.Equal("Buffet São João", gravado.NomeEmpresa);
        Assert.False(gravado.Arquivado);
    }

    [Fact]
    public async Task Anonimo_DeveReceber401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(Rota, Corpo())).StatusCode);
    }
}
