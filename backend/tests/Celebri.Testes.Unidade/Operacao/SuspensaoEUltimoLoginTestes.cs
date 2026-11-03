using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Testes.Unidade.Operacao;

public class SuspensaoEUltimoLoginTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Suspender_DeveMarcarComoSuspensa()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);

        organizacao.Suspender(Agora);

        Assert.True(organizacao.EstaSuspensa);
        Assert.Equal(Agora, organizacao.SuspensaEm);
    }

    [Fact]
    public void Suspender_Idempotente_MantemOPrimeiroMomento()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);

        organizacao.Suspender(Agora);
        organizacao.Suspender(Agora.AddHours(1));

        Assert.Equal(Agora, organizacao.SuspensaEm);
    }

    [Fact]
    public void Reativar_DeveLimparSuspensao()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);
        organizacao.Suspender(Agora);

        organizacao.Reativar();

        Assert.False(organizacao.EstaSuspensa);
        Assert.Null(organizacao.SuspensaEm);
    }

    [Fact]
    public void RegistrarUltimoLogin_DeveGravarOMomento()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Ana", "ana@exemplo.com", "hash", Agora);

        usuario.RegistrarUltimoLogin(Agora);

        Assert.Equal(Agora, usuario.UltimoLoginEm);
    }
}
