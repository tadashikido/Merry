using Celebri.Dominio.Convidados;
using static Celebri.Testes.Unidade.Mesas.MesaTestes;

namespace Celebri.Testes.Unidade.Mesas;

public class SaidaDaMesaTestes
{
    private static DadosConvite DadosCom(Convite convite, params RespostaRsvp[] respostas)
    {
        var pessoas = convite.ConvidadosOrdenados()
            .Select((pessoa, indice) => new DadosConvidado(pessoa.Id, pessoa.Nome, null, null, pessoa.FaixaEtaria, respostas[indice]))
            .ToList();
        return new DadosConvite(convite.Nome, convite.Grupo, convite.LimiteAcompanhantes, pessoas);
    }

    [Fact]
    public void RecusaPeloRsvp_DeveTirarDaMesaERegistrarAviso()
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Família Souza", "Carla Souza", "Pedro Souza");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);
        var carla = convite.Convidados[0];
        var pedro = convite.Convidados[1];
        var momento = Agora.AddDays(1);

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(carla.Id, RespostaRsvp.Recusado), new RespostaPessoaRsvp(pedro.Id, RespostaRsvp.Confirmado)],
            [],
            momento);

        Assert.Null(carla.MesaId);
        Assert.Equal(mesa.Id, carla.MesaSaidaId);
        Assert.Equal(momento, carla.SaiuDaMesaEm);
        Assert.Equal(mesa.Id, pedro.MesaId);
        Assert.Null(pedro.SaiuDaMesaEm);
    }

    [Theory]
    [InlineData(RespostaRsvp.Pendente)]
    [InlineData(RespostaRsvp.Recusado)]
    public void EdicaoQueDeixaDeConfirmar_DeveTirarDaMesaComAviso(RespostaRsvp nova)
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);

        convite.Atualizar(DadosCom(convite, nova), Agora.AddHours(2));

        var rui = convite.Convidados[0];
        Assert.Null(rui.MesaId);
        Assert.Equal(mesa.Id, rui.MesaSaidaId);
        Assert.Equal(Agora.AddHours(2), rui.SaiuDaMesaEm);
    }

    [Fact]
    public void EdicaoQueMantemConfirmado_NaoDeveTirarDaMesa()
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);

        convite.Atualizar(DadosCom(convite, RespostaRsvp.Confirmado), Agora.AddHours(2));

        Assert.Equal(mesa.Id, convite.Convidados[0].MesaId);
        Assert.Null(convite.Convidados[0].SaiuDaMesaEm);
    }

    [Fact]
    public void RecusaDeQuemNaoTemMesa_NaoGeraAviso()
    {
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");

        convite.Atualizar(DadosCom(convite, RespostaRsvp.Recusado), Agora);

        Assert.Null(convite.Convidados[0].SaiuDaMesaEm);
        Assert.Null(convite.Convidados[0].MesaSaidaId);
    }

    [Fact]
    public void SentarDeNovo_DeveLimparOAviso()
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);
        convite.Atualizar(DadosCom(convite, RespostaRsvp.Pendente), Agora);
        convite.Atualizar(DadosCom(convite, RespostaRsvp.Confirmado), Agora);

        mesa.Receber(convite.Convidados.ToList(), 0, Agora);

        Assert.Equal(mesa.Id, convite.Convidados[0].MesaId);
        Assert.Null(convite.Convidados[0].SaiuDaMesaEm);
        Assert.Null(convite.Convidados[0].MesaSaidaId);
    }

    [Fact]
    public void DispensarAviso_DeveLimparSemAlterarResposta()
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);
        convite.Atualizar(DadosCom(convite, RespostaRsvp.Recusado), Agora);
        var rui = convite.Convidados[0];

        Assert.True(rui.DispensarAvisoSaidaMesa(Agora));
        Assert.False(rui.DispensarAvisoSaidaMesa(Agora));
        Assert.Null(rui.SaiuDaMesaEm);
        Assert.Equal(RespostaRsvp.Recusado, rui.Resposta);
    }

    [Fact]
    public void Levantar_DeveTirarDaMesaSemAviso()
    {
        var mesa = NovaMesa();
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);
        var rui = convite.Convidados[0];

        Assert.True(rui.Levantar(Agora));
        Assert.False(rui.Levantar(Agora));
        Assert.Null(rui.MesaId);
        Assert.Null(rui.SaiuDaMesaEm);
    }

    [Fact]
    public void AcompanhanteMantidoNoRsvp_ContinuaNaMesa()
    {
        var mesa = NovaMesa();
        var dados = new DadosConvite("Família Souza", null, 1, [new DadosConvidado(null, "Carla Souza", null, null, FaixaEtaria.Adulto, RespostaRsvp.Confirmado)]);
        var convite = Convite.Criar(EventoId, dados, Agora);
        var carla = convite.Convidados[0];
        convite.RegistrarRespostaRsvp([new RespostaPessoaRsvp(carla.Id, RespostaRsvp.Confirmado)], [new DadosAcompanhanteRsvp(null, "Pedro Lima", FaixaEtaria.Adulto)], Agora);
        var acompanhante = convite.Convidados.Single(pessoa => pessoa.Acompanhante);
        mesa.Receber([carla, acompanhante], 0, Agora);

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(carla.Id, RespostaRsvp.Confirmado)],
            [new DadosAcompanhanteRsvp(acompanhante.Id, "Pedro Lima", FaixaEtaria.Adulto)],
            Agora);

        Assert.Equal(mesa.Id, acompanhante.MesaId);
    }
}
