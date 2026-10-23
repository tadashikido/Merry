using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Usuarios;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Celebri.Testes.Unidade.Autenticacao;

public class AutenticacaoServiceTestes
{
    private readonly CenarioAutenticacao _cenario = new();

    [Fact]
    public async Task Cadastrar_DeveCriarOrganizacaoEDonoComSenhaEmHashESessao()
    {
        var resultado = await _cenario.CadastrarAsync("  Ana@Exemplo.com ");

        var usuario = Assert.Single(_cenario.Banco.Usuarios);
        var organizacao = Assert.Single(_cenario.Banco.Organizacoes);
        Assert.Equal("ana@exemplo.com", usuario.Email);
        Assert.Equal(organizacao.Id, usuario.OrganizacaoId);
        Assert.Equal(PapelUsuario.Dono, usuario.Papel);
        Assert.NotEqual(CenarioAutenticacao.SenhaValida, usuario.SenhaHash);
        Assert.False(string.IsNullOrWhiteSpace(resultado.Sessao.TokenAcesso));
        Assert.Equal("Assessoria Ana", resultado.Sessao.Usuario.Organizacao.Nome);
        Assert.Equal("Dono", resultado.Sessao.Usuario.Papel);
        var refresh = Assert.Single(_cenario.Banco.RefreshTokens);
        Assert.Equal(_cenario.GeradorTokenOpaco.CalcularHash(resultado.RefreshToken), refresh.TokenHash);
        Assert.NotEqual(resultado.RefreshToken, refresh.TokenHash);
        Assert.Equal(_cenario.Relogio.Agora.AddDays(14), resultado.RefreshTokenExpiraEm);
    }

    [Fact]
    public async Task Cadastrar_TokenDeAcessoDeveConterClaimsDeUsuarioOrganizacaoEPapel()
    {
        var resultado = await _cenario.CadastrarAsync();

        var jwt = new JsonWebToken(resultado.Sessao.TokenAcesso);
        var usuario = _cenario.Banco.Usuarios[0];
        Assert.Equal(usuario.Id.ToString(), jwt.Subject);
        Assert.Equal(usuario.OrganizacaoId.ToString(), jwt.GetClaim(ClaimsAutenticacao.OrganizacaoId).Value);
        Assert.Equal("Dono", jwt.GetClaim(ClaimsAutenticacao.Papel).Value);
        Assert.Equal(_cenario.Relogio.Agora.AddMinutes(15), resultado.Sessao.ExpiraEm);
    }

    [Fact]
    public async Task Cadastrar_EmailJaExistenteEmOutraCaixa_DeveLancarConflito()
    {
        await _cenario.CadastrarAsync("ana@exemplo.com");

        var excecao = await Assert.ThrowsAsync<ConflitoException>(() => _cenario.CadastrarAsync("ANA@exemplo.com"));

        Assert.Equal(MensagensAutenticacao.EmailEmUso, excecao.Message);
        Assert.Single(_cenario.Banco.Organizacoes);
    }

    [Fact]
    public async Task Cadastrar_SenhaFraca_DeveLancarRegraNegocioSemPersistir()
    {
        await Assert.ThrowsAsync<RegraNegocioException>(() => _cenario.CadastrarAsync(senha: "fraca"));

        Assert.Empty(_cenario.Banco.Usuarios);
        Assert.Equal(0, _cenario.Banco.Salvamentos);
    }

    [Fact]
    public async Task Entrar_CredenciaisCorretas_DeveEmitirNovaFamiliaDeRefresh()
    {
        var cadastro = await _cenario.CadastrarAsync();

        var resultado = await _cenario.Autenticacao.EntrarAsync(new EntrarRequest(" ANA@exemplo.com", CenarioAutenticacao.SenhaValida), CancellationToken.None);

        Assert.NotEqual(cadastro.RefreshToken, resultado.RefreshToken);
        Assert.Equal(2, _cenario.Banco.RefreshTokens.Select(token => token.Familia).Distinct().Count());
    }

