using Casamento.Dominio.Autenticacao;

namespace Casamento.Testes.Unidade.Autenticacao;

public class TokensDominioTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 28, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void RefreshToken_Emitido_DeveEstarAtivoAteExpirar()
    {
        var token = RefreshToken.Emitir(Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), Agora, Agora.AddDays(14));

        Assert.True(token.EstaAtivo(Agora));
        Assert.False(token.EstaAtivo(Agora.AddDays(14)));
    }

    [Fact]
    public void RefreshToken_Substituido_DeveFicarUtilizadoEInativo()
    {
        var token = RefreshToken.Emitir(Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), Agora, Agora.AddDays(14));

        token.Substituir(Agora);
        token.Substituir(Agora.AddMinutes(5));

        Assert.True(token.FoiUtilizado);
        Assert.False(token.EstaAtivo(Agora));
        Assert.Equal(Agora, token.SubstituidoEm);
    }

    [Fact]
    public void RefreshToken_Revogado_DeveFicarInativo()
    {
        var token = RefreshToken.Emitir(Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), Agora, Agora.AddDays(14));

        token.Revogar(Agora);

        Assert.False(token.EstaAtivo(Agora));
    }

    [Fact]
    public void TokenRedefinicao_DeveSerValidoAteExpirarOuSerUsado()
    {
        var token = TokenRedefinicaoSenha.Emitir(Guid.NewGuid(), new string('b', 64), Agora, Agora.AddMinutes(60));

        Assert.True(token.EstaValido(Agora.AddMinutes(59)));
        Assert.False(token.EstaValido(Agora.AddMinutes(60)));

        token.MarcarUsado(Agora);
        Assert.False(token.EstaValido(Agora));
    }

    [Fact]
    public void TokenRedefinicao_Invalidado_NaoDeveSerValido()
    {
        var token = TokenRedefinicaoSenha.Emitir(Guid.NewGuid(), new string('b', 64), Agora, Agora.AddMinutes(60));

        token.Invalidar(Agora);

        Assert.False(token.EstaValido(Agora));
    }
}
