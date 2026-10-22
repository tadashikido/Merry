using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Checklists;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Checklists.ClienteChecklist;

namespace Celebri.Testes.Integracao.Checklists;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ModelosChecklistApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ModelosChecklistApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    [Fact]
    public async Task Listar_PrimeiroAcesso_DeveSemearOModeloSugeridoUmaUnicaVez()
    {
        var primeira = await ListarModelosAsync(OrganizacaoA.Cliente);
        var segunda = await ListarModelosAsync(OrganizacaoA.Cliente);

        Assert.All(primeira, modelo => Assert.True(modelo.Sugerido));
        Assert.Equal(
            ModeloChecklistSugerido.Conteudos.Select(conteudo => conteudo.Tipo.ToString()).Order(),
            primeira.Select(modelo => modelo.TipoEvento!).Order());
        Assert.Equal(primeira.Select(modelo => modelo.Id).Order(), segunda.Select(modelo => modelo.Id).Order());
        var sugerido = Assert.Single(primeira, modelo => modelo.TipoEvento == nameof(TipoEvento.Casamento));
        Assert.Equal(ModeloChecklistSugerido.Casamento.Nome, sugerido.Nome);
        Assert.Equal(ModeloChecklistSugerido.Casamento.Itens.Count, sugerido.QuantidadeItens);

        var detalhe = (await OrganizacaoA.Cliente.GetFromJsonAsync<ModeloChecklistDto>(RotaModelo(sugerido.Id)))!;
        Assert.Equal(
            [ModeloChecklistSugerido.DozeMeses, ModeloChecklistSugerido.SeisMeses, ModeloChecklistSugerido.TresMeses, ModeloChecklistSugerido.TrintaDias],
            detalhe.Itens.Select(item => item.DiasAntesDoEvento).Distinct());

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(ModeloChecklistSugerido.Conteudos.Count, await contexto.ModelosChecklist.CountAsync());
        var organizacao = await contexto.Organizacoes.SingleAsync(item => item.Id == OrganizacaoA.OrganizacaoId);
        Assert.NotNull(organizacao.ModeloChecklistSugeridoEm);
        Assert.NotNull(organizacao.ModelosChecklistPorTipoEm);
    }

    [Fact]
    public async Task Listar_ConcorrentePrimeiroAcesso_NaoDeveDuplicarOSugerido()
    {
        var respostas = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => OrganizacaoA.Cliente.GetAsync(RotaModelos)));

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.OK, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(ModeloChecklistSugerido.Conteudos.Count, await contexto.ModelosChecklist.CountAsync(modelo => modelo.Sugerido));
    }

    [Fact]
    public async Task Listar_AposExcluirOSugerido_NaoDeveRecriar()
    {
        foreach (var sugerido in await ListarModelosAsync(OrganizacaoA.Cliente))
        {
            Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaModelo(sugerido.Id))).StatusCode);
        }

        Assert.Empty(await ListarModelosAsync(OrganizacaoA.Cliente));
    }

    [Fact]
    public async Task Sugerido_DeveSerEditavel()
    {
        var sugerido = Assert.Single(await ListarModelosAsync(OrganizacaoA.Cliente), modelo => modelo.TipoEvento == nameof(TipoEvento.Casamento));

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaModelo(sugerido.Id), new { nome = "Checklist da Renata", descricao = "Ajustado" });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var modelo = (await resposta.Content.ReadFromJsonAsync<ModeloChecklistDto>())!;
        Assert.Equal("Checklist da Renata", modelo.Nome);
        Assert.True(modelo.Sugerido);
        Assert.Equal(ModeloChecklistSugerido.Casamento.Itens.Count, modelo.Itens.Count);
        Assert.Equal(nameof(TipoEvento.Casamento), modelo.TipoEvento);
    }

    [Fact]
    public async Task CriarModeloEItens_DeveRetornarItensOrdenadosSemOrganizacao()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaModelos, new { nome = "  Evento   na praia ", descricao = "Pé na areia" });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", corpo, StringComparison.OrdinalIgnoreCase);
        var modelo = (await resposta.Content.ReadFromJsonAsync<ModeloChecklistDto>())!;
        Assert.Equal($"/api/modelos-checklist/{modelo.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("Evento na praia", modelo.Nome);
        Assert.False(modelo.Sugerido);

        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Prova final", 30, "Anfitriao", "TrajesBeleza"));
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Reservar o local", 365, "Assessoria", "Cerimonia"));
        var album = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Entregar o álbum", -20, "Assessoria", "Geral"));

        var detalhe = (await OrganizacaoA.Cliente.GetFromJsonAsync<ModeloChecklistDto>(RotaModelo(modelo.Id)))!;
        Assert.Equal(["Reservar o local", "Prova final", "Entregar o álbum"], detalhe.Itens.Select(item => item.Titulo));
        Assert.Equal(-20, album.DiasAntesDoEvento);
        Assert.Equal("Anfitriao", detalhe.Itens[1].Responsavel);

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.All(await contexto.ItensModeloChecklist.ToListAsync(), item => Assert.Equal(OrganizacaoA.OrganizacaoId, item.OrganizacaoId));
    }

    [Fact]
    public async Task AtualizarERemoverItem_DevemRefletirNoModelo()
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente);
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        var atualizacao = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaItem(modelo.Id, item.Id), CorpoItem("Degustação", 90, "Anfitriao", "Recepcao", "Levar os pais"));
        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);
        var atualizado = (await atualizacao.Content.ReadFromJsonAsync<ItemModeloChecklistDto>())!;
        Assert.Equal(new ItemModeloChecklistDto(item.Id, "Degustação", "Levar os pais", "Anfitriao", "Recepcao", 90), atualizado);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaItem(modelo.Id, item.Id))).StatusCode);
        var detalhe = (await OrganizacaoA.Cliente.GetFromJsonAsync<ModeloChecklistDto>(RotaModelo(modelo.Id)))!;
        Assert.Empty(detalhe.Itens);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaItem(modelo.Id, item.Id)));
    }

    [Fact]
    public async Task Item_DeOutroModeloDaMesmaOrganizacao_DeveRetornar404()
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente, "Primeiro");
        var outro = await CriarModeloAsync(OrganizacaoA.Cliente, "Segundo");
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.PutAsJsonAsync(RotaItem(outro.Id, item.Id), CorpoItem()));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaItem(outro.Id, item.Id)));
    }

    [Fact]
    public async Task Criar_NomeRepetidoSemDiferenciarMaiusculas_DeveRetornar422()
    {
        await CriarModeloAsync(OrganizacaoA.Cliente, "Evento no campo");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaModelos, new { nome = "EVENTO NO CAMPO" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = await resposta.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(MensagensChecklist.NomeRepetido, problema!.Detail);
    }

    [Fact]
    public async Task Renomear_ComOProprioNome_DevePermitir()
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente, "Campo");

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "campo", descricao = "Nova" });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_AlemDoLimiteDaOrganizacao_DeveRetornar422()
    {
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.ModelosChecklist.AddRange(Enumerable.Range(1, ModeloChecklist.LimitePorOrganizacao)
                .Select(numero => ModeloChecklist.Criar($"Modelo {numero}", null, DateTimeOffset.UtcNow)));
            await contexto.SaveChangesAsync();
        }

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaModelos, new { nome = "Excedente" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = await resposta.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(MensagensChecklist.LimiteModelos, problema!.Detail);
    }

    [Theory]
    [InlineData("""{"titulo":"Buffet","diasAntesDoEvento":1096}""")]
    [InlineData("""{"titulo":"Buffet","diasAntesDoEvento":-366}""")]
    [InlineData("""{"titulo":"Buffet"}""")]
    [InlineData("""{"titulo":"B","diasAntesDoEvento":30}""")]
    [InlineData("""{"diasAntesDoEvento":30}""")]
    [InlineData("""{"titulo":"Buffet","diasAntesDoEvento":30,"responsavel":"Equipe"}""")]
    [InlineData("""{"titulo":"Buffet","diasAntesDoEvento":30,"categoria":"Viagem"}""")]
    [InlineData("""{"titulo":"Buffet","diasAntesDoEvento":"muitos"}""")]
    public async Task CriarItem_Invalido_DeveRetornar400ENaoGravar(string json)
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente);
        using var conteudo = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaItens(modelo.Id), conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.ItensModeloChecklist.AnyAsync());
    }

    [Theory]
    [InlineData("""{"nome":""}""")]
    [InlineData("""{"nome":"A"}""")]
    [InlineData("""{"descricao":"sem nome"}""")]
    public async Task CriarModelo_Invalido_DeveRetornar400(string json)
    {
        using var conteudo = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaModelos, conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task SemToken_DeveRetornar401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaModelos)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(RotaModelos, new { nome = "Modelo" })).StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_NaoDeveVerNemAlterarModelos()
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente, "Modelo da A");
        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);

        var listaB = await ListarModelosAsync(OrganizacaoB.Cliente);
        Assert.DoesNotContain(listaB, resumo => resumo.Id == modelo.Id);
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaModelo(modelo.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Invadido" }));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaModelo(modelo.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem()));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PutAsJsonAsync(RotaItem(modelo.Id, item.Id), CorpoItem("Invadido")));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.DeleteAsync(RotaItem(modelo.Id, item.Id)));

        var intacto = (await OrganizacaoA.Cliente.GetFromJsonAsync<ModeloChecklistDto>(RotaModelo(modelo.Id)))!;
        Assert.Equal("Modelo da A", intacto.Nome);
        Assert.Equal("Contratar buffet", Assert.Single(intacto.Itens).Titulo);
    }

    [Fact]
    public async Task OutraOrganizacao_PodeUsarOMesmoNome()
    {
        await CriarModeloAsync(OrganizacaoA.Cliente, "Evento no campo");

        var modeloB = await CriarModeloAsync(OrganizacaoB.Cliente, "Evento no campo");

        Assert.Equal("Evento no campo", modeloB.Nome);
    }

    [Fact]
    public async Task ExcluirModelo_DeveExcluirItensEmCascata()
    {
        var modelo = await CriarModeloAsync(OrganizacaoA.Cliente);
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id);
        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Outro", 30));

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaModelo(modelo.Id))).StatusCode);

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.ItensModeloChecklist.AnyAsync(item => item.ModeloId == modelo.Id));
    }
}
