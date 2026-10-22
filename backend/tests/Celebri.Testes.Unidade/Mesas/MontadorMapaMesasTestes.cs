using Celebri.Aplicacao.Mesas;
using Celebri.Dominio.Convidados;
using static Celebri.Testes.Unidade.Mesas.MesaTestes;

namespace Celebri.Testes.Unidade.Mesas;

public class MontadorMapaMesasTestes
{
    [Fact]
    public void Montar_DeveOrdenarEspecialPrimeiroDepoisPorNumero()
    {
        var tres = NovaMesa(3);
        var anfitrioes = NovaMesa(7, 10, especial: true);
        var um = NovaMesa(1);

        var mapa = MontadorMapaMesas.Montar([tres, anfitrioes, um], [], false);

        Assert.Equal([anfitrioes.Id, um.Id, tres.Id], mapa.Mesas.Select(mesa => mesa.Id));
    }

    [Fact]
    public void Montar_DeveListarSoConfirmadosComMesaEOrdemDosConvites()
    {
        var mesa = NovaMesa(1, 4);
        var souza = NovoConvite("Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Pendente));
        var abreu = NovoConvite("Família Abreu", ("Lia Abreu", RespostaRsvp.Confirmado), ("Davi Abreu", RespostaRsvp.Recusado));
        mesa.Receber([souza.Convidados[0]], 0, Agora);

        var mapa = MontadorMapaMesas.Montar([mesa], [souza, abreu], false);

        Assert.Equal(["Lia Abreu", "Carla Souza"], mapa.Pessoas.Select(pessoa => pessoa.Nome));
        Assert.Equal(mesa.Id, mapa.Pessoas.Single(pessoa => pessoa.Nome == "Carla Souza").MesaId);
        Assert.Equal("Família Souza", mapa.Pessoas.Single(pessoa => pessoa.Nome == "Carla Souza").Convite);
        Assert.Equal(new TotaisMesasDto(1, 4, 2, 1, 3, 1), mapa.Totais);
        Assert.Equal(1, mapa.Mesas.Single().Ocupacao);
    }

    [Fact]
    public void Montar_DeveTrazerAvisosComMesaAnteriorMaisRecentesPrimeiro()
    {
        var mesa = NovaMesa(3, 8, "Padrinhos");
        var rui = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        var bia = ConviteConfirmado("Bia Sales", "Bia Sales");
        mesa.Receber([rui.Convidados[0], bia.Convidados[0]], 0, Agora);
        rui.RegistrarRespostaRsvp([new RespostaPessoaRsvp(rui.Convidados[0].Id, RespostaRsvp.Recusado)], [], Agora.AddHours(1));
        bia.RegistrarRespostaRsvp([new RespostaPessoaRsvp(bia.Convidados[0].Id, RespostaRsvp.Recusado)], [], Agora.AddHours(2));

        var mapa = MontadorMapaMesas.Montar([mesa], [rui, bia], true);

        Assert.True(mapa.EventoArquivado);
        Assert.Equal(["Bia Sales", "Rui Fontes"], mapa.AvisosSaida.Select(aviso => aviso.Nome));
        var aviso = mapa.AvisosSaida[1];
        Assert.Equal(("Recusado", mesa.Id, 3, "Padrinhos", false), (aviso.Resposta, aviso.MesaId, aviso.MesaNumero, aviso.MesaNome, aviso.MesaEspecial!.Value));
        Assert.Equal(0, mapa.Totais.Confirmados);
    }

    [Fact]
    public void Montar_AvisoDeMesaExcluida_DeveVirSemMesa()
    {
        var mesa = NovaMesa(3);
        var rui = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber([rui.Convidados[0]], 0, Agora);
        rui.RegistrarRespostaRsvp([new RespostaPessoaRsvp(rui.Convidados[0].Id, RespostaRsvp.Recusado)], [], Agora);

        var mapa = MontadorMapaMesas.Montar([], [rui], false);

        var aviso = Assert.Single(mapa.AvisosSaida);
        Assert.Null(aviso.MesaId);
        Assert.Null(aviso.MesaNumero);
    }

    [Fact]
    public void Montar_LugaresLivresNuncaNegativos()
    {
        var mesa = NovaMesa(1, 2);
        var convite = ConviteConfirmado("Família Souza", "Carla Souza", "Pedro Souza");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);

        var mapa = MontadorMapaMesas.Montar([mesa], [convite], false);

        Assert.Equal(0, mapa.Totais.LugaresLivres);
        Assert.Equal(0, mapa.Totais.SemMesa);
    }
}
