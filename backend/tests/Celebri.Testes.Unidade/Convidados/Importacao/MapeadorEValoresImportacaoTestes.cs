using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Convidados.Importacao;

public class MapeadorEValoresImportacaoTestes
{
    [Fact]
    public void Mapear_SinonimosComAcentoECaixa_DeveReconhecerTodasAsColunas()
    {
        var mapeamento = MapeadorColunasImportacao.Mapear(
            ["Convite/Família", " LADO ", "Nome completo", "WhatsApp", "E-mail", "Faixa Etária", "Acompanhantes", "Presença"]);

        Assert.Equal(
            [
                ColunaImportacao.Convite, ColunaImportacao.Grupo, ColunaImportacao.Nome, ColunaImportacao.Telefone,
                ColunaImportacao.Email, ColunaImportacao.FaixaEtaria, ColunaImportacao.Acompanhantes, ColunaImportacao.Resposta,
            ],
            mapeamento.Reconhecidas);
        Assert.Empty(mapeamento.Ignoradas);
        Assert.Equal(2, mapeamento.Indices[ColunaImportacao.Nome]);
    }

    [Fact]
    public void Mapear_ColunasDesconhecidasERepetidas_DeveIgnorarManterAPrimeiraETruncarNomeLongo()
    {
        var longa = new string('m', 80);

        var mapeamento = MapeadorColunasImportacao.Mapear(["﻿Nome", "Mesa", "Nome", "", longa]);

        Assert.Equal(0, mapeamento.Indices[ColunaImportacao.Nome]);
        Assert.Equal(["Mesa", "Nome", new string('m', LimitesImportacao.TamanhoMaximoNomeColunaIgnorada)], mapeamento.Ignoradas);
    }

    [Fact]
    public void Mapear_SemColunaNome_DeveRecusar()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => MapeadorColunasImportacao.Mapear(["Convite", "Telefone"]));

        Assert.Equal(MensagensImportacaoConvidados.ColunaNomeAusente, excecao.Message);
    }

    [Fact]
    public void Aplicar_LinhaCurtaECelulasEmBranco_DeveResultarEmNulos()
    {
        var mapeamento = MapeadorColunasImportacao.Mapear(["Nome", "Telefone", "Grupo"]);

        var linha = MapeadorColunasImportacao.Aplicar(mapeamento, new LinhaPlanilha(7, [" Ana ", "   "]));

        Assert.Equal(7, linha.Numero);
        Assert.Equal("Ana", linha.Valor(ColunaImportacao.Nome));
        Assert.Null(linha.Valor(ColunaImportacao.Telefone));
        Assert.Null(linha.Valor(ColunaImportacao.Grupo));
        Assert.Null(linha.Valor(ColunaImportacao.Email));
    }

    [Theory]
    [InlineData("  MARIA  da Silva ", "maria da silva")]
    [InlineData("Família Conceição", "familia conceicao")]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void ChaveTexto_DeveIgnorarAcentoCaixaEEspacos(string? valor, string? esperado)
    {
        Assert.Equal(esperado, ChaveComparacaoConvidado.Texto(valor));
    }

    [Theory]
    [InlineData("(11) 98765-4321", "11987654321")]
    [InlineData("+55 (11) 98765-4321", "11987654321")]
    [InlineData("5511987654321", "11987654321")]
    [InlineData("+1 415 555 0100", "14155550100")]
    [InlineData("123", null)]
    [InlineData("", null)]
    public void ChaveTelefone_DeveNormalizarERemoverDdiBrasil(string valor, string? esperado)
    {
        Assert.Equal(esperado, ChaveComparacaoConvidado.Telefone(valor));
    }

    [Theory]
    [InlineData(null, FaixaEtaria.Adulto)]
    [InlineData("A", FaixaEtaria.Adulto)]
    [InlineData("adulta", FaixaEtaria.Adulto)]
    [InlineData("Criança", FaixaEtaria.Crianca)]
    [InlineData("CRIANCA", FaixaEtaria.Crianca)]
    [InlineData("c", FaixaEtaria.Crianca)]
    public void TentarFaixaEtaria_ValoresPtBr_DeveInterpretar(string? valor, FaixaEtaria esperada)
    {
        Assert.True(InterpretadorValoresImportacao.TentarFaixaEtaria(valor, out var faixa));
        Assert.Equal(esperada, faixa);
    }

    [Fact]
    public void TentarFaixaEtaria_ValorDesconhecido_DeveFalhar()
    {
        Assert.False(InterpretadorValoresImportacao.TentarFaixaEtaria("bebê", out _));
    }

    [Theory]
    [InlineData(null, RespostaRsvp.Pendente)]
    [InlineData("pendente", RespostaRsvp.Pendente)]
    [InlineData("Sim", RespostaRsvp.Confirmado)]
    [InlineData("Confirmada", RespostaRsvp.Confirmado)]
    [InlineData("Não", RespostaRsvp.Recusado)]
    [InlineData("recusado", RespostaRsvp.Recusado)]
    public void TentarResposta_ValoresPtBr_DeveInterpretar(string? valor, RespostaRsvp esperada)
    {
        Assert.True(InterpretadorValoresImportacao.TentarResposta(valor, out var resposta));
        Assert.Equal(esperada, resposta);
    }

    [Theory]
    [InlineData(null, true, 0)]
    [InlineData("3", true, 3)]
    [InlineData(" 10 ", true, 10)]
    [InlineData("11", false, 11)]
    [InlineData("-1", false, 0)]
    [InlineData("dois", false, 0)]
    public void TentarAcompanhantes_DeveAceitarSomenteDeZeroADez(string? valor, bool valido, int esperado)
    {
        Assert.Equal(valido, InterpretadorValoresImportacao.TentarAcompanhantes(valor, out var quantidade));
        if (valido)
        {
            Assert.Equal(esperado, quantidade);
        }
    }
}
