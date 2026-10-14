using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Mesas;

namespace Casamento.Testes.Unidade.Mesas;

public class MesaTestes
{
    public static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    public static readonly Guid CasamentoId = Guid.NewGuid();

    public static Convite NovoConvite(string nome, params (string Nome, RespostaRsvp Resposta)[] pessoas)
    {
        var dados = pessoas.Select(pessoa => new DadosConvidado(null, pessoa.Nome, null, null, FaixaEtaria.Adulto, pessoa.Resposta)).ToList();
        return Convite.Criar(CasamentoId, new DadosConvite(nome, null, 0, dados), Agora);
    }

    public static Convite ConviteConfirmado(string nome, params string[] pessoas)
    {
        return NovoConvite(nome, pessoas.Select(pessoa => (pessoa, RespostaRsvp.Confirmado)).ToArray());
    }

    public static Mesa NovaMesa(int numero = 1, int capacidade = 8, string? nome = null, bool especial = false)
    {
        return Mesa.Criar(CasamentoId, new DadosMesa(numero, nome, capacidade, especial), Agora);
    }

    [Fact]
    public void Criar_DeveNormalizarNomeEGuardarDados()
    {
        var mesa = Mesa.Criar(CasamentoId, new DadosMesa(3, "  Amigos   da faculdade ", 10, false), Agora);

        Assert.NotEqual(Guid.Empty, mesa.Id);
        Assert.Equal(CasamentoId, mesa.CasamentoId);
        Assert.Equal(Guid.Empty, mesa.OrganizacaoId);
        Assert.Equal((3, "Amigos da faculdade", 10, false), (mesa.Numero, mesa.Nome, mesa.Capacidade, mesa.Especial));
        Assert.Equal("Mesa 3 · Amigos da faculdade", mesa.Rotulo);
    }

