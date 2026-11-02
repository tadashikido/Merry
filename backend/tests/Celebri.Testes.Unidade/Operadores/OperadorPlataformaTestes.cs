using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Operadores;
using Celebri.Dominio.Usuarios;

namespace Celebri.Testes.Unidade.Operadores;

public class OperadorPlataformaTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 28, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Criar_DeveNormalizarEmailEMarcarAtivo()
    {
        var operador = OperadorPlataforma.Criar("  Equipe Celebri  ", "  OP@Exemplo.com ", "hash", Agora);

        Assert.Equal("op@exemplo.com", operador.Email);
        Assert.Equal("Equipe Celebri", operador.Nome);
        Assert.True(operador.Ativo);
        Assert.Equal(0, operador.FalhasLoginConsecutivas);
        Assert.Null(operador.BloqueadoAte);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_EmailVazio_DeveLancarRegraNegocio(string email)
    {
        Assert.Throws<RegraNegocioException>(() => OperadorPlataforma.Criar("Equipe", email, "hash", Agora));
    }

    [Fact]
    public void Criar_SenhaHashVazia_DeveLancarRegraNegocio()
    {
        Assert.Throws<RegraNegocioException>(() => OperadorPlataforma.Criar("Equipe", "op@exemplo.com", "  ", Agora));
    }

    [Fact]
    public void RegistrarFalhaLogin_AoAtingirOLimite_DeveBloquearEZerarContador()
    {
        var operador = OperadorPlataforma.Criar("Equipe", "op@exemplo.com", "hash", Agora);

        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas; tentativa++)
        {
            operador.RegistrarFalhaLogin(Agora);
        }

        Assert.True(operador.EstaBloqueado(Agora));
        Assert.Equal(0, operador.FalhasLoginConsecutivas);
        Assert.False(operador.EstaBloqueado(Agora.Add(PoliticaBloqueio.DuracaoBloqueio).AddMinutes(1)));
    }

    [Fact]
    public void RegistrarLoginBemSucedido_DeveLimparFalhasEBloqueio()
    {
        var operador = OperadorPlataforma.Criar("Equipe", "op@exemplo.com", "hash", Agora);
        for (var tentativa = 0; tentativa < PoliticaBloqueio.FalhasPermitidas; tentativa++)
        {
            operador.RegistrarFalhaLogin(Agora);
        }

        operador.RegistrarLoginBemSucedido();

        Assert.False(operador.EstaBloqueado(Agora));
        Assert.Equal(0, operador.FalhasLoginConsecutivas);
        Assert.Null(operador.BloqueadoAte);
    }

    [Fact]
    public void AlterarSenha_DeveTrocarHashERegistrarMomento()
    {
        var operador = OperadorPlataforma.Criar("Equipe", "op@exemplo.com", "hash-antigo", Agora);

        operador.AlterarSenha("hash-novo", Agora);

        Assert.Equal("hash-novo", operador.SenhaHash);
        Assert.Equal(Agora, operador.SenhaAlteradaEm);
    }
}
