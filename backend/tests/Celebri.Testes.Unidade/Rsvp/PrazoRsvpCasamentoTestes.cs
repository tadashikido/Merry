using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Casamentos;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Rsvp;

public class PrazoRsvpCasamentoTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 1, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataCasamento = new(2027, 5, 22);

    private static DadosCasamento Dados(DateOnly? dataLimite = null)
    {
        return new DadosCasamento("Ana", "Bruno", DataCasamento, null, null, null, null, null, dataLimite);
    }

    [Fact]
    public void DataLimiteEfetiva_SemConfiguracao_DeveSerDezDiasAntes()
    {
        var casamento = CasamentoAssessorado.Criar(Dados(), Agora);

        Assert.Null(casamento.DataLimiteRsvp);
        Assert.Equal(new DateOnly(2027, 5, 12), casamento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimiteEfetiva_Configurada_DeveUsarAConfigurada()
    {
        var casamento = CasamentoAssessorado.Criar(Dados(new DateOnly(2027, 5, 1)), Agora);

        Assert.Equal(new DateOnly(2027, 5, 1), casamento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimite_IgualADataDoCasamento_DeveSerAceita()
    {
        var casamento = CasamentoAssessorado.Criar(Dados(DataCasamento), Agora);

        Assert.Equal(DataCasamento, casamento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimite_PosteriorAoCasamento_DeveSerRejeitada()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => CasamentoAssessorado.Criar(Dados(DataCasamento.AddDays(1)), Agora));

        Assert.Equal(MensagensCasamento.DataLimiteRsvpInvalida, excecao.Message);
    }

    [Fact]
    public void DataLimite_AntesDaDataMinima_DeveSerRejeitada()
    {
        Assert.Throws<RegraNegocioException>(() => CasamentoAssessorado.Criar(Dados(new DateOnly(1999, 12, 31)), Agora));
    }

    [Theory]
    [InlineData(2027, 5, 11, true)]
    [InlineData(2027, 5, 12, true)]
    [InlineData(2027, 5, 13, false)]
    public void AceitaResposta_DeveValerAteOFimDoDiaLimite(int ano, int mes, int dia, bool esperado)
    {
        var casamento = CasamentoAssessorado.Criar(Dados(), Agora);

        Assert.Equal(esperado, casamento.AceitaRespostaRsvp(new DateOnly(ano, mes, dia)));
    }

    [Fact]
    public void AceitaResposta_CasamentoArquivado_DeveRecusar()
    {
        var casamento = CasamentoAssessorado.Criar(Dados(), Agora);
        casamento.Arquivar(Agora);

        Assert.False(casamento.AceitaRespostaRsvp(new DateOnly(2027, 1, 11)));
    }

    [Fact]
    public void Request_DataLimitePosteriorAoCasamento_DeveGerarErroDeValidacaoNoCampo()
    {
        var request = new SalvarCasamentoRequest("Ana", "Bruno", DataCasamento, null, null, null, null, null, DataCasamento.AddDays(3));

        var erros = request.Validate(new ValidationContext(request)).ToList();

        var erro = Assert.Single(erros);
        Assert.Equal(MensagensCasamento.DataLimiteRsvpInvalida, erro.ErrorMessage);
        Assert.Contains(nameof(SalvarCasamentoRequest.DataLimiteRsvp), erro.MemberNames);
        Assert.Equal(DataCasamento.AddDays(3), request.ParaDados().DataLimiteRsvp);
    }

    [Fact]
    public void ParaDto_DeveExporDataLimiteConfiguradaEEfetiva()
    {
        var casamento = CasamentoAssessorado.Criar(Dados(), Agora);

        var dto = CasamentoService.ParaDto(casamento, new DateOnly(2027, 1, 10));

        Assert.Null(dto.DataLimiteRsvp);
        Assert.Equal(new DateOnly(2027, 5, 12), dto.DataLimiteRsvpEfetiva);
    }
}