    [Fact]
    public async Task Entrar_EmailInexistenteESenhaErrada_DevemTerAMesmaMensagem()
    {
        await _cenario.CadastrarAsync();

        var inexistente = await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarRequest("outra@exemplo.com", CenarioAutenticacao.SenhaValida), CancellationToken.None));
        var senhaErrada = await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", "senhaErrada123"), CancellationToken.None));

        Assert.Equal(MensagensAutenticacao.CredenciaisInvalidas, inexistente.Message);
        Assert.Equal(inexistente.Message, senhaErrada.Message);
    }

    [Fact]
    public async Task Entrar_AposCincoFalhas_DeveRecusarSenhaCorretaAteOBloqueioExpirar()
    {
        await _cenario.CadastrarAsync();
        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas; tentativa++)
        {
            await Assert.ThrowsAsync<CredenciaisInvalidasException>(
                () => _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", "senhaErrada123"), CancellationToken.None));
        }

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", CenarioAutenticacao.SenhaValida), CancellationToken.None));

        _cenario.Relogio.Avancar(PoliticaBloqueio.DuracaoBloqueio);
        var resultado = await _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", CenarioAutenticacao.SenhaValida), CancellationToken.None);
        Assert.NotNull(resultado.Sessao);
    }

    [Fact]
    public async Task Renovar_TokenValido_DeveRotacionarNaMesmaFamilia()
    {
        var cadastro = await _cenario.CadastrarAsync();

        var renovado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);

        Assert.NotEqual(cadastro.RefreshToken, renovado.RefreshToken);
        Assert.Equal(2, _cenario.Banco.RefreshTokens.Count);
        Assert.Single(_cenario.Banco.RefreshTokens.Select(token => token.Familia).Distinct());
        Assert.NotNull(_cenario.Banco.RefreshTokens[0].SubstituidoEm);
    }

    [Fact]
    public async Task Renovar_TokenJaRotacionado_DeveRevogarAFamiliaInteira()
    {
        var cadastro = await _cenario.CadastrarAsync();
        var renovado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);
        _cenario.Relogio.Avancar(TimeSpan.FromSeconds(16));

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));

        Assert.All(_cenario.Banco.RefreshTokens, token => Assert.True(token.FoiUtilizado));
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(renovado.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task Renovar_TokenRecemSubstituidoDentroDaJanela_DeveEmitirNovoTokenSemRevogarAFamilia()
    {
        var cadastro = await _cenario.CadastrarAsync();
        var renovado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);
        _cenario.Relogio.Avancar(TimeSpan.FromSeconds(15));

        var reapresentado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);

        Assert.NotEqual(renovado.RefreshToken, reapresentado.RefreshToken);
        Assert.Equal(3, _cenario.Banco.RefreshTokens.Count);
        Assert.Single(_cenario.Banco.RefreshTokens.Select(token => token.Familia).Distinct());
        Assert.All(_cenario.Banco.RefreshTokens, token => Assert.Null(token.RevogadoEm));
        Assert.NotNull(await _cenario.Autenticacao.RenovarAsync(renovado.RefreshToken, CancellationToken.None));
        Assert.NotNull(await _cenario.Autenticacao.RenovarAsync(reapresentado.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task Renovar_TokenSubstituidoAposSair_DeveRecusarMesmoDentroDaJanela()
    {
        var cadastro = await _cenario.CadastrarAsync();
        var renovado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);
        await _cenario.Autenticacao.SairAsync(renovado.RefreshToken, CancellationToken.None);

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));

        Assert.Equal(2, _cenario.Banco.RefreshTokens.Count);
    }

    [Fact]
    public async Task Renovar_JanelaZero_ReusoImediatoDeveRevogarAFamilia()
    {
        _cenario.Opcoes.Value.JanelaReusoRefreshTokenSegundos = 0;
        var cadastro = await _cenario.CadastrarAsync();
        var renovado = await _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None);
        _cenario.Relogio.Avancar(TimeSpan.FromSeconds(1));

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));

        Assert.All(_cenario.Banco.RefreshTokens, token => Assert.True(token.FoiUtilizado));
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(renovado.RefreshToken, CancellationToken.None));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("token-desconhecido")]
    public async Task Renovar_TokenAusenteOuDesconhecido_DeveLancarSessaoInvalida(string? token)
    {
        var excecao = await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(token, CancellationToken.None));

        Assert.Equal(MensagensAutenticacao.SessaoInvalida, excecao.Message);
    }

    [Fact]
    public async Task Renovar_TokenExpirado_DeveLancarSessaoInvalida()
    {
        var cadastro = await _cenario.CadastrarAsync();
        _cenario.Relogio.Avancar(TimeSpan.FromDays(14));

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task Renovar_ConflitoDeConcorrencia_DeveLancarSessaoInvalida()
    {
        var cadastro = await _cenario.CadastrarAsync();
        _cenario.Banco.ExcecaoAoSalvar = new ConcorrenciaException("concorrência");

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task Sair_DeveRevogarORefreshTokenESerIdempotente()
    {
        var cadastro = await _cenario.CadastrarAsync();

        await _cenario.Autenticacao.SairAsync(cadastro.RefreshToken, CancellationToken.None);
        await _cenario.Autenticacao.SairAsync(cadastro.RefreshToken, CancellationToken.None);
        await _cenario.Autenticacao.SairAsync(null, CancellationToken.None);

        Assert.NotNull(_cenario.Banco.RefreshTokens[0].RevogadoEm);
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task ObterUsuario_Existente_DeveRetornarDadosDaOrganizacao()
    {
        await _cenario.CadastrarAsync();
        var usuario = _cenario.Banco.Usuarios[0];

        var dto = await _cenario.Autenticacao.ObterUsuarioAsync(usuario.Id, CancellationToken.None);

        Assert.Equal("Ana Souza", dto.Nome);
        Assert.Equal("Assessoria Ana", dto.Organizacao.Nome);
    }

    [Fact]
    public async Task ObterUsuario_Inexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _cenario.Autenticacao.ObterUsuarioAsync(Guid.NewGuid(), CancellationToken.None));
    }
}
