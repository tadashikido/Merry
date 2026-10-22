using System.Text.Json;
using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Dominio.Convidados;
using static Celebri.Testes.Unidade.Convidados.ConviteTestes;

namespace Celebri.Testes.Unidade.Confirmacoes;

public class MontadorExportacaoBuffetTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 5, 13, 17, 3, 0, TimeSpan.Zero);

    private static RelatorioRestricoesAlimentaresDto Relatorio(params PessoaRestricaoAlimentarDto[] pessoas)
    {
        return new RelatorioRestricoesAlimentaresDto(
            pessoas.Length,
            pessoas.Count(pessoa => pessoa.Resposta == "Confirmado"),
            [new ContagemRestricaoDto("SemGluten", 1)],
            1,
            0,
            pessoas,
            30,
            new DateOnly(2027, 6, 21),
            null,
            2,
            true);
    }

    private static PessoaRestricaoAlimentarDto Restricao(Convidado convidado, string resposta, string? outra = null)
    {
        return new PessoaRestricaoAlimentarDto(
            convidado.Id,
            convidado.ConviteId,
            convidado.Nome,
            convidado.Acompanhante,
            resposta,
            ["SemGluten"],
            outra,
            "cadeira alta",
            "Convidado",
            Agora);
    }

    [Fact]
    public void Montar_DeveIncluirSoConfirmadosAgrupadosPorConviteOrdenados()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convites = CalculadoraPainelConfirmacoesTestes.CenarioDoCriterio(evento.Id);

        var exportacao = MontadorExportacaoBuffet.Montar(evento, convites, Relatorio(), Agora);

        Assert.Equal(["Álvaro", "Zélia"], exportacao.Convites.Select(convite => convite.Nome));
        Assert.Equal(["Álvaro"], exportacao.Convites[0].Pessoas.Select(pessoa => pessoa.Nome));
        Assert.Equal(["Zélia", "Rui", "Téo"], exportacao.Convites[1].Pessoas.Select(pessoa => pessoa.Nome));
        Assert.Equal("Crianca", exportacao.Convites[1].Pessoas[2].FaixaEtaria);
        Assert.Equal(new ContagemBuffetDto(3, 1, 4), exportacao.Confirmados);
        Assert.Equal(2, exportacao.Pendentes);
        Assert.Equal(4, MontadorExportacaoBuffet.ContarPessoas(exportacao));
        Assert.Equal(Agora, exportacao.GeradoEm);
    }

    [Fact]
    public void Montar_DeveCopiarDadosDoEventoSemContato()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();

        var exportacao = MontadorExportacaoBuffet.Montar(evento, [], Relatorio(), Agora);

        Assert.Equal(new EventoExportacaoDto("Ana", "Bruno", new DateOnly(2027, 5, 22), "16:30", "Espaço Jardim"), exportacao.Evento);
        Assert.Empty(exportacao.Convites);
    }

    [Fact]
    public void Montar_RestricoesNominais_DeveTrazerSoConfirmadosComNomeDoConvite()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convites = CalculadoraPainelConfirmacoesTestes.CenarioDoCriterio(evento.Id);
        var teo = convites[0].Convidados.Single(convidado => convidado.Nome == "Téo");
        var bia = convites[1].Convidados.Single(convidado => convidado.Nome == "Bia");

        var exportacao = MontadorExportacaoBuffet.Montar(
            evento,
            convites,
            Relatorio(Restricao(teo, "Confirmado", "sem porco"), Restricao(bia, "Pendente")),
            Agora);

        var pessoa = Assert.Single(exportacao.Restricoes.Pessoas);
        Assert.Equal("Téo", pessoa.Nome);
        Assert.Equal("Zélia", pessoa.Convite);
        Assert.Equal("sem porco", pessoa.OutraRestricao);
        Assert.Equal("cadeira alta", pessoa.NecessidadeEspecial);
        Assert.Equal(["SemGluten"], pessoa.Tipos);
        var teoNaLista = exportacao.Convites.Single(convite => convite.Nome == "Zélia").Pessoas.Single(p => p.Nome == "Téo");
        Assert.Equal(["SemGluten"], teoNaLista.Tipos);
        Assert.Equal("sem porco", teoNaLista.OutraRestricao);
        Assert.Equal("cadeira alta", teoNaLista.NecessidadeEspecial);
        Assert.Equal(2, exportacao.Restricoes.RegistrosIlegiveis);
        Assert.Equal(1, exportacao.Restricoes.OutrasRestricoes);
        Assert.Equal([new ContagemRestricaoBuffetDto("SemGluten", 1)], exportacao.Restricoes.PorTipo);
    }

    [Fact]
    public void Montar_JsonSerializado_NaoDeveConterContatoNemIds()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convites = CalculadoraPainelConfirmacoesTestes.CenarioDoCriterio(evento.Id);
        var teo = convites[0].Convidados.Single(convidado => convidado.Nome == "Téo");

        var exportacao = MontadorExportacaoBuffet.Montar(evento, convites, Relatorio(Restricao(teo, "Confirmado")), Agora);
        var json = JsonSerializer.Serialize(exportacao);

        Assert.DoesNotContain("987654321", json, StringComparison.Ordinal);
        Assert.DoesNotContain("Telefone", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Email", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Grupo", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Noiva", json, StringComparison.Ordinal);
        Assert.DoesNotContain(teo.Id.ToString(), json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("OrigemConsentimento", json, StringComparison.Ordinal);
    }
}
