using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Usuarios;

namespace Casamento.Testes.Unidade.Autenticacao;

public class UsuarioTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 28, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void CriarDono_DeveNormalizarEmailENomeEAtribuirPapelDono()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "  Ana Souza ", "  Ana@Exemplo.COM ", "hash", Agora);

        Assert.Equal("Ana Souza", usuario.Nome);
        Assert.Equal("ana@exemplo.com", usuario.Email);
        Assert.Equal(PapelUsuario.Dono, usuario.Papel);
        Assert.True(usuario.Ativo);
        Assert.Equal(0, usuario.FalhasLoginConsecutivas);
    }

    [Theory]
    [InlineData("A")]
    [InlineData("   ")]
    public void CriarDono_ComNomeInvalido_DeveLancarRegraNegocio(string nome)
    {
        Assert.Throws<RegraNegocioException>(() => Usuario.CriarDono(Guid.NewGuid(), nome, "ana@exemplo.com", "hash", Agora));
    }

    [Fact]
    public void RegistrarFalhaLogin_NaQuintaFalha_DeveBloquearPorQuinzeMinutos()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Ana", "ana@exemplo.com", "hash", Agora);

        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas - 1; tentativa++)
        {
            usuario.RegistrarFalhaLogin(Agora);
        }

        Assert.False(usuario.EstaBloqueado(Agora));
        usuario.RegistrarFalhaLogin(Agora);
        Assert.True(usuario.EstaBloqueado(Agora));
        Assert.True(usuario.EstaBloqueado(Agora.AddMinutes(14)));
        Assert.False(usuario.EstaBloqueado(Agora.AddMinutes(15)));
    }

    [Fact]
    public void RegistrarLoginBemSucedido_DeveZerarFalhas()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Ana", "ana@exemplo.com", "hash", Agora);
        usuario.RegistrarFalhaLogin(Agora);
        usuario.RegistrarFalhaLogin(Agora);

        usuario.RegistrarLoginBemSucedido();

        Assert.Equal(0, usuario.FalhasLoginConsecutivas);
    }

    [Fact]
    public void AlterarSenha_DeveRemoverBloqueioERegistrarData()
    {
        var usuario = Usuario.CriarDono(Guid.NewGuid(), "Ana", "ana@exemplo.com", "hash", Agora);
        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas; tentativa++)
        {
            usuario.RegistrarFalhaLogin(Agora);
        }

        usuario.AlterarSenha("novo-hash", Agora);

        Assert.False(usuario.EstaBloqueado(Agora));
        Assert.Equal("novo-hash", usuario.SenhaHash);
        Assert.Equal(Agora, usuario.SenhaAlteradaEm);
    }
}
