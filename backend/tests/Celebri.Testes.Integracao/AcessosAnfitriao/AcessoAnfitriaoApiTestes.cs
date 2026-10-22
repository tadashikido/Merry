using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Celebri.Aplicacao.AcessosAnfitriao;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Usuarios;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteAutenticacao = Celebri.Testes.Integracao.Autenticacao.ClienteAutenticacao;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteRsvp = Celebri.Testes.Integracao.Rsvp.ClienteRsvp;

namespace Celebri.Testes.Integracao.AcessosAnfitriao;

public sealed record AnfitriaoTeste(Guid EventoId, Guid AcessoId, Guid UsuarioId, string Email, string TokenAcesso, HttpClient Cliente);

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class AcessoAnfitriaoApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesAnfitriao = [];

    public AcessoAnfitriaoApiTestes(BancoPostgreSqlFixture banco)
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

    private HttpClient ClienteComToken(string tokenAcesso)
    {
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenAcesso);
        _clientesAnfitriao.Add(cliente);
        return cliente;
    }

    private async Task<AnfitriaoTeste> CriarAnfitriaoAsync(OrganizacaoTeste organizacao, Guid? eventoId = null)
    {
        var idEvento = eventoId ?? (await ClienteEventos.CriarAsync(organizacao.Cliente)).Id;
        var email = EmailAnfitriaoUnico();
        var acesso = await ConvidarComSucessoAsync(organizacao.Cliente, idEvento, email);

        var resposta = await AceitarAsync(ClienteAnonimo, UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var sessao = (await resposta.Content.ReadFromJsonAsync<SessaoDto>())!;

        return new AnfitriaoTeste(idEvento, acesso.Id, sessao.Usuario.Id, email, sessao.TokenAcesso, ClienteComToken(sessao.TokenAcesso));
    }

    [Fact]
    public async Task ConviteEAceite_DeveEnviarEmailSemExporTokenECriarSessaoDoAnfitriao()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailAnfitriaoUnico();

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, email, "  Lívia Moraes ");

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        var token = UltimoToken(Fabrica.Email, email);
        Assert.DoesNotContain(token, corpo, StringComparison.Ordinal);
        var acesso = (await resposta.Content.ReadFromJsonAsync<AcessoAnfitriaoDto>())!;
        Assert.Equal("Pendente", acesso.Situacao);
        Assert.Equal("Lívia Moraes", acesso.Nome);

        var consulta = await ConsultarAsync(ClienteAnonimo, token);
        Assert.Equal(HttpStatusCode.OK, consulta.StatusCode);
        var convite = (await consulta.Content.ReadFromJsonAsync<ConviteAcessoAnfitriaoDto>())!;
        Assert.Equal(email, convite.Email);
        Assert.Equal(evento.NomePrimeiraPessoa, convite.NomePrimeiraPessoa);

        var aceite = await AceitarAsync(ClienteAnonimo, token);
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        Assert.NotNull(ClienteAutenticacao.LerRefreshToken(aceite));
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        Assert.Equal(nameof(PapelUsuario.Anfitriao), sessao.Usuario.Papel);
        Assert.Equal(evento.Id, sessao.Usuario.EventoId);
        Assert.Equal(OrganizacaoA.OrganizacaoId, sessao.Usuario.Organizacao.Id);

        var lista = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoAnfitriaoDto>>(Rota(evento.Id));
        Assert.Equal("Ativo", Assert.Single(lista!).Situacao);

        await AssertConviteInvalidoAsync(await AceitarAsync(ClienteAnonimo, token));

        var login = await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, email, SenhaAnfitriao);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Anfitriao_DeveVerOProprioEventoSemObservacoesInternas()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);

        var evento = await anfitriao.Cliente.GetFromJsonAsync<EventoDto>($"{ClienteEventos.Rota}/{anfitriao.EventoId}");

        Assert.Equal(anfitriao.EventoId, evento!.Id);
        Assert.Null(evento.Observacoes);
        var doDono = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{ClienteEventos.Rota}/{anfitriao.EventoId}");
        Assert.Equal("Flores brancas", doDono!.Observacoes);
    }

    [Fact]
    public async Task Anfitriao_NaoDeveAcessarOutroEventoDaMesmaOrganizacao()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente, ClienteEventos.CorpoValido(nomePrimeiraPessoa: "Outra Noiva"));
        var conviteOutro = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, outro.Id);

        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync($"{ClienteEventos.Rota}/{outro.Id}"));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync(ClienteConvites.Rota(outro.Id)));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync(ClienteConvites.Rota(outro.Id, conviteOutro.Id)));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync($"{ClienteEventos.Rota}/{outro.Id}/painel-confirmacoes"));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.PostAsJsonAsync(ClienteConvites.Rota(outro.Id), ClienteConvites.CorpoValido()));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(outro.Id, conviteOutro.Id),
            ClienteConvites.CorpoValido(nome: "Invasão")));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.DeleteAsync(ClienteConvites.Rota(outro.Id, conviteOutro.Id)));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.PostAsync(ClienteRsvp.RotaLink(outro.Id, conviteOutro.Id), null));

        var intacto = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(outro.Id, conviteOutro.Id));
        Assert.Equal(conviteOutro.Nome, intacto!.Nome);
        Assert.Equal(conviteOutro.Convidados.Count, intacto.Convidados.Count);
    }

    [Fact]
    public async Task Anfitriao_NaoDeveAcessarEventoDeOutraOrganizacao()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var deB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync($"{ClienteEventos.Rota}/{deB.Id}"));
        await AssertNaoEncontradoAsync(await anfitriao.Cliente.GetAsync(ClienteConvites.Rota(deB.Id)));
    }

    [Theory]
    [InlineData("GET", "/api/eventos")]
    [InlineData("POST", "/api/eventos")]
    [InlineData("PUT", "/api/eventos/{c}")]
    [InlineData("POST", "/api/eventos/{c}/arquivar")]
    [InlineData("POST", "/api/eventos/{c}/restaurar")]
    [InlineData("GET", "/api/eventos/{c}/proximos-passos")]
    [InlineData("GET", "/api/eventos/{c}/acessos-anfitriao")]
    [InlineData("POST", "/api/eventos/{c}/acessos-anfitriao")]
    [InlineData("POST", "/api/eventos/{c}/acessos-anfitriao/{a}/reenvio")]
    [InlineData("DELETE", "/api/eventos/{c}/acessos-anfitriao/{a}")]
    [InlineData("GET", "/api/eventos/{c}/restricoes-alimentares")]
    [InlineData("GET", "/api/eventos/{c}/exportacao-buffet")]
    [InlineData("PUT", "/api/eventos/{c}/convites/{cv}/convidados/{p}/restricao-alimentar")]
    [InlineData("DELETE", "/api/eventos/{c}/convites/{cv}/convidados/{p}/restricao-alimentar")]
    public async Task Anfitriao_EmEndpointsDaAssessoria_DeveReceber403(string metodo, string rota)
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, anfitriao.EventoId);
        var caminho = rota
            .Replace("{c}", anfitriao.EventoId.ToString(), StringComparison.Ordinal)
            .Replace("{a}", anfitriao.AcessoId.ToString(), StringComparison.Ordinal)
            .Replace("{cv}", convite.Id.ToString(), StringComparison.Ordinal)
            .Replace("{p}", convite.Convidados[0].Id.ToString(), StringComparison.Ordinal);
        using var requisicao = new HttpRequestMessage(new HttpMethod(metodo), caminho)
        {
            Content = metodo is "POST" or "PUT" ? JsonContent.Create(ClienteEventos.CorpoValido(nomeSegundaPessoa: "Invasor")) : null,
        };

        var resposta = await anfitriao.Cliente.SendAsync(requisicao);

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        var evento = await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{ClienteEventos.Rota}/{anfitriao.EventoId}");
        Assert.Equal("Bruno", evento!.NomeSegundaPessoa);
        Assert.False(evento.Arquivado);
        var acessos = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoAnfitriaoDto>>(Rota(anfitriao.EventoId));
        Assert.Equal("Ativo", Assert.Single(acessos!).Situacao);
    }

    [Fact]
    public async Task Anfitriao_DeveGerenciarConvitesDoProprioEventoERegistrarATrilha()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);

        var criado = await ClienteConvites.CriarAsync(anfitriao.Cliente, anfitriao.EventoId);
        var atualizacao = await anfitriao.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(anfitriao.EventoId, criado.Id),
            ClienteConvites.CorpoValido(nome: "Família Moraes"));
        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);

        var lista = await ClienteConvites.ListarAsync(anfitriao.Cliente, anfitriao.EventoId);
        Assert.All(lista.Convites.SelectMany(convite => convite.Convidados), convidado => Assert.Null(convidado.PossuiRestricao));
        var listaDono = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, anfitriao.EventoId);
        Assert.All(listaDono.Convites.SelectMany(convite => convite.Convidados), convidado => Assert.False(convidado.PossuiRestricao));

        var link = await ClienteRsvp.GerarLinkAsync(anfitriao.Cliente, anfitriao.EventoId, criado.Id);
        Assert.False(string.IsNullOrWhiteSpace(link.Token));
        var envio = await anfitriao.Cliente.PostAsync(ClienteRsvp.RotaEnvio(anfitriao.EventoId, criado.Id), null);
        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var enviado = (await envio.Content.ReadFromJsonAsync<ConviteDto>())!;
        Assert.Equal("Enviado", enviado.StatusEnvio);
        Assert.All(enviado.Convidados, convidado => Assert.Null(convidado.PossuiRestricao));

        using var formulario = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(Encoding.UTF8.GetBytes("Convite;Nome;Telefone\nFamília Lima;Ana Lima;(11) 98765-4321\n"));
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        formulario.Add(arquivo, "arquivo", "lista.csv");
        var previa = await anfitriao.Cliente.PostAsync($"{ClienteConvites.Rota(anfitriao.EventoId)}/importacao/pre-visualizacao", formulario);
        Assert.Equal(HttpStatusCode.OK, previa.StatusCode);

        var painel = await anfitriao.Cliente.GetFromJsonAsync<PainelConfirmacoesDto>($"{ClienteEventos.Rota}/{anfitriao.EventoId}/painel-confirmacoes");
        Assert.Equal(1, painel!.Convites.Total);
        Assert.Equal(0, painel.PessoasComRestricaoAlimentar);

        var remocao = await anfitriao.Cliente.DeleteAsync(ClienteConvites.Rota(anfitriao.EventoId, criado.Id));
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
            Assert.Equal(anfitriao.UsuarioId, registro.UsuarioId);
            Assert.Equal(nameof(PapelUsuario.Anfitriao), registro.PapelUsuario);
            Assert.Equal(anfitriao.EventoId, registro.EventoId);
            Assert.Equal(OrganizacaoA.OrganizacaoId, registro.OrganizacaoId);
        });
    }

    [Fact]
    public async Task Trilha_DeveRegistrarADonaEOConvidadoAnonimo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, evento.Id, convite.Id);

        await ClienteRsvp.ConsultarComSucessoAsync(ClienteAnonimo, link.Token);

        await using var contexto = CriarContexto(OrganizacaoA);
        var trilha = await contexto.RegistrosAlteracaoConvites.AsNoTracking().Where(registro => registro.ConviteId == convite.Id).ToListAsync();
        var criacao = Assert.Single(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Criacao);
        Assert.Equal(OrganizacaoA.UsuarioId, criacao.UsuarioId);
        Assert.Equal(nameof(PapelUsuario.Dono), criacao.PapelUsuario);
        Assert.Contains(trilha, registro => registro.Acao == AcaoAlteracaoConvite.Alteracao && registro.UsuarioId == null && registro.PapelUsuario == null);
    }

    [Fact]
    public async Task Anfitriao_AbrindoLinkRsvpDoProprioEvento_NaoDeveMarcarVisualizado()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, anfitriao.EventoId);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, anfitriao.EventoId, convite.Id);

        var rsvp = await ClienteRsvp.ConsultarComSucessoAsync(anfitriao.Cliente, link.Token);

        Assert.True(rsvp.PreVisualizacao);
        var depois = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(anfitriao.EventoId, convite.Id));
        Assert.NotEqual("Visualizado", depois!.StatusEnvio);
    }

    [Fact]
    public async Task Anfitriao_AbrindoLinkRsvpDeOutroEvento_DeveSerTratadoComoConvidado()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, outro.Id);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, outro.Id, convite.Id);

        var rsvp = await ClienteRsvp.ConsultarComSucessoAsync(anfitriao.Cliente, link.Token);

        Assert.False(rsvp.PreVisualizacao);
        var depois = await OrganizacaoA.Cliente.GetFromJsonAsync<ConviteDto>(ClienteConvites.Rota(outro.Id, convite.Id));
        Assert.Equal("Visualizado", depois!.StatusEnvio);
    }

    [Fact]
    public async Task Revogar_AcessoAtivo_DeveCortarTokenVigenteELogin()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        Assert.Equal(HttpStatusCode.OK, (await anfitriao.Cliente.GetAsync($"{ClienteEventos.Rota}/{anfitriao.EventoId}")).StatusCode);

        var revogacao = await OrganizacaoA.Cliente.DeleteAsync(Rota(anfitriao.EventoId, anfitriao.AcessoId));

        Assert.Equal(HttpStatusCode.NoContent, revogacao.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anfitriao.Cliente.GetAsync($"{ClienteEventos.Rota}/{anfitriao.EventoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, anfitriao.Email, SenhaAnfitriao)).StatusCode);
        var acessos = await OrganizacaoA.Cliente.GetFromJsonAsync<List<AcessoAnfitriaoDto>>(Rota(anfitriao.EventoId));
        Assert.Empty(acessos!);
    }

    [Fact]
    public async Task ConviteRevogadoDoMesmoEmail_DeveReativarOUsuarioNoNovoAceite()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.DeleteAsync(Rota(anfitriao.EventoId, anfitriao.AcessoId));

        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, anfitriao.EventoId, anfitriao.Email);
        var aceite = await AceitarAsync(ClienteAnonimo, UltimoToken(Fabrica.Email, anfitriao.Email), "novaSenhaAnfitriao9");

        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        Assert.Equal(anfitriao.UsuarioId, sessao.Usuario.Id);
        Assert.Equal(HttpStatusCode.OK, (await ClienteAutenticacao.EntrarAsync(ClienteAnonimo, anfitriao.Email, "novaSenhaAnfitriao9")).StatusCode);
    }

    [Fact]
    public async Task RevogarConvitePendente_DeveInvalidarOLink()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailAnfitriaoUnico();
        var acesso = await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);
        var token = UltimoToken(Fabrica.Email, email);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(Rota(evento.Id, acesso.Id))).StatusCode);

        await AssertConviteInvalidoAsync(await ConsultarAsync(ClienteAnonimo, token));
        await AssertConviteInvalidoAsync(await AceitarAsync(ClienteAnonimo, token));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(Rota(evento.Id, acesso.Id)));
    }

    [Fact]
    public async Task Reenviar_DeveInvalidarLinkAnteriorEEnviarNovoEmail()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailAnfitriaoUnico();
        var acesso = await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);
        var tokenAnterior = UltimoToken(Fabrica.Email, email);

        var reenvio = await OrganizacaoA.Cliente.PostAsync($"{Rota(evento.Id, acesso.Id)}/reenvio", null);

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
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);

        var reenvio = await OrganizacaoA.Cliente.PostAsync($"{Rota(anfitriao.EventoId, anfitriao.AcessoId)}/reenvio", null);

        Assert.Equal(HttpStatusCode.Conflict, reenvio.StatusCode);
    }

    [Fact]
    public async Task Convidar_TerceiraPessoa_DeveRetornar422()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, EmailAnfitriaoUnico());
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, EmailAnfitriaoUnico(), "Rafael Souza");

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, EmailAnfitriaoUnico(), "Terceira Pessoa");

        await AssertRegraAsync(resposta, MensagensAcessoAnfitriao.LimiteAtingido);
    }

    [Fact]
    public async Task Convidar_EmailDeContaDaAssessoriaOuDeOutraOrganizacao_DeveRetornar422SemEnviarEmail()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, OrganizacaoA.Email), MensagensAcessoAnfitriao.EmailEmUso);
        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, OrganizacaoB.Email.ToUpperInvariant()), MensagensAcessoAnfitriao.EmailEmUso);
        Assert.Equal(0, QuantidadeEmails(Fabrica.Email, OrganizacaoA.Email));
    }

    [Fact]
    public async Task Convidar_EmailJaConvidadoNoMesmoOuEmOutroEvento_DeveRetornar422()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailAnfitriaoUnico();
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, email), MensagensAcessoAnfitriao.EmailJaConvidado);
        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, outro.Id, email), MensagensAcessoAnfitriao.EmailEmUso);
    }

    [Fact]
    public async Task Convidar_AnfitriaoDeOutroEvento_DeveRetornar422()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, outro.Id, anfitriao.Email), MensagensAcessoAnfitriao.EmailEmUso);
    }

    [Fact]
    public async Task Convidar_DadosInvalidos_DeveRetornar400()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, "nao-e-email", "A");

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        using var json = await ClienteAutenticacao.LerJsonAsync(resposta);
        var erros = json.RootElement.GetProperty("errors");
        Assert.True(erros.TryGetProperty("Email", out _));
        Assert.True(erros.TryGetProperty("Nome", out _));
    }

    [Fact]
    public async Task Convidar_EventoArquivado_DeveRetornar422()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{evento.Id}/arquivar", null);

        await AssertRegraAsync(await ConvidarAsync(OrganizacaoA.Cliente, evento.Id, EmailAnfitriaoUnico()), MensagensAcessoAnfitriao.EventoArquivado);
    }

    [Fact]
    public async Task Convidar_EventoDeOutraOrganizacao_DeveRetornar404()
    {
        var deB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);

        await AssertNaoEncontradoAsync(await ConvidarAsync(OrganizacaoA.Cliente, deB.Id, EmailAnfitriaoUnico()));
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var email = EmailAnfitriaoUnico();
        await ConvidarComSucessoAsync(OrganizacaoA.Cliente, evento.Id, email);
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var usuario = Usuario.CriarAnfitriao(OrganizacaoA.OrganizacaoId, evento.Id, "Pessoa Inativa", EmailAnfitriaoUnico(), "hash-qualquer", DateTimeOffset.UtcNow);
        usuario.Desativar();

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Usuarios.Add(usuario);
            await contexto.SaveChangesAsync();
        }

        await using var leitura = CriarContexto(OrganizacaoA);
        var gravado = await leitura.Usuarios.AsNoTracking().SingleAsync(item => item.Id == usuario.Id);
        Assert.False(gravado.Ativo);
        Assert.Equal(evento.Id, gravado.EventoId);
    }

    [Fact]
    public async Task UsuarioAnfitriaoSemEvento_DeveSerRecusadoPeloBanco()
    {
        await using var contexto = CriarContexto(OrganizacaoA);

        await Assert.ThrowsAsync<Npgsql.PostgresException>(() => contexto.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE usuarios SET papel = 'Anfitriao' WHERE id = {OrganizacaoA.UsuarioId}"));
    }

    [Fact]
    public async Task ContextoDoAnfitriao_NaoDeveGravarEmOutroEvento()
    {
        var anfitriao = await CriarAnfitriaoAsync(OrganizacaoA);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var convite = Convite.Criar(
            outro.Id,
            new DadosConvite("Família Invasora", null, 0, [new DadosConvidado(null, "Pessoa Invasora", null, null, FaixaEtaria.Adulto, RespostaRsvp.Pendente)]),
            DateTimeOffset.UtcNow);

        await using var contexto = new Celebri.Infraestrutura.Persistencia.CelebriDbContext(
            Fabrica.CriarOpcoesDbContext(),
            new ContextoIsolamentoFixo(OrganizacaoA.OrganizacaoId, [anfitriao.EventoId]));
        contexto.Convites.Add(convite);

        await Assert.ThrowsAsync<Celebri.Aplicacao.Excecoes.ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
        Assert.Empty(await contexto.Eventos.Where(evento => evento.Id == outro.Id).ToListAsync());
        Assert.Single(await contexto.Eventos.ToListAsync());
    }

    private static async Task AssertConviteInvalidoAsync(HttpResponseMessage resposta)
    {
        await AssertRegraAsync(resposta, MensagensAcessoAnfitriao.ConviteInvalido);
    }

    private static async Task AssertRegraAsync(HttpResponseMessage resposta, string mensagem)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = await ClienteAutenticacao.LerJsonAsync(resposta);
        Assert.Equal(mensagem, json.RootElement.GetProperty("detail").GetString());
    }
}
