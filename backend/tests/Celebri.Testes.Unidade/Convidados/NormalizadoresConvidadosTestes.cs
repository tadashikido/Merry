using Celebri.Dominio.Convidados;

namespace Celebri.Testes.Unidade.Convidados;

public class NormalizadoresConvidadosTestes
{
    [Theory]
    [InlineData("(11) 98765-4321", "11987654321")]
    [InlineData("11 3333.4444", "1133334444")]
    [InlineData("+55 (11) 98765-4321", "+5511987654321")]
    [InlineData("  +1 212 555 0100 ", "+12125550100")]
    [InlineData("123456789012345", "123456789012345")]
    public void Telefone_Valido_DeveNormalizarParaDigitos(string entrada, string esperado)
    {
        Assert.True(NormalizadorTelefone.TentarNormalizar(entrada, out var normalizado));
        Assert.Equal(esperado, normalizado);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Telefone_Vazio_DeveSerValidoENulo(string? entrada)
    {
        Assert.True(NormalizadorTelefone.TentarNormalizar(entrada, out var normalizado));
        Assert.Null(normalizado);
    }

    [Theory]
    [InlineData("123456789")]
    [InlineData("1234567890123456")]
    [InlineData("11 98765-432a")]
    [InlineData("11+987654321")]
    [InlineData("(11) 98765/4321")]
    [InlineData("0000000000000000000000000000001")]
    public void Telefone_Invalido_DeveSerRejeitado(string entrada)
    {
        Assert.False(NormalizadorTelefone.Valido(entrada));
    }

    [Theory]
    [InlineData("  Ana   Maria  ", "Ana Maria")]
    [InlineData("Ana\tMaria\nLima", "Ana Maria Lima")]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void Texto_DeveAparaEColapsarEspacos(string? entrada, string? esperado)
    {
        Assert.Equal(esperado, NormalizadorTexto.Normalizar(entrada));
    }

    [Theory]
    [InlineData("ana@exemplo.com", true)]
    [InlineData("  ana.lima+festa@exemplo.com.br ", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData("ana@", false)]
    [InlineData("ana@exemplo", false)]
    [InlineData("ana exemplo@x.com", false)]
    public void Email_DeveValidarFormato(string? email, bool valido)
    {
        Assert.Equal(valido, ValidadorEmailConvidado.Valido(email));
    }

    [Fact]
    public void Email_AcimaDe254_DeveSerInvalido()
    {
        var email = $"{new string('a', 250)}@x.com";

        Assert.False(ValidadorEmailConvidado.Valido(email));
    }
}
