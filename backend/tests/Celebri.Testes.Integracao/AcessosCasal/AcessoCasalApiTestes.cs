using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Casamento.Aplicacao.AcessosCasal;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Casamentos;
using Casamento.Aplicacao.Confirmacoes;
using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Usuarios;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteAutenticacao = Casamento.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;
using ClienteConvites = Casamento.Testes.Integracao.Convidados.ClienteConvites;
using ClienteRsvp = Casamento.Testes.Integracao.Rsvp.ClienteRsvp;

namespace Casamento.Testes.Integracao.AcessosCasal;

public sealed record CasalTeste(Guid CasamentoId, Guid AcessoId, Guid UsuarioId, string Email, string TokenAcesso, HttpClient Cliente);

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class AcessoCasalApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesCasal = [];

    public AcessoCasalApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesCasal)
        {
            cliente.Dispose();
        }
    }

    private HttpClient ClienteComToken(string tokenAcesso)
    {
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenAcesso);
        _clientesCasal.Add(cliente);
        return cliente;
    }

    private async Task<CasalTeste> CriarCasalAsync(OrganizacaoTeste organizacao, Guid? casamentoId = null)
    {
        var idCasamento = casamentoId ?? (await ClienteCasamentos.CriarAsync(organizacao.Cliente)).Id;
        var email = EmailCasalUnico();
        var acesso = await ConvidarComSucessoAsync(organizacao.Cliente, idCasamento, email);

        var resposta = await AceitarAsync(ClienteAnonimo, UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var sessao = (await resposta.Content.ReadFromJsonAsync<SessaoDto>())!;

        return new CasalTeste(idCasamento, acesso.Id, sessao.Usuario.Id, email, sessao.TokenAcesso, ClienteComToken(sessao.TokenAcesso));
    }

    [Fact]
    public async Task ConviteEAceite_DeveEnviarEmailSemExporTokenECriarSessaoDoCasal()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailCasalUnico();

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, email, "  Lívia Moraes ");

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        var token = UltimoToken(Fabrica.Email, email);
        Assert.DoesNotContain(token, corpo, StringComparison.Ordinal);
        var acesso = (await resposta.Content.ReadFromJsonAsync<AcessoCasalDto>())!;
        Assert.Equal("Pendente", acesso.Situacao);
        Assert.Equal("Lívia Moraes", acesso.Nome);

        var consulta = await ConsultarAsync(ClienteAnonimo, token);
        Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        var convite = (await consulta.Content.ReadFromJsonAsync<ConviteAcessoCasalDto>())!;
        Assert.Equal(email, convite.Email);
        Assert.Equal(casamento.NomePrimeiraPessoa, convite.NomePrimeiraPessoa);

        var aceite = await AceitarAsync(ClienteAnonimo, token);
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        Assert.NotNull(ClienteAutenticacao.LerRefreshToken(aceite));
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        Assert.Equal(nameof(PapelUsuario.Casal), sessao.Usuario.Papel);
        Assert.Equal(casamento.Id, sessao.Usuario.CasamentoId);
        Assert.Equal(OrganizacaoA.OrganizacaoId, sessao.Usuario.Organizacao.Id);

        var lista = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoCasalDto>>(Rota(casamento.Id));
        Assert.Equal("Ativo", Assert.Single(lista!).Situacao);

        await AssertConviteInvalidoAsync(await AceitarAsync(ClienteAnonimo, token));

        var login = await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, email, SenhaCasal);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Casal_DeveVerOProprioCasamentoSemObservacoesInternas()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);

        var casamento = await casal.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casal.CasamentoId}");

        Assert.Equal(casal.CasamentoId, casamento!.Id);
        Assert.Null(casamento.Observacoes);
        var doDono = await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casal.CasamentoId}");
        Assert.Equal("Flores brancas", doDono!.Observacoes);
    }

    [Fact]
    public async Task Casal_NaoDeveAcessarOutroCasamentoDaMesmaOrganizacao()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: "Outra Noiva"));
        var conviteOutro = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, outro.Id);

        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync($"{ClienteCasamentos.Rota}/{outro.Id}"));
        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync(ClienteConvites.Rota(outro.Id)));
        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync(ClienteConvites.Rota(outro.Id, conviteOutro.Id)));
        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync($"{ClienteCasamentos.Rota}/{outro.Id}/painel-confirmacoes"));
        await AssertNaoEncontradoAsync(await casal.Cliente.PostAsJsonAsync(ClienteConvites.Rota(outro.Id), ClienteConvites.CorpoValido()));
        await AssertNaoEncontradoAsync(await casal.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(outro.Id, conviteOutro.Id),
            ClienteConvites.CorpoValido(nome: "Invasão")));
        await AssertNaoEncontradoAsync(await casal.Cliente.DeleteAsync(ClienteConvites.Rota(outro.Id, conviteOutro.Id)));
        await AssertNaoEncontradoAsync(await casal.Cliente.PostAsync(ClienteRsvp.RotaLink(outro.Id, conviteOutro.Id), null));

        var intacto = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(outro.Id, conviteOutro.Id));
        Assert.Equal(conviteOutro.Nome, intacto!.Nome);
        Assert.Equal(conviteOutro.Convidados.Count, intacto.Convidados.Count);
    }

    [Fact]
    public async Task Casal_NaoDeveAcessarCasamentoDeOutraOrganizacao()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync($"{ClienteCasamentos.Rota}/{deB.Id}"));
        await AssertNaoEncontradoAsync(await casal.Cliente.GetAsync(ClienteConvites.Rota(deB.Id)));
    }

    [Theory]
    [InlineData("GET", "/api/casamentos")]
    [InlineData("POST", "/api/casamentos")]
    [InlineData("PUT", "/api/casamentos/{c}")]
    [InlineData("POST", "/api/casamentos/{c}/arquivar")]
    [InlineData("POST", "/api/casamentos/{c}/restaurar")]
    [InlineData("GET", "/api/casamentos/{c}/proximos-passos")]
    [InlineData("GET", "/api/casamentos/{c}/acessos-casal")]
    [InlineData("POST", "/api/casamentos/{c}/acessos-casal")]
    [InlineData("POST", "/api/casamentos/{c}/acessos-casal/{a}/reenvio")]
    [InlineData("DELETE", "/api/casamentos/{c}/acessos-casal/{a}")]
    [InlineData("GET", "/api/casamentos/{c}/restricoes-alimentares")]
    [InlineData("GET", "/api/casamentos/{c}/exportacao-buffet")]
    [InlineData("PUT", "/api/casamentos/{c}/convites/{cv}/convidados/{p}/restricao-alimentar")]
    [InlineData("DELETE", "/api/casamentos/{c}/convites/{cv}/convidados/{p}/restricao-alimentar")]
    public async Task Casal_EmEndpointsDaAssessoria_DeveReceber403(string metodo, string rota)
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casal.CasamentoId);
        var caminho = rota
            .Replace("{c}", casal.CasamentoId.ToString(), StringComparison.Ordinal)
            .Replace("{a}", casal.AcessoId.ToString(), StringComparison.Ordinal)
            .Replace("{cv}", convite.Id.ToString(), StringComparison.Ordinal)
            .Replace("{p}", convite.Convidados[0].Id.ToString(), StringComparison.Ordinal);
        using var requisicao = new HttpRequestMessage(new HttpMethod(metodo), caminho)
        {
            Content = metodo is "POST" or "PUT" ? JsonContent.Create(ClienteCasamentos.CorpoValido(nomeSegundaPessoa: "Invasor")) : null,
        };

        var resposta = await casal.Cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        var casamento = await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casal.CasamentoId}");
        Assert.Equal("Bruno", casamento!.NomeSegundaPessoa);
        Assert.False(casamento.Arquivado);
        var acessos = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoCasalDto>>(Rota(casal.CasamentoId));
        Assert.Equal("Ativo", Assert.Single(acessos!).Situacao);
    }

    [Fact]
    public async Task Casal_DeveGerenciarConvitesDoProprioCasamentoERegistrarATrilha()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);

        var criado = await ClienteConvites.CriarAsync(casal.Cliente, casal.CasamentoId);
        var atualizacao = await casal.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(casal.CasamentoId, criado.Id),
            ClienteConvites.CorpoValido(nome: "Família Moraes"));
        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);

        var lista = await ClienteConvites.ListarAsync(casal.Cliente, casal.CasamentoId);
        Assert.All(lista.Convites.SelectMany(convite => convite.Convidados), convidado => Assert.Null(convidado.PossuiRestricao));
        var listaDono = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, casal.CasamentoId);
        Assert.All(listaDono.Convites.SelectMany(convite => convite.Convidados), convidado => Assert.False(convidado.PossuiRestricao));

        var link = await ClienteRsvp.GerarLinkAsync(casal.Cliente, casal.CasamentoId, criado.Id);
        Assert.False(string.IsNullOrWhiteSpace(link.Token));
        var envio = await casal.Cliente.PostAsync(ClienteRsvp.RotaEnvio(casal.CasamentoId, criado.Id), null);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var enviado = (await envio.Content.ReadFromJsonAsync<ConviteDto>())!;
        Assert.Equal("Enviado", enviado.StatusEnvio);
        Assert.All(enviado.Convidados, convidado => Assert.Null(convidado.PossuiRestricao));

        using var formulario = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(Encoding.UTF8.GetBytes("Convite;Nome;Telefone\nFamília Lima;Ana Lima;(11) 98765-4321\n"));
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        formulario.Add(arquivo, "arquivo", "lista.csv");
        var previa = await casal.Cliente.PostAsync($"{ClienteConvites.Rota(casal.CasamentoId)}/importacao/pre-visualizacao", formulario);
        Assert.Equal(HttpStatusCode.OK, previa.StatusCode);

        var painel = await casal.Cliente.GetFromJsonAsync<PainelConfirmacoesDto>($"{ClienteCasamentos.Rota}/{casal.CasamentoId}/painel-confirmacoes");
        Assert.Equal(1, painel!.Convites.Total);
        Assert.Equal(0, painel.PessoasComRestricaoAlimentar);

        var remocao = await casal.Cliente.DeleteAsync(ClienteConvites.Rota(casal.CasamentoId, criado.Id));
        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);

        await using var contexto = CriarContexto(OrganizacaoA);
        var trilha = await contexto.RegistrosAlteracaoConvites
            .AsNoTracking()
            .Where(registro => registro.ConviteId == criado.Id)
            .OrderBy(registro => registro.OcorridoEm)
            .ToListAsync();

        Assert.Contains(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Criacao);
        Assert.Contains(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Alteracao);
        Assert.Contains(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Remocao);
        Assert.All(trilha, registro =>
        {
            Assert.Equal(casal.UsuarioId, registro.UsuarioId);
            Assert.Equal(nameof(PapelUsuario.Casal), registro.PapelUsuario);
            Assert.Equal(casal.CasamentoId, registro.CasamentoId);
            Assert.Equal(OrganizacaoA.OrganizacaoId, registro.OrganizacaoId);
        });
    }

    [Fact]
    public async Task Trilha_DeveRegistrarADonaEOConvidadoAnonimo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, casamento.Id, convite.Id);

        await ClienteRsvp.ConsultarComSucessoAsync(ClienteAnonimo, link.Token);

        await using var contexto = CriarContexto(OrganizacaoA);
        var trilha = await contexto.RegistrosAlteracaoConvites.AsNoTracking().Where(registro => registro.ConviteId == convite.Id).ToListAsync();
        var criacao = Assert.Single(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Criacao);
        Assert.Equal(OrganizacaoA.UsuarioId, criacao.UsuarioId);
        Assert.Equal(nameof(PapelUsuario.Dono), criacao.PapelUsuario);
        Assert.Contains(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Alteracao && registro.UsuarioId == null && registro.PapelUsuario == null);
    }

    [Fact]
    public async Task Casal_AbrindoLinkRsvpDoProprioCasamento_NaoDeveMarcarVisualizado()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, casal.CasamentoId);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, casal.CasamentoId, convite.Id);

        var rsvp = await ClienteRsvp.ConsultarComSucessoAsync(casal.Cliente, link.Token);

        Assert.True(rsvp.PreVisualizacao);
        var depois = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(casal.CasamentoId, convite.Id));
        Assert.NotEqual("Visualizado", depois!.StatusEnvio);
    }

    [Fact]
    public async Task Casal_AbrindoLinkRsvpDeOutroCasamento_DeveSerTratadoComoConvidado()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, outro.Id);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, outro.Id, convite.Id);

        var rsvp = await ClienteRsvp.ConsultarComSucessoAsync(casal.Cliente, link.Token);

        Assert.False(rsvp.PreVisualizacao);
        var depois = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(outro.Id, convite.Id));
        Assert.Equal("Visualizado", depois!.StatusEnvio);
    }

    [Fact]
    public async Task Revogar_AcessoAtivo_DeveCortarTokenVigenteELogin()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        Assert.Equal(HttpStatusCode.OK, (await casal.Cliente.GetAsync($"{ClienteCasamentos.Rota}/{casal.CasamentoId}")).StatusCode);

        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(Rota(casal.CasamentoId, casal.AcessoId));

        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await casal.Cliente.GetAsync($"{ClienteCasamentos.Rota}/{casal.CasamentoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, casal.Email, SenhaCasal)).StatusCode);
        var acessos = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoCasalDto>>(Rota(casal.CasamentoId));
        Assert.Empty(acessos!);
    }

    [Fact]
    public async Task ConviteRevogadoDoMesmoEmail_DeveReativarOUsuarioNoNovoAceite()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.DeleteAsync(Rota(casal.CasamentoId, casal.AcessoId));

        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casal.CasamentoId, casal.Email);
        var aceite = await AceitarAsync(ClienteAnonimo, UltimoToken(Fabrica.Email, casal.Email), "novaSenhaCasal9");

        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        Assert.Equal(casal.UsuarioId, sessao.Usuario.Id);
        Assert.Equal(HttpStatusCode.OK, (await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, casal.Email, "novaSenhaCasal9")).StatusCode);
    }

    [Fact]
    public async Task RevogarConvitePendente_DeveInvalidarOLink()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailCasalUnico();
        var acesso = await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, email);
        var token = UltimoToken(Fabrica.Email, email);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(Rota(casamento.Id, acesso.Id))).StatusCode);

        await AssertConviteInvalidoAsync(await ConsultarAsync(ClienteAnonimo, token));
        await AssertConviteInvalidoAsync(await AceitarAsync(ClienteAnonimo, token));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(Rota(casamento.Id, acesso.Id)));
    }

    [Fact]
    public async Task Reenviar_DeveInvalidarLinkAnteriorEEnviarNovoEmail()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailCasalUnico();
        var acesso = await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, email);
        var tokenAnterior = UltimoToken(Fabrica.Email, email);

        var reenvio = await OrganizacaoA.Cliente.PostAsync($"{Rota(casamento.Id, acesso.Id)}/reenvio", null);

        Assert.Equal(HttpStatusCode.OK, reenvio.StatusCode);
        Assert.Equal(2, QuantidadeEmails(Fabrica.Email, email));
        var tokenNovo = UltimoToken(Fabrica.Email, email);
        Assert.NotEqual(tokenAnterior, tokenNovo);
        await AssertConviteInvalidoAsync(await ConsultarAsync(ClienteAnonimo, tokenAnterior));
        Assert.Equal(HttpStatusCode.OK, (await ConsultarAsync(ClienteAnonimo, tokenNovo)).StatusCode);
    }

    [Fact]
    public async Task Reenviar_AcessoAtivo_DeveRetornar409()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);

        var reenvio = await OrganizacaoA.Cliente.PostAsync($"{Rota(casal.CasamentoId, casal.AcessoId)}/reenvio", null);

        Assert.Equal(HttpStatusCode.Conflict, reenvio.StatusCode);
    }

    [Fact]
    public async Task Convidar_TerceiraPessoa_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, EmailCasalUnico());
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, EmailCasalUnico(), "Rafael Souza");

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, EmailCasalUnico(), "Terceira Pessoa");

        await AssertRegraAsync(resposta, MensagensAcessoCasal.LimiteAtingido);
    }

    [Fact]
    public async Task Convidar_EmailDeContaDaAssessoriaOuDeOutraOrganizacao_DeveRetornar422SemEnviarEmail()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, OrganizacaoA.Email), MensagensAcessoCasal.EmailEmUso);
        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, OrganizacaoB.Email.ToUpperInvariant()), MensagensAcessoCasal.EmailEmUso);
        Assert.Equal(0, QuantidadeEmails(Fabrica.Email, OrganizacaoA.Email));
    }

    [Fact]
    public async Task Convidar_EmailJaConvidadoNoMesmoOuEmOutroCasamento_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailCasalUnico();
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, email);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, email), MensagensAcessoCasal.EmailJaConvidado);
        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, outro.Id, email), MensagensAcessoCasal.EmailEmUso);
    }

    [Fact]
    public async Task Convidar_CasalDeOutroCasamento_DeveRetornar422()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, outro.Id, casal.Email), MensagensAcessoCasal.EmailEmUso);
    }

    [Fact]
    public async Task Convidar_DadosInvalidos_DeveRetornar400()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, "nao-e-email", "A");

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await ClienteAutenticacao.LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.True(erros.TryGetProperty("Email", out _));
        Assert.True(erros.TryGetProperty("Nome", out _));
    }

    [Fact]
    public async Task Convidar_CasamentoArquivado_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamento.Id}/arquivar", null);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, casamento.Id, EmailCasalUnico()), MensagensAcessoCasal.CasamentoArquivado);
    }

    [Fact]
    public async Task Convidar_CasamentoDeOutraOrganizacao_DeveRetornar404()
    {
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await ConvidarAsync(OrganizacaoA.Cliente, deB.Id, EmailCasalUnico()));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(Rota(deB.Id)));
    }

    [Theory]
    [InlineData("curto")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa*")]
    public async Task ConsultaEAceite_TokenInvalido_DeveRetornar422Uniforme(string token)
    {
        await AssertConviteInvalidoAsync(await ConsultarAsync(ClienteAnonimo, token));
        await AssertConviteInvalidoAsync(await AceitarAsync(ClienteAnonimo, token));
    }

    [Fact]
    public async Task Aceite_SenhaFracaOuIgualAoEmail_DeveRecusarSemCriarUsuario()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailCasalUnico();
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, email);
        var token = UltimoToken(Fabrica.Email, email);

        Assert.Equal(HttpStatusCode.BadRequest, (await AceitarAsync(ClienteAnonimo, token, "curta1")).StatusCode);
        await AssertRegraAsync(await AceitarAsync(ClienteAnonimo, token, email), PoliticaSenha.MensagemSenhaIgualEmail);

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.Usuarios.AnyAsync(usuario => usuario.Email == email));
        Assert.Equal(HttpStatusCode.OK, (await ConsultarAsync(ClienteAnonimo, token)).StatusCode);
    }

    [Fact]
    public async Task UsuarioInativo_DeveSerGravadoInativo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var usuario = Usuario.CriarCasal(OrganizacaoA.OrganizacaoId, casamento.Id, "Pessoa Inativa", EmailCasalUnico(), "hash-qualquer", DateTimeOffset.UtcNow);
        usuario.Desativar();

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Usuarios.Add(usuario);
            await contexto.SaveChangesAsync();
        }

        await using var leitura = CriarContexto(OrganizacaoA);
        var gravado = await leitura.Usuarios.AsNoTracking().SingleAsync(item => item.Id == usuario.Id);
        Assert.False(gravado.Ativo);
        Assert.Equal(casamento.Id, gravado.CasamentoId);
    }

    [Fact]
    public async Task UsuarioCasalSemCasamento_DeveSerRecusadoPeloBanco()
    {
        await using var contexto = CriarContexto(OrganizacaoA);

        await Assert.ThrowsAsync<Npgsql.PostgresException>(() => contexto.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE usuarios SET papel = 'Casal' WHERE id = {OrganizacaoA.UsuarioId}"));
    }

    [Fact]
    public async Task ContextoDoCasal_NaoDeveGravarEmOutroCasamento()
    {
        var casal = await CriarCasalAsync(OrganizacaoA);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var convite = Convite.Criar(
            outro.Id,
            new DadosConvite("Família Invasora", null, 0, [new DadosConvidado(null, "Pessoa Invasora", null, null, FaixaEtaria.Adulto, RespostaRsvp.Pendente)]),
            DateTimeOffset.UtcNow);

        await using var contexto = new Casamento.Infraestrutura.Persistencia.CasamentoDbContext(
            Fabrica.CriarOpcoesDbContext(),
            new ContextoIsolamentoFixo(OrganizacaoA.OrganizacaoId, [casal.CasamentoId]));
        contexto.Convites.Add(convite);

        await Assert.ThrowsAsync<Casamento.Aplicacao.Excecoes.ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
        Assert.Empty(await contexto.Casamentos.Where(casamento => casamento.Id == outro.Id).ToListAsync());
        Assert.Single(await contexto.Casamentos.ToListAsync());
    }

    private static async Task AssertConviteInvalidoAsync(HttpResponseMessage resposta)
    {
        await AssertRegraAsync(resposta, MensagensAcessoCasal.ConviteInvalido);
    }

    private static async Task AssertRegraAsync(HttpResponseMessage resposta, string mensagem)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = await ClienteAutenticacao.LerJsonAsync(resposta);
        Assert.Equal(mensagem, json.RootElement.GetProperty("detail").GetString());
    }
}
