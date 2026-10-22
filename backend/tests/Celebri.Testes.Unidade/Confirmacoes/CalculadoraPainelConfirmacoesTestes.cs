using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Convidados;
using static Celebri.Testes.Unidade.Convidados.ConviteTestes;

namespace Celebri.Testes.Unidade.Confirmacoes;

public class CalculadoraPainelConfirmacoesTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2027, 5, 7);

    public static CasamentoAssessorado Casamento(int? estimados = 150, DateOnly? dataLimite = null)
    {
        return CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "Bruno", new DateOnly(2027, 5, 22), new TimeOnly(16, 30), "Igreja", "Espaço Jardim", estimados, null, dataLimite),
            Agora);
    }

    public static List<Convite> CenarioDoCriterio(Guid casamentoId)
    {
        var naoEnviado = Convite.Criar(casamentoId, Dados("Zélia", "Noiva", 1,
            Pessoa("Zélia", resposta: RespostaRsvp.Confirmado),
            Pessoa("Rui", resposta: RespostaRsvp.Confirmado),
            Pessoa("Téo", faixaEtaria: FaixaEtaria.Crianca, resposta: RespostaRsvp.Confirmado)), Agora);

        var enviado = Convite.Criar(casamentoId, Dados("Álvaro", null, 0,
            Pessoa("Álvaro", "(11) 98765-4321", resposta: RespostaRsvp.Confirmado),
            Pessoa("Bia")), Agora);
        enviado.MarcarEnviado(Agora);

        var visualizado = Convite.Criar(casamentoId, Dados("Beto", null, 2,
            Pessoa("Beto"),
            Pessoa("Lia", "(21) 99999-0000", faixaEtaria: FaixaEtaria.Crianca, resposta: RespostaRsvp.Recusado)), Agora);
        visualizado.MarcarVisualizado(Agora);

        return [naoEnviado, enviado, visualizado];
    }

    [Fact]
    public void Calcular_CenarioDoCriterioDeAceite_DeveContarConvitesEPessoas()
    {
        var casamento = Casamento();
        var convites = CenarioDoCriterio(casamento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, convites, Hoje);

        Assert.Equal(new SituacaoConvitesDto(3, 1, 1, 1, 1, 2), painel.Convites);
        Assert.Equal(new TotaisPorFaixaDto(3, 1, 4), painel.Pessoas.Confirmados);
        Assert.Equal(new TotaisPorFaixaDto(0, 1, 1), painel.Pessoas.Recusados);
        Assert.Equal(new TotaisPorFaixaDto(2, 0, 2), painel.Pessoas.Pendentes);
        Assert.Equal(7, painel.Pessoas.Pessoas);
        Assert.Equal(150, painel.ConvidadosEstimados);
        Assert.False(painel.CasamentoArquivado);
    }

    [Fact]
    public void Calcular_PessoasDevemSerIguaisAosTotaisDaLista()
    {
        var casamento = Casamento();
        var convites = CenarioDoCriterio(casamento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, convites, Hoje);
        var totaisLista = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));

        Assert.Equal(totaisLista, painel.Pessoas);
        Assert.Equal(painel.Convites.Total, painel.Convites.NaoEnviados + painel.Convites.Enviados + painel.Convites.Visualizados);
        Assert.Equal(painel.Convites.Total, painel.Convites.Respondidos + painel.Convites.AguardandoResposta);
    }

    [Fact]
    public void Calcular_Pendentes_DeveListarConvitesComPessoaPendenteOrdenadosComPrimeiroTelefone()
    {
        var casamento = Casamento();
        var convites = CenarioDoCriterio(casamento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, convites, Hoje);

        Assert.Equal(["Álvaro", "Beto"], painel.Pendentes.Select(pendente => pendente.Nome));
        var alvaro = painel.Pendentes[0];
        Assert.Equal("Enviado", alvaro.StatusEnvio);
        Assert.Equal("11987654321", alvaro.Telefone);
        Assert.Equal(["Bia"], alvaro.PessoasPendentes);
        Assert.Equal(2, alvaro.TotalPessoas);
        var beto = painel.Pendentes[1];
        Assert.Equal("Visualizado", beto.StatusEnvio);
        Assert.Equal("21999990000", beto.Telefone);
        Assert.Equal(["Beto"], beto.PessoasPendentes);
    }

    [Fact]
    public void Calcular_PendenteSemTelefone_DeveDevolverTelefoneNulo()
    {
        var casamento = Casamento();
        var convite = Convite.Criar(casamento.Id, Dados("Sem fone", null, 0, Pessoa("Caio")), Agora);

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, [convite], Hoje);

        Assert.Null(Assert.Single(painel.Pendentes).Telefone);
    }

    [Theory]
    [InlineData(2027, 5, 7, 5, true)]
    [InlineData(2027, 5, 12, 0, true)]
    [InlineData(2027, 5, 13, -1, false)]
    public void Calcular_Prazo_DeveUsarDataLimiteEfetivaEHoje(int ano, int mes, int dia, int diasEsperados, bool aceita)
    {
        var casamento = Casamento();

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, [], new DateOnly(ano, mes, dia));

        Assert.Equal(new DateOnly(2027, 5, 12), painel.Prazo.DataLimite);
        Assert.Equal(diasEsperados, painel.Prazo.DiasRestantes);
        Assert.Equal(aceita, painel.Prazo.AceitaRespostas);
    }

    [Fact]
    public void Calcular_PrazoConfigurado_DevePrevalecerSobreOPadrao()
    {
        var casamento = Casamento(dataLimite: new DateOnly(2027, 5, 1));

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, [], Hoje);

        Assert.Equal(new DateOnly(2027, 5, 1), painel.Prazo.DataLimite);
        Assert.Equal(-6, painel.Prazo.DiasRestantes);
        Assert.False(painel.Prazo.AceitaRespostas);
    }

    [Fact]
    public void Calcular_CasamentoArquivado_DeveEncerrarPrazoEMarcarArquivado()
    {
        var casamento = Casamento(estimados: null);
        casamento.Arquivar(Agora);

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, [], Hoje);

        Assert.True(painel.CasamentoArquivado);
        Assert.False(painel.Prazo.AceitaRespostas);
        Assert.Null(painel.ConvidadosEstimados);
    }

    [Fact]
    public void Calcular_SemConvites_DeveZerarTudo()
    {
        var casamento = Casamento();

        var painel = CalculadoraPainelConfirmacoes.Calcular(casamento, [], Hoje);

        Assert.Equal(new SituacaoConvitesDto(0, 0, 0, 0, 0, 0), painel.Convites);
        Assert.Equal(0, painel.Pessoas.Pessoas);
        Assert.Empty(painel.Pendentes);
    }

    [Fact]
    public void Respondido_ConviteTodoRespondido_DeveSerVerdadeiroEAguardandoFalso()
    {
        var convite = Convite.Criar(Guid.NewGuid(), Dados("Xavier", null, 0, Pessoa("Ana", resposta: RespostaRsvp.Recusado)), Agora);

        Assert.True(CalculadoraPainelConfirmacoes.Respondido(convite));
        Assert.False(CalculadoraPainelConfirmacoes.AguardandoResposta(convite));
    }
}
