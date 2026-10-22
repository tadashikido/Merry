using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.Excecoes;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.Autenticacao;

public class RecuperacaoSenhaServiceTestes
{
    private const string NovaSenha = "outraSenha456";

    private readonly CenarioAutenticacao _cenario = new();

    [Fact]
    public async Task Solicitar_EmailExistente_DeveEnviarLinkComTokenNoFragmento()
    {
        await _cenario.CadastrarAsync();

        var resposta = await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ANA@exemplo.com"), CancellationToken.None);

        Assert.Equal(MensagensAutenticacao.RecuperacaoSolicitada, resposta.Mensagem);
        var email = Assert.Single(_cenario.Email.Enviadas);
        Assert.Equal("ana@exemplo.com", email.Destinatario);
        Assert.Contains("https://app.evento.teste/redefinir-senha#token=", email.CorpoTexto);
        var token = Assert.Single(_cenario.Banco.TokensRedefinicao);
        Assert.Equal(_cenario.Relogio.Agora.AddMinutes(60), token.ExpiraEm);
        Assert.DoesNotContain(token.TokenHash, email.CorpoTexto);
    }

    [Fact]
    public async Task Solicitar_EmailInexistente_DeveResponderIgualSemEnviar()
    {
        var resposta = await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ninguem@exemplo.com"), CancellationToken.None);

        Assert.Equal(MensagensAutenticacao.RecuperacaoSolicitada, resposta.Mensagem);
        Assert.Empty(_cenario.Email.Enviadas);
        Assert.Empty(_cenario.Banco.TokensRedefinicao);
    }

    [Fact]
    public async Task Solicitar_FalhaNoEnvio_NaoDeveAlterarAResposta()
    {
        await _cenario.CadastrarAsync();
        _cenario.Email.Falhar = true;

        var resposta = await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana@exemplo.com"), CancellationToken.None);

        Assert.Equal(MensagensAutenticacao.RecuperacaoSolicitada, resposta.Mensagem);
    }

    [Fact]
    public async Task Solicitar_Novamente_DeveInvalidarOTokenAnterior()
    {
        await _cenario.CadastrarAsync();
        await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana@exemplo.com"), CancellationToken.None);
        var primeiro = CenarioAutenticacao.ExtrairToken(_cenario.Email.Enviadas[0].CorpoTexto);

        await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana@exemplo.com"), CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest(primeiro, NovaSenha), CancellationToken.None));
        Assert.Equal(MensagensAutenticacao.LinkRedefinicaoInvalido, excecao.Message);
    }

    [Fact]
    public async Task Redefinir_TokenValido_DeveTrocarSenhaRevogarSessoesEImpedirReuso()
    {
        var cadastro = await _cenario.CadastrarAsync();
        await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana@exemplo.com"), CancellationToken.None);
        var token = CenarioAutenticacao.ExtrairToken(_cenario.Email.Enviadas[0].CorpoTexto);

        await _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest(token, NovaSenha), CancellationToken.None);

        await Assert.ThrowsAsync<CredenciaisInvalidasException>(() => _cenario.Autenticacao.RenovarAsync(cadastro.RefreshToken, CancellationToken.None));
        await Assert.ThrowsAsync<CredenciaisInvalidasException>(
            () => _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", CenarioAutenticacao.SenhaValida), CancellationToken.None));
        var sessao = await _cenario.Autenticacao.EntrarAsync(new EntrarRequest("ana@exemplo.com", NovaSenha), CancellationToken.None);
        Assert.NotNull(sessao.Sessao);
        await Assert.ThrowsAsync<RegraNegocioException>(
            () => _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest(token, "maisUmaSenha789"), CancellationToken.None));
    }

    [Fact]
    public async Task Redefinir_TokenExpirado_DeveLancarLinkInvalido()
    {
        await _cenario.CadastrarAsync();
        await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana@exemplo.com"), CancellationToken.None);
        var token = CenarioAutenticacao.ExtrairToken(_cenario.Email.Enviadas[0].CorpoTexto);
        _cenario.Relogio.Avancar(TimeSpan.FromMinutes(60));

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(
            () => _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest(token, NovaSenha), CancellationToken.None));

        Assert.Equal(MensagensAutenticacao.LinkRedefinicaoInvalido, excecao.Message);
    }

    [Fact]
    public async Task Redefinir_SenhaIgualAoEmail_DeveLancarRegraNegocioSemConsumirToken()
    {
        await _cenario.CadastrarAsync("ana1@exemplo.com");
        await _cenario.Recuperacao.SolicitarAsync(new EsqueciSenhaRequest("ana1@exemplo.com"), CancellationToken.None);
        var token = CenarioAutenticacao.ExtrairToken(_cenario.Email.Enviadas[0].CorpoTexto);

        await Assert.ThrowsAsync<RegraNegocioException>(
            () => _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest(token, "ana1@exemplo.com"), CancellationToken.None));

        Assert.Null(_cenario.Banco.TokensRedefinicao[0].UsadoEm);
    }

    [Fact]
    public async Task Redefinir_TokenDesconhecido_DeveLancarLinkInvalido()
    {
        await Assert.ThrowsAsync<RegraNegocioException>(
            () => _cenario.Recuperacao.RedefinirAsync(new RedefinirSenhaRequest("desconhecido", NovaSenha), CancellationToken.None));
    }
}
