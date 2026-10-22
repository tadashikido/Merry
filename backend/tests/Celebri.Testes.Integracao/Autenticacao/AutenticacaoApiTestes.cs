using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Infraestrutura.Persistencia;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Infraestrutura;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using static Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;

namespace Celebri.Testes.Integracao.Autenticacao;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class AutenticacaoApiTestes : IAsyncLifetime
{
    private readonly BancoPostgreSqlFixture _banco;
    private FabricaApiAutenticacao _fabrica = null!;
    private HttpClient _cliente = null!;

    public AutenticacaoApiTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    public Task InitializeAsync()
    {
        _fabrica = new FabricaApiAutenticacao(_banco.CriarStringConexaoBancoNovo());
        _cliente = _fabrica.CriarClienteHttps();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _cliente.Dispose();
        await _fabrica.DisposeAsync();
    }

    [Fact]
    public async Task Cadastro_DeveRetornar201ComSessaoCookieSeguroEClaimsDoJwt()
    {
        var email = EmailUnico();

        var resposta = await CadastrarAsync(_cliente, email);

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var cookie = LerCabecalhoCookie(resposta);
        Assert.NotNull(cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/autenticacao", cookie, StringComparison.OrdinalIgnoreCase);

        using var json = await LerJsonAsync(resposta);
        var raiz = json.RootElement;
        Assert.False(raiz.TryGetProperty("refreshToken", out _));
        Assert.Equal(email, raiz.GetProperty("usuario").GetProperty("email").GetString());
        Assert.Equal("Dono", raiz.GetProperty("usuario").GetProperty("papel").GetString());
        Assert.Equal("Assessoria Ana", raiz.GetProperty("usuario").GetProperty("organizacao").GetProperty("nome").GetString());

        var jwt = new JsonWebToken(raiz.GetProperty("tokenAcesso").GetString());
        Assert.Equal(raiz.GetProperty("usuario").GetProperty("id").GetString(), jwt.Subject);
        Assert.Equal(raiz.GetProperty("usuario").GetProperty("organizacao").GetProperty("id").GetString(), jwt.GetClaim(ClaimsAutenticacao.OrganizacaoId).Value);
        Assert.Equal("Dono", jwt.GetClaim(ClaimsAutenticacao.Papel).Value);
        Assert.Equal("HS256", jwt.Alg);
        Assert.InRange(jwt.ValidTo - jwt.IssuedAt, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(16));
    }

    [Fact]
    public async Task Cadastro_DevePersistirSenhaSomenteComoHashETokenComoSha256()
    {
        var email = EmailUnico();
        var resposta = await CadastrarAsync(_cliente, email);
        var refresh = LerRefreshToken(resposta);

        await using var escopo = _fabrica.Services.CreateAsyncScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();
        var usuario = await contexto.Usuarios.SingleAsync(item => item.Email == email);
        var tokens = await contexto.RefreshTokens.Where(item => item.UsuarioId == usuario.Id).ToListAsync();
        Assert.DoesNotContain(SenhaValida, usuario.SenhaHash);
        Assert.StartsWith("AQAAAA", usuario.SenhaHash);
        var token = Assert.Single(tokens);
        Assert.NotEqual(refresh, token.TokenHash);
        Assert.Equal(64, token.TokenHash.Length);
    }

    [Fact]
    public async Task Cadastro_EmailExistenteEmOutraCaixa_DeveRetornar409()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);

        var resposta = await CadastrarAsync(_cliente, email.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.Conflict, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);
        using var json = await LerJsonAsync(resposta);
        Assert.Equal(MensagensAutenticacao.EmailEmUso, json.RootElement.GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("curta1")]
    [InlineData("somenteletras")]
    public async Task Cadastro_SenhaFraca_DeveRetornar400ComErroNoCampoSenha(string senha)
    {
        var resposta = await CadastrarAsync(_cliente, EmailUnico(), senha);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.True(erros.TryGetProperty("Senha", out _) || erros.TryGetProperty("senha", out _));
    }

