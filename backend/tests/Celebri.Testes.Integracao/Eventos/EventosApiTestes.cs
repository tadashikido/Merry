using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Eventos;
using Celebri.Infraestrutura.Seguranca;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using static Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Eventos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class EventosApiTestes : IsolamentoOrganizacaoTestesBase
{
    public EventosApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static string Iso(DateOnly data)
    {
        return data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    [Fact]
    public async Task Criar_DadosValidos_DeveRetornar201ComLocationEDadosNormalizados()
    {
        var hoje = HojeEmSaoPaulo();
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            Rota,
            CorpoValido(nomePrimeiraPessoa: "  Ana Beatriz ", data: Iso(hoje.AddDays(30)), localRecepcao: "   "));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var evento = (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;
        Assert.Equal($"/api/eventos/{evento.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("Ana Beatriz", evento.NomePrimeiraPessoa);
        Assert.Equal(hoje.AddDays(30), evento.Data);
        Assert.Equal("16:30", evento.Horario);
        Assert.Null(evento.LocalRecepcao);
        Assert.Equal("RetaFinal", evento.Fase);
        Assert.Equal(30, evento.DiasRestantes);
        Assert.False(evento.Arquivado);
    }

    [Fact]
    public async Task Criar_DataDeveTrafegarEPersistirSemDeslocamentoDeDia()
    {
        var evento = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(data: "2027-05-15", horario: "23:30"));

        var resposta = await OrganizacaoA.Cliente.GetAsync($"{Rota}/{evento.Id}");
        var json = await resposta.Content.ReadAsStringAsync();
        Assert.Contains("\"data\":\"2027-05-15\"", json, StringComparison.Ordinal);
        Assert.Contains("\"horario\":\"23:30\"", json, StringComparison.Ordinal);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Eventos.SingleAsync(item => item.Id == evento.Id);
        Assert.Equal(new DateOnly(2027, 5, 15), gravado.Data);
        Assert.Equal(new TimeOnly(23, 30), gravado.Horario);
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravado.OrganizacaoId);
    }

    [Fact]
    public async Task Criar_ComOrganizacaoIdNoCorpo_DeveGravarNaOrganizacaoDoToken()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, new
        {
            tipo = "Casamento",
            nomePrimeiraPessoa = "Ana",
            nomeSegundaPessoa = "Bruno",
            data = "2027-05-15",
            organizacaoId = OrganizacaoB.OrganizacaoId,
        });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", corpo, StringComparison.OrdinalIgnoreCase);
        var evento = (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.Eventos.SingleAsync(item => item.Id == evento.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravado.OrganizacaoId);
        Assert.Empty(await ListarAsync(OrganizacaoB.Cliente));
    }

    [Fact]
    public async Task Criar_SemNomesESemData_DeveRetornar400ComErroPorCampo()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, new { nomePrimeiraPessoa = "", nomeSegundaPessoa = "  " });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.Equal(MensagensValidacao.Obrigatorio, erros.GetProperty("NomePrimeiraPessoa")[0].GetString());
        Assert.Equal(MensagensEvento.TipoObrigatorio, erros.GetProperty("Tipo")[0].GetString());
        Assert.Equal(MensagensValidacao.Obrigatorio, erros.GetProperty("Data")[0].GetString());
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
    }

    [Fact]
    public async Task Criar_ValoresForaDosLimites_DeveRetornar400ComMensagensDeLimite()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(
            nomePrimeiraPessoa: new string('a', 81),
            data: "1999-12-31",
            horario: "25:00",
            localCerimonia: new string('x', 201),
            convidadosEstimados: 5001,
            observacoes: new string('x', 2001)));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.Equal(MensagensEvento.TamanhoNome, erros.GetProperty("NomePrimeiraPessoa")[0].GetString());
        Assert.Equal(MensagensEvento.HorarioInvalido, erros.GetProperty("Horario")[0].GetString());
        Assert.Equal(MensagensEvento.TamanhoLocal, erros.GetProperty("LocalCerimonia")[0].GetString());
        Assert.Equal(MensagensEvento.ConvidadosForaDaFaixa, erros.GetProperty("ConvidadosEstimados")[0].GetString());
        Assert.Equal(MensagensEvento.TamanhoObservacoes, erros.GetProperty("Observacoes")[0].GetString());
    }

    [Fact]
    public async Task Criar_DataForaDaFaixaComDemaisCamposValidos_DeveRetornar400NoCampoData()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(data: "2101-01-01"));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(MensagensEvento.DataForaDaFaixa, json.RootElement.GetProperty("errors").GetProperty("Data")[0].GetString());
    }

    [Fact]
    public async Task Criar_DataEmFormatoInvalido_DeveRetornar400()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(data: "15/05/2027"));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Listar_DeveOrdenarPorProximosDepoisRealizadosComFasesCalculadas()
    {
        var hoje = HojeEmSaoPaulo();
        var dias = new[] { 120, -3, 30, 0, 5 };
        foreach (var deslocamento in dias)
        {
            await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomeSegundaPessoa: $"Pessoa {deslocamento}", data: Iso(hoje.AddDays(deslocamento))));
        }

        var lista = await ListarAsync(OrganizacaoA.Cliente);

        Assert.Equal([0, 5, 30, 120, -3], lista.Select(item => item.DiasRestantes));
        Assert.Equal(["DiaDoEvento", "SemanaDoEvento", "RetaFinal", "Planejamento", "Realizado"], lista.Select(item => item.Fase));
    }

    [Fact]
    public async Task Listar_SituacaoInvalida_DeveRetornar400()
    {
        var resposta = await OrganizacaoA.Cliente.GetAsync($"{Rota}?situacao=Todos");

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Atualizar_DeveAlterarDadosERecalcularFase()
    {
        var hoje = HojeEmSaoPaulo();
        var criado = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(data: Iso(hoje.AddDays(200))));

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomeSegundaPessoa: "Bruna", data: Iso(hoje.AddDays(3)), horario: null, convidadosEstimados: null));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;
        Assert.Equal("Bruna", atualizado.NomeSegundaPessoa);
        Assert.Null(atualizado.Horario);
        Assert.Null(atualizado.ConvidadosEstimados);
        Assert.Equal("SemanaDoEvento", atualizado.Fase);
        Assert.True(atualizado.AtualizadoEm >= criado.AtualizadoEm);
    }

    [Fact]
    public async Task ArquivarERestaurar_DeveMoverEntreListagens()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var arquivar = await OrganizacaoA.Cliente.PostAsync($"{Rota}/{criado.Id}/arquivar", null);
        Assert.Equal(HttpStatusCode.OK, arquivar.StatusCode);
        Assert.True((await arquivar.Content.ReadFromJsonAsync<EventoDto>())!.Arquivado);
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
        Assert.Equal([criado.Id], (await ListarAsync(OrganizacaoA.Cliente, "Arquivados")).Select(item => item.Id));

        var arquivarDeNovo = await OrganizacaoA.Cliente.PostAsync($"{Rota}/{criado.Id}/arquivar", null);
        Assert.Equal(HttpStatusCode.OK, arquivarDeNovo.StatusCode);

        var restaurar = await OrganizacaoA.Cliente.PostAsync($"{Rota}/{criado.Id}/restaurar", null);
        Assert.Equal(HttpStatusCode.OK, restaurar.StatusCode);
        var restaurado = (await restaurar.Content.ReadFromJsonAsync<EventoDto>())!;
        Assert.False(restaurado.Arquivado);
        Assert.Equal(criado.NomePrimeiraPessoa, restaurado.NomePrimeiraPessoa);
        Assert.Equal(criado.Observacoes, restaurado.Observacoes);
        Assert.Equal([criado.Id], (await ListarAsync(OrganizacaoA.Cliente)).Select(item => item.Id));
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente, "Arquivados"));
    }

    [Fact]
    public async Task Atualizar_EventoArquivado_DeveRetornar422SemAlterar()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        await OrganizacaoA.Cliente.PostAsync($"{Rota}/{criado.Id}/arquivar", null);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync($"{Rota}/{criado.Id}", CorpoValido(nomeSegundaPessoa: "Outra"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(ExcecaoGlobalHandler.TituloRegraNegocio, json.RootElement.GetProperty("title").GetString());
        Assert.Equal(MensagensEvento.ArquivadoSemEdicao, json.RootElement.GetProperty("detail").GetString());

        var atual = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{Rota}/{criado.Id}");
        Assert.Equal("Bruno", atual!.NomeSegundaPessoa);
    }

    [Fact]
    public async Task Obter_Inexistente_DeveRetornar404()
    {
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync($"{Rota}/{Guid.NewGuid()}"));
    }

    [Theory]
    [InlineData("GET", "")]
    [InlineData("POST", "")]
    [InlineData("GET", "/{id}")]
    [InlineData("PUT", "/{id}")]
    [InlineData("POST", "/{id}/arquivar")]
    [InlineData("POST", "/{id}/restaurar")]
    public async Task SemToken_DeveRetornar401(string metodo, string sufixo)
    {
        using var requisicao = new HttpRequestMessage(new HttpMethod(metodo), Rota + sufixo.Replace("{id}", Guid.NewGuid().ToString(), StringComparison.Ordinal))
        {
            Content = metodo is "POST" or "PUT" ? JsonContent.Create(CorpoValido()) : null,
        };

        var resposta = await ClienteAnonimo.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Theory]
    [InlineData("GET", "")]
    [InlineData("POST", "")]
    [InlineData("GET", "/{id}")]
    [InlineData("PUT", "/{id}")]
    [InlineData("POST", "/{id}/arquivar")]
    [InlineData("POST", "/{id}/restaurar")]
    public async Task TokenAnfitriaoSemVinculoValido_DeveRetornar401SemAlterarDados(string metodo, string sufixo)
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        using var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GerarTokenComPapel(OrganizacaoA, "Anfitriao"));
        using var requisicao = new HttpRequestMessage(new HttpMethod(metodo), Rota + sufixo.Replace("{id}", criado.Id.ToString(), StringComparison.Ordinal))
        {
            Content = metodo is "POST" or "PUT" ? JsonContent.Create(CorpoValido(nomeSegundaPessoa: "Invasor")) : null,
        };

        var resposta = await cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
        var lista = await ListarAsync(OrganizacaoA.Cliente);
        var unico = Assert.Single(lista);
        Assert.Equal("Bruno", unico.NomeSegundaPessoa);
        Assert.False(unico.Arquivado);
    }

    [Theory]
    [InlineData("Casal")]
    [InlineData("Administrador")]
    public async Task TokenComPapelDesconhecido_DeveRetornar401ParaForcarARenovacaoDaSessao(string papel)
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);
        using var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GerarTokenComPapel(OrganizacaoA, papel));

        var resposta = await cliente.GetAsync($"{Rota}/{criado.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    private string GerarTokenComPapel(OrganizacaoTeste organizacao, string papel)
    {
        var opcoes = Fabrica.Services.GetRequiredService<IOptions<OpcoesJwt>>().Value;
        var agora = DateTime.UtcNow;
        var descritor = new SecurityTokenDescriptor
        {
            Issuer = opcoes.Emissor,
            Audience = opcoes.Audiencia,
            IssuedAt = agora,
            NotBefore = agora,
            Expires = agora.AddMinutes(5),
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimsAutenticacao.UsuarioId, organizacao.UsuarioId.ToString()),
                new Claim(ClaimsAutenticacao.OrganizacaoId, organizacao.OrganizacaoId.ToString()),
                new Claim(ClaimsAutenticacao.Papel, papel),
                new Claim(ClaimsAutenticacao.Nome, "Anfitriões Teste"),
                new Claim(ClaimsAutenticacao.IdentificadorToken, Guid.NewGuid().ToString()),
            ]),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(opcoes.ObterBytesChave()), SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descritor);
    }
}
