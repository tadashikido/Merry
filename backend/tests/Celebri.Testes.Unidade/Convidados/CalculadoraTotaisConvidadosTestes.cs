using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.Convidados;
using static Celebri.Testes.Unidade.Convidados.ConviteTestes;

namespace Celebri.Testes.Unidade.Convidados;

public class CalculadoraTotaisConvidadosTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid CasamentoId = Guid.NewGuid();

    [Fact]
    public void Calcular_CenarioDoCriterioDeAceite_DeveSomarPorRespostaEFaixa()
    {
        var convites = new[]
        {
            Convite.Criar(CasamentoId, Dados("Zélia", null, 1,
                Pessoa("Zélia", resposta: RespostaRsvp.Confirmado),
                Pessoa("Rui", resposta: RespostaRsvp.Confirmado),
                Pessoa("Téo", faixaEtaria: FaixaEtaria.Crianca, resposta: RespostaRsvp.Confirmado)), Agora),
            Convite.Criar(CasamentoId, Dados("Álvaro", null, 0,
                Pessoa("Álvaro", resposta: RespostaRsvp.Confirmado),
                Pessoa("Bia")), Agora),
            Convite.Criar(CasamentoId, Dados("Beto", null, 2,
                Pessoa("Beto"),
                Pessoa("Lia", faixaEtaria: FaixaEtaria.Crianca, resposta: RespostaRsvp.Recusado)), Agora),
        };

        var totais = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));

        Assert.Equal(3, totais.Convites);
        Assert.Equal(7, totais.Pessoas);
        Assert.Equal(5, totais.Adultos);
        Assert.Equal(2, totais.Criancas);
        Assert.Equal(3, totais.AcompanhantesPermitidos);
        Assert.Equal(new TotaisPorFaixaDto(3, 1, 4), totais.Confirmados);
        Assert.Equal(new TotaisPorFaixaDto(2, 0, 2), totais.Pendentes);
        Assert.Equal(new TotaisPorFaixaDto(0, 1, 1), totais.Recusados);
    }

    [Fact]
    public void Calcular_SemConvites_DeveZerarTudo()
    {
        var totais = CalculadoraTotaisConvidados.Calcular(new ResumoConvidados([], 0, 0));

        Assert.Equal(new TotaisConvidadosDto(0, 0, 0, 0, 0, new(0, 0, 0), new(0, 0, 0), new(0, 0, 0)), totais);
    }

    [Fact]
    public void Calcular_ContagensRepetidasDoBanco_DevemSerSomadas()
    {
        var resumo = new ResumoConvidados(
            [
                new ContagemConvidados(FaixaEtaria.Adulto, RespostaRsvp.Pendente, 2),
                new ContagemConvidados(FaixaEtaria.Adulto, RespostaRsvp.Pendente, 3),
                new ContagemConvidados(FaixaEtaria.Crianca, RespostaRsvp.Recusado, 1),
            ],
            2,
            4);

        var totais = CalculadoraTotaisConvidados.Calcular(resumo);

        Assert.Equal(new TotaisPorFaixaDto(5, 0, 5), totais.Pendentes);
        Assert.Equal(6, totais.Pessoas);
        Assert.Equal(4, totais.AcompanhantesPermitidos);
    }

    [Fact]
    public void Ordenar_DeveIgnorarAcentosECaixaEDesempatarPelaCriacao()
    {
        var primeiroBeto = Convite.Criar(CasamentoId, Dados("beto", null, 0, Pessoa("Beto")), Agora);
        var segundoBeto = Convite.Criar(CasamentoId, Dados("Beto", null, 0, Pessoa("Beto")), Agora.AddMinutes(1));
        var alvaro = Convite.Criar(CasamentoId, Dados("Álvaro", null, 0, Pessoa("Álvaro")), Agora);
        var zelia = Convite.Criar(CasamentoId, Dados("Zélia", null, 0, Pessoa("Zélia")), Agora);
        var amanda = Convite.Criar(CasamentoId, Dados("amanda", null, 0, Pessoa("Amanda")), Agora);

        var ordenados = OrdenacaoConvites.Ordenar([zelia, segundoBeto, primeiroBeto, alvaro, amanda]);

        Assert.Equal([alvaro, amanda, primeiroBeto, segundoBeto, zelia], ordenados);
    }
}
