using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Impersonacao;

namespace Celebri.Testes.Unidade.Impersonacao;

public class SessaoImpersonacaoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Validade = TimeSpan.FromMinutes(15);

    [Fact]
    public void Criar_DeveNormalizarEDefinirExpiracao()
    {
        var sessao = SessaoImpersonacao.Criar(Guid.NewGuid(), Guid.NewGuid(), "  investigar chamado  ", Agora, Validade);

        Assert.Equal("investigar chamado", sessao.Motivo);
        Assert.Equal(Agora.Add(Validade), sessao.ExpiraEm);
        Assert.True(sessao.EstaAtiva(Agora));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_MotivoVazio_DeveLancarRegraNegocio(string motivo)
    {
        Assert.Throws<RegraNegocioException>(() => SessaoImpersonacao.Criar(Guid.NewGuid(), Guid.NewGuid(), motivo, Agora, Validade));
    }

    [Fact]
    public void Criar_SemOperadorOuOrganizacao_DeveLancarRegraNegocio()
    {
        Assert.Throws<RegraNegocioException>(() => SessaoImpersonacao.Criar(Guid.Empty, Guid.NewGuid(), "motivo", Agora, Validade));
        Assert.Throws<RegraNegocioException>(() => SessaoImpersonacao.Criar(Guid.NewGuid(), Guid.Empty, "motivo", Agora, Validade));
    }

    [Fact]
    public void EstaAtiva_AposExpirar_DeveSerFalso()
    {
        var sessao = SessaoImpersonacao.Criar(Guid.NewGuid(), Guid.NewGuid(), "motivo", Agora, Validade);

        Assert.False(sessao.EstaAtiva(Agora.Add(Validade).AddSeconds(1)));
    }

    [Fact]
    public void Encerrar_DeveInvalidarMesmoDentroDaValidade()
    {
        var sessao = SessaoImpersonacao.Criar(Guid.NewGuid(), Guid.NewGuid(), "motivo", Agora, Validade);

        sessao.Encerrar(Agora.AddMinutes(1));

        Assert.NotNull(sessao.EncerradaEm);
        Assert.False(sessao.EstaAtiva(Agora.AddMinutes(2)));
    }
}
