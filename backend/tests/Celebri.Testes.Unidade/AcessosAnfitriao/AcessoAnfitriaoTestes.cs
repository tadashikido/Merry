using Celebri.Aplicacao.Isolamento;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Usuarios;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.AcessosAnfitriao;

public class AcessoAnfitriaoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 29, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Validade = TimeSpan.FromDays(7);

    private static AcessoAnfitriao NovoAcesso(string nome = "Lívia Moraes", string email = "Livia@Exemplo.com ")
    {
        return AcessoAnfitriao.Convidar(Guid.NewGuid(), nome, email, Guid.NewGuid(), Agora, Validade);
    }

    [Fact]
    public void Convidar_DeveNormalizarEFicarPendenteComValidadeDeSeteDias()
    {
        var acesso = NovoAcesso(" Lívia Moraes ");

        Assert.Equal("Lívia Moraes", acesso.Nome);
        Assert.Equal("livia@exemplo.com", acesso.Email);
        Assert.Equal(Agora.AddDays(7), acesso.ConviteExpiraEm);
        Assert.Equal(SituacaoAcessoAnfitriao.Pendente, acesso.Situacao(Agora));
        Assert.Equal(Guid.Empty, acesso.OrganizacaoId);
    }

    [Theory]
    [InlineData("A", "livia@exemplo.com", MensagensAcessoAnfitriao.NomeInvalido)]
    [InlineData("Lívia", "   ", MensagensAcessoAnfitriao.EmailInvalido)]
    public void Convidar_DadosInvalidos_DeveLancarRegraNegocio(string nome, string email, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => NovoAcesso(nome, email));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Convidar_SemEventoOuValidade_DeveLancar()
    {
        Assert.Throws<ArgumentException>(() => AcessoAnfitriao.Convidar(Guid.Empty, "Lívia", "l@e.com", Guid.NewGuid(), Agora, Validade));
        Assert.Throws<ArgumentOutOfRangeException>(() => AcessoAnfitriao.Convidar(Guid.NewGuid(), "Lívia", "l@e.com", Guid.NewGuid(), Agora, TimeSpan.Zero));
    }

    [Fact]
    public void Situacao_DeveRefletirExpiracaoAceiteERevogacao()
    {
        var acesso = NovoAcesso();

        Assert.Equal(SituacaoAcessoAnfitriao.Expirado, acesso.Situacao(Agora.AddDays(7)));

        acesso.Aceitar(Guid.NewGuid(), Agora.AddDays(1));
        Assert.Equal(SituacaoAcessoAnfitriao.Ativo, acesso.Situacao(Agora.AddDays(30)));

        acesso.Revogar(Guid.NewGuid(), Agora.AddDays(2));
        Assert.Equal(SituacaoAcessoAnfitriao.Revogado, acesso.Situacao(Agora.AddDays(2)));
    }

    [Fact]
    public void Aceitar_ConviteExpirado_DeveSerRecusado()
    {
        var acesso = NovoAcesso();

        var excecao = Assert.Throws<RegraNegocioException>(() => acesso.Aceitar(Guid.NewGuid(), Agora.AddDays(8)));

        Assert.Equal(MensagensAcessoAnfitriao.ConviteInvalido, excecao.Message);
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
        Assert.Equal(SituacaoAcessoAnfitriao.Pendente, acesso.Situacao(reenvio));
    }

    [Fact]
    public void Reenviar_AtivoOuRevogado_DeveGerarConflito()
    {
        var ativo = NovoAcesso();
        ativo.Aceitar(Guid.NewGuid(), Agora);
        var revogado = NovoAcesso();
        revogado.Revogar(Guid.NewGuid(), Agora);

        Assert.Equal(MensagensAcessoAnfitriao.AcessoJaAtivo, Assert.Throws<ConflitoException>(() => ativo.Reenviar(Agora, Validade)).Message);
        Assert.Equal(MensagensAcessoAnfitriao.AcessoRevogado, Assert.Throws<ConflitoException>(() => revogado.Reenviar(Agora, Validade)).Message);
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

        Assert.Throws<ArgumentException>(() => TokenAcessoAnfitriao.Gerar(acesso, Guid.NewGuid(), "curto", Agora));
        var token = TokenAcessoAnfitriao.Gerar(acesso, Guid.NewGuid(), new string('a', 64), Agora);
        token.Renovar(new string('b', 64), Agora.AddDays(1));

        Assert.Equal(new string('b', 64), token.TokenHash);
        Assert.Equal(acesso.Id, token.AcessoAnfitriaoId);
        Assert.Equal(acesso.EventoId, token.EventoId);
    }

    [Fact]
    public void UsuarioAnfitriao_DeveNascerVinculadoAoEvento()
    {
        var eventoId = Guid.NewGuid();

        var usuario = Usuario.CriarAnfitriao(Guid.NewGuid(), eventoId, " Lívia ", "LIVIA@exemplo.com", "hash", Agora);

        Assert.Equal(PapelUsuario.Anfitriao, usuario.Papel);
        Assert.Equal(eventoId, usuario.EventoId);
        Assert.True(usuario.Ativo);
        Assert.Equal("livia@exemplo.com", usuario.Email);
        Assert.Throws<ArgumentException>(() => Usuario.CriarAnfitriao(Guid.NewGuid(), Guid.Empty, "Lívia", "l@e.com", "hash", Agora));
    }

    [Fact]
    public void UsuarioDono_NaoDeveTerEvento()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Renata", "renata@exemplo.com", "hash", Agora);

        Assert.Null(usuario.EventoId);
        Assert.Equal(PapelUsuario.Dono, usuario.Papel);
    }

    [Fact]
    public void ReativarAnfitriao_DeveExigirMesmoEventoEUsuarioInativo()
    {
        var eventoId = Guid.NewGuid();
        var usuario = Usuario.CriarAnfitriao(Guid.NewGuid(), eventoId, "Lívia", "livia@exemplo.com", "hash", Agora);

        Assert.Throws<RegraNegocioException>(() => usuario.ReativarAnfitriao(eventoId, "Lívia", "novo", Agora));

        usuario.Desativar();
        Assert.Throws<RegraNegocioException>(() => usuario.ReativarAnfitriao(Guid.NewGuid(), "Lívia", "novo", Agora));

        usuario.ReativarAnfitriao(eventoId, "Lívia Moraes", "novo", Agora);
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
    public void ContextoUsuario_Dono_NaoDeveRestringirEvento()
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Dono());

        Assert.Null(contexto.EventosPermitidos);
    }

    [Fact]
    public void ContextoUsuario_Anfitriao_DeveRestringirAoProprioEvento()
    {
        var eventoId = Guid.NewGuid();
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Anfitriao(eventoId));

        Assert.Equal([eventoId], contexto.EventosPermitidos);
    }

    [Fact]
    public void ContextoUsuario_AnfitriaoSemEvento_DeveSerFailClosed()
    {
        var contexto = new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Anfitriao(Guid.Empty));

        Assert.NotNull(contexto.EventosPermitidos);
        Assert.Empty(contexto.EventosPermitidos!);
    }

    [Fact]
    public void ContextoRequisicao_EscopoRsvp_NaoDeveRestringirPeloEventoDoUsuario()
    {
        var rsvp = new EscopoIsolamentoRsvp();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Anfitriao(Guid.NewGuid())),
            rsvp,
            new EscopoIsolamentoAcessoAnfitriao(),
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());
        var organizacao = Guid.NewGuid();

        rsvp.Estabelecer(organizacao, Guid.NewGuid());

        Assert.Equal(organizacao, contexto.OrganizacaoId);
        Assert.Null(contexto.EventosPermitidos);
    }

    [Fact]
    public void ContextoRequisicao_EscopoDoConvite_DeveFixarOrganizacaoEEvento()
    {
        var escopo = new EscopoIsolamentoAcessoAnfitriao();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Anonimo()),
            new EscopoIsolamentoRsvp(),
            escopo,
            new EscopoIsolamentoSistema(),
            new EscopoIsolamentoCronogramaPublico());
        var organizacao = Guid.NewGuid();
        var evento = Guid.NewGuid();

        Assert.Null(contexto.OrganizacaoId);
        escopo.Fixar(organizacao, evento);

        Assert.Equal(organizacao, contexto.OrganizacaoId);
        Assert.Equal([evento], contexto.EventosPermitidos);
        Assert.Throws<InvalidOperationException>(() => escopo.Fixar(organizacao, evento));
    }
}
