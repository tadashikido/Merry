using System.Text;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Dominio.Excecoes;
using static Celebri.Testes.Unidade.Convidados.Importacao.PlanilhasTeste;

namespace Celebri.Testes.Unidade.Convidados.Importacao;

public class LeitorCsvTestes
{
    [Fact]
    public void Ler_ExcelWindows1252ComPontoEVirgula_DeveDecodificarAcentos()
    {
        var planilha = LeitorCsv.Ler(Fixture("excel-windows1252-ponto-e-virgula.csv"));

        Assert.Equal(["Família", "Nome", "Celular", "Idade", "E-mail"], planilha.Cabecalho);
        Assert.Equal(3, planilha.Linhas.Count);
        Assert.Equal("João Conceição", planilha.Linhas[0].Celulas[1]);
        Assert.Equal("Criança", planilha.Linhas[1].Celulas[3]);
        Assert.Equal("Irene Araújo", planilha.Linhas[2].Celulas[1]);
        Assert.Equal([2, 3, 4], planilha.Linhas.Select(linha => linha.Numero));
    }

    [Fact]
    public void Ler_Utf8ComBomEVirgula_DeveRespeitarAspasSeparadorEAspasDuplicadas()
    {
        var planilha = LeitorCsv.Ler(Fixture("google-utf8-bom-virgula.csv"));

        Assert.Equal("Convite", planilha.Cabecalho[0]);
        Assert.Equal("Família da noiva, lado materno", planilha.Linhas[0].Celulas[3]);
        Assert.Equal("Irene \"Nena\" Araújo", planilha.Linhas[2].Celulas[1]);
        Assert.Equal(string.Empty, planilha.Linhas[2].Celulas[3]);
    }

    [Fact]
    public void Ler_QuebraDeLinhaEntreAspasELinhaVazia_DeveManterCampoENumerarPelaLinhaFisica()
    {
        var planilha = LeitorCsv.Ler(Fixture("utf8-sem-bom-quebra-em-aspas.csv"));

        Assert.Equal(2, planilha.Linhas.Count);
        Assert.Equal("Ana\nBeatriz", planilha.Linhas[0].Celulas[0]);
        Assert.Equal(2, planilha.Linhas[0].Numero);
        Assert.Equal(5, planilha.Linhas[1].Numero);
    }

    [Fact]
    public void Ler_ArquivoBinarioComExtensaoCsv_DeveRecusarComoNaoTexto()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler(Fixture("imagem-renomeada.csv")));

        Assert.Equal(MensagensImportacaoConvidados.ArquivoNaoTexto, excecao.Message);
    }

    [Fact]
    public void Ler_CaractereDeControle_DeveRecusarComoNaoTexto()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler([0x4E, 0x6F, 0x6D, 0x65, 0x01, 0x0A, 0x41, 0x6E, 0x61]));

        Assert.Equal(MensagensImportacaoConvidados.ArquivoNaoTexto, excecao.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Nome;Telefone\n")]
    [InlineData("Nome;Telefone\n\n;\n  ;  \n")]
    public void Ler_SemLinhasDeDados_DeveRecusarComoVazio(string conteudo)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler(Utf8(conteudo)));

        Assert.Equal(MensagensImportacaoConvidados.ArquivoVazio, excecao.Message);
    }

    [Fact]
    public void Ler_CincoMilLinhas_DeveAceitar()
    {
        var planilha = LeitorCsv.Ler(Utf8(Linhas(LimitesImportacao.LinhasMaximas)));

        Assert.Equal(LimitesImportacao.LinhasMaximas, planilha.Linhas.Count);
    }

    [Fact]
    public void Ler_MaisDeCincoMilLinhas_DeveRecusar()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler(Utf8(Linhas(LimitesImportacao.LinhasMaximas + 1))));

        Assert.Equal(MensagensImportacaoConvidados.LinhasDemais, excecao.Message);
    }

    [Fact]
    public void Ler_MaisDeCinquentaColunas_DeveRecusar()
    {
        var cabecalho = string.Join(';', Enumerable.Range(1, LimitesImportacao.ColunasMaximas + 1).Select(indice => $"C{indice}"));

        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler(Utf8($"{cabecalho}\nAna\n")));

        Assert.Equal(MensagensImportacaoConvidados.ColunasDemais, excecao.Message);
    }

    [Fact]
    public void Ler_CampoAcimaDeMilCaracteres_DeveRecusarInformandoALinhaSemOConteudo()
    {
        var longo = new string('x', LimitesImportacao.TamanhoMaximoCampo + 1);

        var excecao = Assert.Throws<RegraNegocioException>(() => LeitorCsv.Ler(Utf8($"Nome\nAna\n{longo}\n")));

        Assert.Equal(MensagensImportacaoConvidados.CampoLongoDemais(3), excecao.Message);
        Assert.DoesNotContain("xxx", excecao.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Nome;Telefone,Fixo\nAna", ';')]
    [InlineData("Nome,Telefone,Grupo\nAna", ',')]
    [InlineData("Nome\nAna", ';')]
    [InlineData("\"Nome;Sobrenome\",Telefone,Grupo\nAna", ',')]
    public void DetectarSeparador_DeveUsarOMaisFrequenteForaDeAspas(string texto, char esperado)
    {
        Assert.Equal(esperado, LeitorCsv.DetectarSeparador(texto));
    }

    [Fact]
    public void Decodificar_Utf8SemBom_DevePreferirUtf8()
    {
        var texto = LeitorCsv.Decodificar(Encoding.UTF8.GetBytes("Nome\nJoão"));

        Assert.Equal("Nome\nJoão", texto);
    }
}
