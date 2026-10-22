using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Confirmacoes;

namespace Casamento.Testes.Unidade.Confirmacoes;

public class ExportarBuffetRequestTestes
{
    private static List<ValidationResult> Validar(ExportarBuffetRequest request)
    {
        var resultados = new List<ValidationResult>();
        Validator.TryValidateObject(request, new ValidationContext(request), resultados, validateAllProperties: true);
        return resultados;
    }

    [Theory]
    [InlineData("csv", FormatoExportacaoBuffet.Csv)]
    [InlineData("CSV", FormatoExportacaoBuffet.Csv)]
    [InlineData("impressao", FormatoExportacaoBuffet.Impressao)]
    [InlineData("Impressao", FormatoExportacaoBuffet.Impressao)]
    public void Formato_Valido_DeveSerAceito(string formato, FormatoExportacaoBuffet esperado)
    {
        var request = new ExportarBuffetRequest { Formato = formato };

        Assert.Empty(Validar(request));
        Assert.Equal(esperado, request.ParaFormato());
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("pdf")]
    [InlineData("csv ")]
    [InlineData("impressão")]
    public void Formato_Invalido_DeveGerarErro(string formato)
    {
        var request = new ExportarBuffetRequest { Formato = formato };

        var erro = Assert.Single(Validar(request));
        Assert.Equal(MensagensConfirmacoes.FormatoInvalido, erro.ErrorMessage);
        Assert.Throws<ArgumentException>(() => request.ParaFormato());
    }

    [Fact]
    public void Formato_Ausente_DeveSerObrigatorio()
    {
        var erro = Assert.Single(Validar(new ExportarBuffetRequest()));

        Assert.Equal(MensagensConfirmacoes.FormatoObrigatorio, erro.ErrorMessage);
    }

    [Fact]
    public void Formato_Longo_DeveSerRejeitado()
    {
        var resultados = Validar(new ExportarBuffetRequest { Formato = new string('c', 21) });

        Assert.Contains(resultados, resultado => resultado.ErrorMessage == MensagensConfirmacoes.FormatoInvalido);
    }
}
