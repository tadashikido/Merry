using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Rsvp;

public class PrazoRsvpEventoTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 1, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataEvento = new(2027, 5, 22);

    private static DadosEvento Dados(DateOnly? dataLimite = null)
    {
        return new DadosEvento("Ana", "Bruno", DataEvento, null, null, null, null, null, dataLimite);
    }

    [Fact]
    public void DataLimiteEfetiva_SemConfiguracao_DeveSerDezDiasAntes()
    {
        var evento = Evento.Criar(Dados(), Agora);

        Assert.Null(evento.DataLimiteRsvp);
        Assert.Equal(new DateOnly(2027, 5, 12), evento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimiteEfetiva_Configurada_DeveUsarAConfigurada()
    {
        var evento = Evento.Criar(Dados(new DateOnly(2027, 5, 1)), Agora);

        Assert.Equal(new DateOnly(2027, 5, 1), evento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimite_IgualADataDoEvento_DeveSerAceita()
    {
        var evento = Evento.Criar(Dados(DataEvento), Agora);

        Assert.Equal(DataEvento, evento.DataLimiteRsvpEfetiva());
    }

    [Fact]
    public void DataLimite_PosteriorAoEvento_DeveSerRejeitada()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Evento.Criar(Dados(DataEvento.AddDays(1)), Agora));

        Assert.Equal(MensagensEvento.DataLimiteRsvpInvalida, excecao.Message);
    }

    [Fact]
    public void DataLimite_AntesDaDataMinima_DeveSerRejeitada()
    {
        Assert.Throws<RegraNegocioException>(() => Evento.Criar(Dados(new DateOnly(1999, 12, 31)), Agora));
    }

    [Theory]
    [InlineData(2027, 5, 11, true)]
    [InlineData(2027, 5, 12, true)]
    [InlineData(2027, 5, 13, false)]
    public void AceitaResposta_DeveValerAteOFimDoDiaLimite(int ano, int mes, int dia, bool esperado)
    {
        var evento = Evento.Criar(Dados(), Agora);

        Assert.Equal(esperado, evento.AceitaRespostaRsvp(new DateOnly(ano, mes, dia)));
    }

    [Fact]
    public void AceitaResposta_EventoArquivado_DeveRecusar()
    {
        var evento = Evento.Criar(Dados(), Agora);
        evento.Arquivar(Agora);

        Assert.False(evento.AceitaRespostaRsvp(new DateOnly(2027, 1, 11)));
    }

    [Fact]
    public void Request_DataLimitePosteriorAoEvento_DeveGerarErroDeValidacaoNoCampo()
    {
        var request = new SalvarEventoRequest("Ana", "Bruno", DataEvento, null, null, null, null, null, DataEvento.AddDays(3), TipoEvento.Casamento);

        var erros = request.Validate(new ValidationContext(request)).ToList();

        var erro = Assert.Single(erros);
        Assert.Equal(MensagensEvento.DataLimiteRsvpInvalida, erro.ErrorMessage);
        Assert.Contains(nameof(SalvarEventoRequest.DataLimiteRsvp), erro.MemberNames);
        Assert.Equal(DataEvento.AddDays(3), request.ParaDados().DataLimiteRsvp);
    }

    [Fact]
    public void ParaDto_DeveExporDataLimiteConfiguradaEEfetiva()
    {
        var evento = Evento.Criar(Dados(), Agora);

        var dto = EventoService.ParaDto(evento, new DateOnly(2027, 1, 10));

        Assert.Null(dto.DataLimiteRsvp);
        Assert.Equal(new DateOnly(2027, 5, 12), dto.DataLimiteRsvpEfetiva);
    }
}
