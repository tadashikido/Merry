using Casamento.Dominio.Usuarios;

namespace Casamento.Testes.Unidade.Autenticacao;

public class PoliticaSenhaTestes
{
    [Theory]
    [InlineData("senhaForte1")]
    [InlineData("çãoáéíóú12")]
    [InlineData("1234567890a")]
    public void Validar_SenhaQueAtendeAPolitica_DeveRetornarNulo(string senha)
    {
        Assert.Null(PoliticaSenha.Validar(senha, "ana@exemplo.com"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("curta1")]
    [InlineData("somenteletras")]
    [InlineData("1234567890")]
    public void Validar_SenhaFraca_DeveRetornarMensagemDeSenhaFraca(string senha)
    {
        Assert.Equal(PoliticaSenha.MensagemSenhaFraca, PoliticaSenha.Validar(senha));
    }

    [Fact]
    public void Validar_SenhaMaiorQue128_DeveRetornarMensagemDeTamanho()
    {
        Assert.Equal(PoliticaSenha.MensagemSenhaLonga, PoliticaSenha.Validar(new string('a', 128) + "1"));
    }

    [Fact]
    public void Validar_SenhaIgualAoEmail_DeveRejeitar()
    {
        Assert.Equal(PoliticaSenha.MensagemSenhaIgualEmail, PoliticaSenha.Validar("Ana1@exemplo.com", "ana1@exemplo.com"));
    }
}
