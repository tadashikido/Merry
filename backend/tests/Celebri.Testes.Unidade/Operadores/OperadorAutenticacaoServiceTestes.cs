using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Operadores;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Usuarios;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Celebri.Testes.Unidade.Operadores;

public class OperadorAutenticacaoServiceTestes
{
    private readonly CenarioOperador _cenario = new();

    [Fact]
    public async Task Entrar_CredenciaisCorretas_DeveEmitirTokenDeOperadorSemOrganizacaoERefresh()
    {
        _cenario.CriarOperador("op@exemplo.com");

        var resultado = await _cenario.Autenticacao.EntrarAsync(
            new EntrarOperadorRequest(" OP@exemplo.com ", CenarioOperador.SenhaValida), CancellationToken.None);

        var jwt = new JsonWebToken(resultado.Sessao.TokenAcesso);
        Assert.Equal(PapeisOperador.Papel, jwt.GetClaim(ClaimsAutenticacao.Papel).Value);
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == ClaimsAutenticacao.OrganizacaoId);
        Assert.Equal(PapeisOperador.TipoToken, jwt.GetClaim(ClaimsAutenticacao.TipoIdentidade).Value);
        var refresh = Assert.Single(_cenario.Banco.RefreshTokens);
        Assert.Equal(_cenario.GeradorTokenOpaco.CalcularHash(resultado.RefreshToken), refresh.TokenHash);
        Assert.Equal("op@exemplo.com", resultado.Sessao.Operador.Email);
    }

    [Fact]
    public async Task Entrar_EmailInexistenteESenhaErrada_DevemTerAMesmaMensagem()
    {
        _cenario.CriarOperador("op@exemplo.com");

        var inexistente = await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarOperadorRequest("outro@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None));
        var senhaErrada = await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarOperadorRequest("op@exemplo.com", "senhaErrada123"), CancellationToken.None));

        Assert.Equal(MensagensAutenticacao.CredenciaisInvalidas, inexistente.Message);
        Assert.Equal(inexistente.Message, senhaErrada.Message);
    }

    [Fact]
    public async Task Entrar_AposCincoFalhas_DeveRecusarSenhaCorretaAteOBloqueioExpirar()
    {
        _cenario.CriarOperador("op@exemplo.com");
        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas; tentativa++)
        {
            await Assert.ThrowsAsync<CredenciaisInvalidasException>(
                () => _cenario.Autenticacao.EntrarAsync(new EntrarOperadorRequest("op@exemplo.com", "senhaErrada123"), CancellationToken.None));
        }

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None));

        _cenario.Relogio.Avancar(PoliticaBloqueio.DuracaoBloqueio);
        var resultado = await _cenario.Autenticacao.EntrarAsync(
            new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None);
        Assert.NotNull(resultado.Sessao);
    }

    [Fact]
    public async Task Entrar_OperadorInativo_DeveRecusarComCredenciaisInvalidas()
    {
        var operador = _cenario.CriarOperador("op@exemplo.com");
        operador.Desativar();

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None));
    }

    [Fact]
    public async Task Renovar_TokenValido_DeveRotacionarNaMesmaFamilia()
    {
        _cenario.CriarOperador("op@exemplo.com");
        var sessao = await _cenario.Autenticacao.EntrarAsync(
            new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None);

        var renovado = await _cenario.Autenticacao.RenovarAsync(sessao.RefreshToken, CancellationToken.None);

        Assert.NotEqual(sessao.RefreshToken, renovado.RefreshToken);
        Assert.Equal(2, _cenario.Banco.RefreshTokens.Count);
        Assert.Single(_cenario.Banco.RefreshTokens.Select(token => token.Familia).Distinct());
    }

    [Fact]
    public async Task Renovar_ReusoForaDaJanela_DeveRevogarAFamiliaInteira()
    {
        _cenario.Opcoes.Value.JanelaReusoRefreshTokenSegundos = 0;
        _cenario.CriarOperador("op@exemplo.com");
        var sessao = await _cenario.Autenticacao.EntrarAsync(
            new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None);
        var renovado = await _cenario.Autenticacao.RenovarAsync(sessao.RefreshToken, CancellationToken.None);
        _cenario.Relogio.Avancar(TimeSpan.FromSeconds(1));

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.RenovarAsync(sessao.RefreshToken, CancellationToken.None));

        Assert.All(_cenario.Banco.RefreshTokens, token => Assert.True(token.FoiUtilizado));
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.RenovarAsync(renovado.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task Sair_DeveRevogarORefreshTokenEImpedirRenovacao()
    {
        _cenario.CriarOperador("op@exemplo.com");
        var sessao = await _cenario.Autenticacao.EntrarAsync(
            new EntrarOperadorRequest("op@exemplo.com", CenarioOperador.SenhaValida), CancellationToken.None);

        await _cenario.Autenticacao.SairAsync(sessao.RefreshToken, CancellationToken.None);

        Assert.NotNull(_cenario.Banco.RefreshTokens[0].RevogadoEm);
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.RenovarAsync(sessao.RefreshToken, CancellationToken.None));
    }

    [Fact]
    public async Task ObterOperador_Inexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(
            () => _cenario.Autenticacao.ObterOperadorAsync(Guid.NewGuid(), CancellationToken.None));
    }
}
