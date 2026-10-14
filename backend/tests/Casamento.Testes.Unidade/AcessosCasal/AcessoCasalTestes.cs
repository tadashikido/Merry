using Casamento.Aplicacao.Isolamento;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Usuarios;
using Casamento.Testes.Unidade.Autenticacao.Fakes;

namespace Casamento.Testes.Unidade.AcessosCasal;

public class AcessoCasalTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 29, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Validade = TimeSpan.FromDays(7);

    private static AcessoCasal NovoAcesso(string nome = "Lívia Moraes", string email = "Livia@Exemplo.com ")
    {
        return AcessoCasal.Convidar(Guid.NewGuid(), nome, email, Guid.NewGuid(), Agora, Validade);
    }

    [Fact]
    public void Convidar_DeveNormalizarEFicarPendenteComValidadeDeSeteDias()
    {
        var acesso = NovoAcesso(" Lívia Moraes ");

        Assert.Equal("Lívia Moraes", acesso.Nome);
        Assert.Equal("livia@exemplo.com", acesso.Email);
        Assert.Equal(Agora.AddDays(7), acesso.ConviteExpiraEm);
        Assert.Equal(SituacaoAcessoCasal.Pendente, acesso.Situacao(Agora));
        Assert.Equal(Guid.Empty, acesso.OrganizacaoId);
    }

    [Theory]
    [InlineData("A", "livia@exemplo.com", MensagensAcessoCasal.NomeInvalido)]
    [InlineData("Lívia", "   ", MensagensAcessoCasal.EmailInvalido)]
    public void Convidar_DadosInvalidos_DeveLancarRegraNegocio(string nome, string email, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => NovoAcesso(nome, email));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Convidar_SemCasamentoOuValidade_DeveLancar()
    {
        Assert.Throws<ArgumentException>(() => AcessoCasal.Convidar(Guid.Empty, "Lívia", "l@e.com", Guid.NewGuid(), Agora, Validade));
        Assert.Throws<ArgumentOutOfRangeException>(() => AcessoCasal.Convidar(Guid.NewGuid(), "Lívia", "l@e.com", Guid.NewGuid(), Agora, TimeSpan.Zero));
    }

    [Fact]
    public void Situacao_DeveRefletirExpiracaoAceiteERevogacao()
    {
        var acesso = NovoAcesso();

        Assert.Equal(SituacaoAcessoCasal.Expirado, acesso.Situacao(Agora.AddDays(7)));

        acesso.Aceitar(Guid.NewGuid(), Agora.AddDays(1));
        Assert.Equal(SituacaoAcessoCasal.Ativo, acesso.Situacao(Agora.AddDays(30)));

        acesso.Revogar(Guid.NewGuid(), Agora.AddDays(2));
        Assert.Equal(SituacaoAcessoCasal.Revogado, acesso.Situacao(Agora.AddDays(2)));
    }

    [Fact]
    public void Aceitar_ConviteExpirado_DeveSerRecusado()
    {
        var acesso = NovoAcesso();

        var excecao = Assert.Throws<RegraNegocioException>(() => acesso.Aceitar(Guid.NewGuid(), Agora.AddDays(8)));

        Assert.Equal(MensagensAcessoCasal.ConviteInvalido, excecao.Message);
        Assert.Null(acesso.UsuarioId);
    }

    [Fact]
    public void Aceitar_DuasVezes_DeveSerRecusado()
    {
        var acesso = NovoAcesso();
        acesso.Aceitar(Guid.NewGuid(), Agora);

        Assert.Throws<RegraNegocioException>(() => acesso.Aceitar(Guid.NewGuid(), Agora));
    }

    [Fact]
    public void Reenviar_ExpiradoDeveRenovarValidade()
    {
        var acesso = NovoAcesso();
        var reenvio = Agora.AddDays(10);

        acesso.Reenviar(reenvio, Validade);

        Assert.Equal(reenvio, acesso.ReenviadoEm);
        Assert.Equal(reenvio.AddDays(7), acesso.ConviteExpiraEm);
        Assert.Equal(SituacaoAcessoCasal.Pendente, acesso.Situacao(reenvio));
    }

    [Fact]
    public void Reenviar_AtivoOuRevogado_DeveGerarConflito()
    {
        var ativo = NovoAcesso();
        ativo.Aceitar(Guid.NewGuid(), Agora);
        var revogado = NovoAcesso();
        revogado.Revogar(Guid.NewGuid(), Agora);

        Assert.Equal(MensagensAcessoCasal.AcessoJaAtivo, Assert.Throws<ConflitoException>(() => ativo.Reenviar(Agora, Validade)).Message);
        Assert.Equal(MensagensAcessoCasal.AcessoRevogado, Assert.Throws<ConflitoException>(() => revogado.Reenviar(Agora, Validade)).Message);
    }

    [Fact]
    public void Revogar_DuasVezes_DeveGerarConflito()
    {
        var acesso = NovoAcesso();
        acesso.Revogar(Guid.NewGuid(), Agora);

        Assert.Throws<ConflitoException>(() => acesso.Revogar(Guid.NewGuid(), Agora));
    }

    [Fact]
    public void Token_DeveExigirHashDe64Caracteres()
    {
        var acesso = NovoAcesso();

        Assert.Throws<ArgumentException>(() => TokenAcessoCasal.Gerar(acesso, Guid.NewGuid(), "curto", Agora));
        var token = TokenAcessoCasal.Gerar(acesso, Guid.NewGuid(), new string('a', 64), Agora);
        token.Renovar(new string('b', 64), Agora.AddDays(1));

        Assert.Equal(new string('b', 64), token.TokenHash);
        Assert.Equal(acesso.Id, token.AcessoCasalId);
        Assert.Equal(acesso.CasamentoId, token.CasamentoId);
    }

    [Fact]
    public void UsuarioCasal_DeveNascerVinculadoAoCasamento()
    {
        var casamentoId = Guid.NewGuid();

        var usuario = Usuario.CriarCasal(Guid.NewGuid(), casamentoId, " Lívia ", "LIVIA@exemplo.com", "hash", Agora);

        Assert.Equal(PapelUsuario.Casal, usuario.Papel);
        Assert.Equal(casamentoId, usuario.CasamentoId);
        Assert.True(usuario.Ativo);
        Assert.Equal("livia@exemplo.com", usuario.Email);
        Assert.Throws<ArgumentException>(() => Usuario.CriarCasal(Guid.NewGuid(), Guid.Empty, "Lívia", "l@e.com", "hash", Agora));
    }

    [Fact]
    public void UsuarioDono_NaoDeveTerCasamento()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Renata", "renata@exemplo.com", "hash", Agora);

        Assert.Null(usuario.CasamentoId);
        Assert.Equal(PapelUsuario.Dono, usuario.Papel);
    }

    [Fact]
    public void ReativarCasal_DeveExigirMesmoCasamentoEUsuarioInativo()
    {
        var casamentoId = Guid.NewGuid();
        var usuario = Usuario.CriarCasal(Guid.NewGuid(), casamentoId, "Lívia", "livia@exemplo.com", "hash", Agora);

        Assert.Throws<RegraNegocioException>(() => usuario.ReativarCasal(casamentoId, "Lívia", "novo", Agora));

        usuario.Desativar();
        Assert.Throws<RegraNegocioException>(() => usuario.ReativarCasal(Guid.NewGuid(), "Lívia", "novo", Agora));

        usuario.ReativarCasal(casamentoId, "Lívia Moraes", "novo", Agora);
        Assert.True(usuario.Ativo);
        Assert.Equal("novo", usuario.SenhaHash);
        Assert.Equal("Lívia Moraes", usuario.Nome);
    }

    [Fact]
    public void RegistroAlteracao_SemUsuario_NaoDeveGuardarPapel()
    {
        var registro = RegistroAlteracaoConvite.Registrar(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), AcaoAlteracaoConvite.Alteracao, null, "Dono", Agora);

        Assert.Null(registro.UsuarioId);
        Assert.Null(registro.PapelUsuario);
        Assert.Throws<ArgumentException>(() =>
            RegistroAlteracaoConvite.Registrar(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(), AcaoAlteracaoConvite.Criacao, null, null, Agora));
    }

    [Fact]
    public void ContextoUsuario_Dono_NaoDeveRestringirCasamento()
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Dono());

        Assert.Null(contexto.CasamentosPermitidos);
    }

    [Fact]
    public void ContextoUsuario_Casal_DeveRestringirAoProprioCasamento()
    {
        var casamentoId = Guid.NewGuid();
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Casal(casamentoId));

        Assert.Equal([casamentoId], contexto.CasamentosPermitidos);
    }

    [Fact]
    public void ContextoUsuario_CasalSemCasamento_DeveSerFailClosed()
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Casal(Guid.Empty));

        Assert.NotNull(contexto.CasamentosPermitidos);
        Assert.Empty(contexto.CasamentosPermitidos!);
    }

    [Fact]
    public void ContextoRequisicao_EscopoRsvp_NaoDeveRestringirPeloCasamentoDoUsuario()
    {
        var rsvp = new EscopoIsolamentoRsvp();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Casal(Guid.NewGuid())),
            rsvp,
            new EscopoIsolamentoAcessoCasal(),
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());
        var organizacao = Guid.NewGuid();

        rsvp.Estabelecer(organizacao, Guid.NewGuid());

        Assert.Equal(organizacao, contexto.OrganizacaoId);
        Assert.Null(contexto.CasamentosPermitidos);
    }

    [Fact]
    public void ContextoRequisicao_EscopoDoConvite_DeveFixarOrganizacaoECasamento()
    {
        var escopo = new EscopoIsolamentoAcessoCasal();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Anonimo()),
            new EscopoIsolamentoRsvp(),
            escopo,
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());
        var organizacao = Guid.NewGuid();
        var casamento = Guid.NewGuid();

        Assert.Null(contexto.OrganizacaoId);
        escopo.Fixar(organizacao, casamento);

        Assert.Equal(organizacao, contexto.OrganizacaoId);
        Assert.Equal([casamento], contexto.CasamentosPermitidos);
        Assert.Throws<InvalidOperationException>(() => escopo.Fixar(organizacao, casamento));
    }
}