    [Fact]
    public async Task Entrar_CredenciaisCorretas_DeveRetornar200EPermitirConsultarEu()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);

        var resposta = await EntrarAsync(_cliente, email);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.NotNull(LerRefreshToken(resposta));
        var eu = await ObterEuAsync(_cliente, await LerTokenAcessoAsync(resposta));
        Assert.Equal(HttpStatusCode.OK, eu.StatusCode);
        using var json = await LerJsonAsync(eu);
        Assert.Equal("Ana Souza", json.RootElement.GetProperty("nome").GetString());
    }

    [Fact]
    public async Task Entrar_EmailInexistenteESenhaErrada_DevemRetornar401ComMesmaMensagem()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);

        var senhaErrada = await EntrarAsync(_cliente, email, "senhaErrada123");
        var inexistente = await EntrarAsync(_cliente, EmailUnico());

        Assert.Equal(HttpStatusCode.Unauthorized, senhaErrada.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, inexistente.StatusCode);
        using var jsonSenha = await LerJsonAsync(senhaErrada);
        using var jsonInexistente = await LerJsonAsync(inexistente);
        Assert.Equal(MensagensAutenticacao.CredenciaisInvalidas, jsonSenha.RootElement.GetProperty("title").GetString());
        Assert.Equal(jsonSenha.RootElement.GetProperty("title").GetString(), jsonInexistente.RootElement.GetProperty("title").GetString());
        Assert.Null(LerRefreshToken(senhaErrada));
    }

    [Fact]
    public async Task Entrar_AposCincoFalhas_DeveBloquearMesmoComSenhaCorreta()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);

        for (var tentativa = 0; tentativa < 5; tentativa++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await EntrarAsync(_cliente, email, "senhaErrada123")).StatusCode);
        }

        var resposta = await EntrarAsync(_cliente, email);

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Eu_SemTokenOuComTokenInvalido_DeveRetornar401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await ObterEuAsync(_cliente, null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ObterEuAsync(_cliente, "abc.def.ghi")).StatusCode);
    }

    [Fact]
    public async Task EndpointSemMarcacao_DeveExigirAutenticacaoPorPadraoEExporOrganizacaoDoUsuario()
    {
        var anonimo = await _cliente.GetAsync("/api/testes/protegido");
        Assert.Equal(HttpStatusCode.Unauthorized, anonimo.StatusCode);

        var cadastro = await CadastrarAsync(_cliente, EmailUnico());
        using var jsonCadastro = await LerJsonAsync(cadastro);
        var organizacaoId = jsonCadastro.RootElement.GetProperty("usuario").GetProperty("organizacao").GetProperty("id").GetString();
        using var requisicao = new HttpRequestMessage(HttpMethod.Get, "/api/testes/protegido");
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jsonCadastro.RootElement.GetProperty("tokenAcesso").GetString());

        var autenticado = await _cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.OK, autenticado.StatusCode);
        using var json = await LerJsonAsync(autenticado);
        Assert.Equal(organizacaoId, json.RootElement.GetProperty("organizacaoId").GetString());
        Assert.Equal("Dono", json.RootElement.GetProperty("papel").GetString());
    }

    [Fact]
    public async Task TokenAssinadoComOutraChave_DeveSerRecusado()
    {
        var falsificado = new JsonWebTokenHandler().CreateToken(new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Issuer = "casamento-api",
            Audience = "casamento-web",
            Expires = DateTime.UtcNow.AddMinutes(10),
            Claims = new Dictionary<string, object> { ["sub"] = Guid.NewGuid().ToString(), ["role"] = "Dono" },
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes("outra-chave-qualquer-com-mais-de-32-bytes")),
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256),
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await ObterEuAsync(_cliente, falsificado)).StatusCode);
    }

    [Fact]
    public async Task Renovar_DeveRotacionarEInvalidarOTokenAnterior()
    {
        var cadastro = await CadastrarAsync(_cliente, EmailUnico());
        var primeiro = LerRefreshToken(cadastro);

        var renovacao = await RenovarAsync(_cliente, primeiro);

        Assert.Equal(HttpStatusCode.OK, renovacao.StatusCode);
        var segundo = LerRefreshToken(renovacao);
        Assert.NotNull(segundo);
        Assert.NotEqual(primeiro, segundo);
        Assert.Equal(HttpStatusCode.OK, (await ObterEuAsync(_cliente, await LerTokenAcessoAsync(renovacao))).StatusCode);
    }

    [Fact]
    public async Task Renovar_ReusoDeTokenRotacionado_DeveRevogarAFamiliaELimparCookie()
    {
        var cadastro = await CadastrarAsync(_cliente, EmailUnico());
        var primeiro = LerRefreshToken(cadastro);
        var segundo = LerRefreshToken(await RenovarAsync(_cliente, primeiro));

        var reuso = await RenovarAsync(_cliente, primeiro);

        Assert.Equal(HttpStatusCode.Unauthorized, reuso.StatusCode);
        Assert.Contains("expires=Thu, 01 Jan 1970", LerCabecalhoCookie(reuso), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RenovarAsync(_cliente, segundo)).StatusCode);
    }

    [Fact]
    public async Task Renovar_SemCabecalhoDaAplicacao_DeveRetornar400()
    {
        var cadastro = await CadastrarAsync(_cliente, EmailUnico());

        var resposta = await RenovarAsync(_cliente, LerRefreshToken(cadastro), comCabecalho: false);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Renovar_SemCookie_DeveRetornar401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await RenovarAsync(_cliente, null)).StatusCode);
    }

    [Fact]
    public async Task Sair_DeveRevogarORefreshTokenERemoverCookie()
    {
        var cadastro = await CadastrarAsync(_cliente, EmailUnico());
        var refresh = LerRefreshToken(cadastro);

        var saida = await SairAsync(_cliente, refresh);

        Assert.Equal(HttpStatusCode.NoContent, saida.StatusCode);
        Assert.Contains("expires=Thu, 01 Jan 1970", LerCabecalhoCookie(saida), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RenovarAsync(_cliente, refresh)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await SairAsync(_cliente, null)).StatusCode);
    }

    [Fact]
    public async Task EsqueciSenha_DeveResponder202GenericoEEnviarEmailSomenteParaContaExistente()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);

        var existente = await _cliente.PostAsJsonAsync("/api/autenticacao/esqueci-senha", new { email });
        var inexistente = await _cliente.PostAsJsonAsync("/api/autenticacao/esqueci-senha", new { email = EmailUnico() });

        Assert.Equal(HttpStatusCode.Accepted, existente.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, inexistente.StatusCode);
        Assert.Equal(await existente.Content.ReadAsStringAsync(), await inexistente.Content.ReadAsStringAsync());
        var mensagem = Assert.Single(_fabrica.Email.Enviadas);
        Assert.Equal(email, mensagem.Destinatario);
        Assert.Contains($"{FabricaApi.UrlFrontendTeste}/redefinir-senha#token=", mensagem.CorpoTexto);
    }

    [Fact]
    public async Task RedefinirSenha_FluxoCompleto_DeveTrocarSenhaRevogarSessoesEImpedirReuso()
    {
        var email = EmailUnico();
        var cadastro = await CadastrarAsync(_cliente, email);
        var refresh = LerRefreshToken(cadastro);
        await _cliente.PostAsJsonAsync("/api/autenticacao/esqueci-senha", new { email });
        var token = ExtrairToken(_fabrica.Email.Enviadas.Single().CorpoTexto);

        var redefinicao = await _cliente.PostAsJsonAsync("/api/autenticacao/redefinir-senha", new { token, novaSenha = "novaSenha456" });

        Assert.Equal(HttpStatusCode.NoContent, redefinicao.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RenovarAsync(_cliente, refresh)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await EntrarAsync(_cliente, email)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await EntrarAsync(_cliente, email, "novaSenha456")).StatusCode);

        var reuso = await _cliente.PostAsJsonAsync("/api/autenticacao/redefinir-senha", new { token, novaSenha = "outraSenha789" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, reuso.StatusCode);
        using var json = await LerJsonAsync(reuso);
        Assert.Equal(MensagensAutenticacao.LinkRedefinicaoInvalido, json.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task RedefinirSenha_TokenExpirado_DeveRetornar422()
    {
        var email = EmailUnico();
        await CadastrarAsync(_cliente, email);
        await _cliente.PostAsJsonAsync("/api/autenticacao/esqueci-senha", new { email });
        var token = ExtrairToken(_fabrica.Email.Enviadas.Single().CorpoTexto);
        await using (var escopo = _fabrica.Services.CreateAsyncScope())
        {
            var contexto = escopo.ServiceProvider.GetRequiredService<CelebriDbContext>();
            await contexto.Database.ExecuteSqlRawAsync("UPDATE tokens_redefinicao_senha SET expira_em = now() - interval '1 minute'");
        }

        var resposta = await _cliente.PostAsJsonAsync("/api/autenticacao/redefinir-senha", new { token, novaSenha = "novaSenha456" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
    }

    [Fact]
    public async Task RedefinirSenha_SenhaFraca_DeveRetornar400()
    {
        var resposta = await _cliente.PostAsJsonAsync("/api/autenticacao/redefinir-senha", new { token = "qualquer", novaSenha = "fraca" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    private static string ExtrairToken(string corpo)
    {
        const string marcador = "#token=";
        var inicio = corpo.IndexOf(marcador, StringComparison.Ordinal) + marcador.Length;
        return Uri.UnescapeDataString(corpo[inicio..].Split('\n')[0].Trim());
    }
}