    [Theory]
    [InlineData(0, 8, null, "numero")]
    [InlineData(1000, 8, null, "numero")]
    [InlineData(1, 0, null, "capacidade")]
    [InlineData(1, 31, null, "capacidade")]
    [InlineData(1, 8, "Um nome de mesa com bem mais de sessenta caracteres para estourar o limite", "nome")]
    public void Criar_ForaDosLimites_DeveLancarRegraNoCampo(int numero, int capacidade, string? nome, string campo)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Mesa.Criar(CasamentoId, new DadosMesa(numero, nome, capacidade, false), Agora));

        Assert.Equal(campo, excecao.Campo);
    }

    [Fact]
    public void Criar_SemCasamento_DeveLancar()
    {
        Assert.Throws<ArgumentException>(() => Mesa.Criar(Guid.Empty, new DadosMesa(1, null, 8, false), Agora));
    }

    [Theory]
    [InlineData(4, null, false, "Mesa 4")]
    [InlineData(1, null, true, "Mesa dos noivos")]
    [InlineData(1, "Noivos e padrinhos", true, "Mesa 1 · Noivos e padrinhos")]
    public void Rotulo_DeveCombinarNumeroNomeEEspecial(int numero, string? nome, bool especial, string esperado)
    {
        Assert.Equal(esperado, Mesa.Rotular(numero, nome, especial));
    }

    [Fact]
    public void Receber_ConfirmadosQueCabem_DeveSentarETocarAMesa()
    {
        var mesa = NovaMesa(capacidade: 3);
        var convite = ConviteConfirmado("Família Souza", "Carla Souza", "Pedro Souza");
        var depois = Agora.AddMinutes(5);

        var chegando = mesa.Receber(convite.Convidados.ToList(), 1, depois);

        Assert.Equal(2, chegando);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(mesa.Id, pessoa.MesaId));
        Assert.Equal(depois, mesa.AtualizadoEm);
    }

    [Fact]
    public void Receber_ExcedendoCapacidade_DeveLancarSemSentarNinguem()
    {
        var mesa = NovaMesa(numero: 2, capacidade: 3, nome: "Padrinhos");
        var convite = ConviteConfirmado("Família Souza", "Carla Souza", "Pedro Souza");

        var excecao = Assert.Throws<RegraNegocioException>(() => mesa.Receber(convite.Convidados.ToList(), 2, Agora));

        Assert.Equal("A Mesa 2 · Padrinhos tem 3 lugares e 1 livre. Escolha até 1 pessoa ou outra mesa.", excecao.Message);
        Assert.All(convite.Convidados, pessoa => Assert.Null(pessoa.MesaId));
    }

    [Fact]
    public void Receber_MesaCompleta_DeveExplicarQueEstaCompleta()
    {
        var mesa = NovaMesa(numero: 5, capacidade: 2);
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");

        var excecao = Assert.Throws<RegraNegocioException>(() => mesa.Receber(convite.Convidados.ToList(), 2, Agora));

        Assert.Equal("A Mesa 5 está completa (2 lugares). Escolha outra mesa.", excecao.Message);
    }

    [Theory]
    [InlineData(RespostaRsvp.Pendente)]
    [InlineData(RespostaRsvp.Recusado)]
    public void Receber_PessoaNaoConfirmada_DeveLancar(RespostaRsvp resposta)
    {
        var mesa = NovaMesa();
        var convite = NovoConvite("Família Lima", ("Rafael Lima", RespostaRsvp.Confirmado), ("Bia Lima", resposta));

        var excecao = Assert.Throws<RegraNegocioException>(() => mesa.Receber(convite.Convidados.ToList(), 0, Agora));

        Assert.Equal(MensagensMesas.SomenteConfirmados, excecao.Message);
        Assert.All(convite.Convidados, pessoa => Assert.Null(pessoa.MesaId));
    }

    [Fact]
    public void Receber_QuemJaEstaNaMesa_NaoContaComoChegada()
    {
        var mesa = NovaMesa(capacidade: 2);
        var convite = ConviteConfirmado("Família Souza", "Carla Souza", "Pedro Souza");
        mesa.Receber(convite.Convidados.ToList(), 0, Agora);

        var chegando = mesa.Receber(convite.Convidados.ToList(), 2, Agora);

        Assert.Equal(0, chegando);
    }

    [Fact]
    public void Receber_PessoaDeOutraMesa_DeveMover()
    {
        var primeira = NovaMesa(1);
        var segunda = NovaMesa(2);
        var convite = ConviteConfirmado("Rui Fontes", "Rui Fontes");
        primeira.Receber(convite.Convidados.ToList(), 0, Agora);

        segunda.Receber(convite.Convidados.ToList(), 0, Agora);

        Assert.Equal(segunda.Id, convite.Convidados[0].MesaId);
    }

    [Fact]
    public void Atualizar_CapacidadeAbaixoDaOcupacao_DeveLancarNoCampoCapacidade()
    {
        var mesa = NovaMesa(numero: 3, capacidade: 8);

        var excecao = Assert.Throws<RegraNegocioException>(() => mesa.Atualizar(new DadosMesa(3, null, 5, false), 6, Agora));

        Assert.Equal("capacidade", excecao.Campo);
        Assert.Equal("A Mesa 3 já tem 6 pessoas. Os lugares não podem ficar abaixo disso.", excecao.Message);
        Assert.Equal(8, mesa.Capacidade);
    }

    [Fact]
    public void Atualizar_CapacidadeIgualOcupacao_DeveAplicar()
    {
        var mesa = NovaMesa(numero: 3, capacidade: 8);

        mesa.Atualizar(new DadosMesa(4, "Tios", 6, true), 6, Agora.AddHours(1));

        Assert.Equal((4, "Tios", 6, true), (mesa.Numero, mesa.Nome, mesa.Capacidade, mesa.Especial));
        Assert.Equal(Agora.AddHours(1), mesa.AtualizadoEm);
    }
}
