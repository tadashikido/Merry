using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Testes.Unidade.Convidados;

namespace Celebri.Testes.Unidade.Rsvp;

public class ConviteRsvpTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Depois = Agora.AddHours(2);

    private static Convite CriarConvite(int limite = 2, params DadosConvidado[] pessoas)
    {
        return Convite.Criar(
            Guid.NewGuid(),
            ConviteTestes.Dados("Família Souza", null, limite, pessoas.Length > 0 ? pessoas : [ConviteTestes.Pessoa("Célia Souza"), ConviteTestes.Pessoa("Antônio Souza")]),
            Agora);
    }

    private static List<RespostaPessoaRsvp> Todos(Convite convite, RespostaRsvp resposta)
    {
        return convite.Convidados.Where(pessoa => !pessoa.Acompanhante).Select(pessoa => new RespostaPessoaRsvp(pessoa.Id, resposta)).ToList();
    }

    [Fact]
    public void MarcarEnviado_DeNaoEnviado_DeveAvancarUmaUnicaVez()
    {
        var convite = CriarConvite();

        Assert.True(convite.MarcarEnviado(Depois));
        Assert.Equal(StatusEnvioConvite.Enviado, convite.StatusEnvio);
        Assert.False(convite.MarcarEnviado(Depois.AddHours(1)));
        Assert.Equal(Depois, convite.AtualizadoEm);
    }

    [Fact]
    public void MarcarEnviado_DepoisDeVisualizado_NaoDeveRegredir()
    {
        var convite = CriarConvite();
        convite.MarcarVisualizado(Depois);

        Assert.False(convite.MarcarEnviado(Depois));
        Assert.Equal(StatusEnvioConvite.Visualizado, convite.StatusEnvio);
    }

    [Fact]
    public void MarcarVisualizado_JaVisualizado_NaoDeveAlterar()
    {
        var convite = CriarConvite();

        Assert.True(convite.MarcarVisualizado(Depois));
        Assert.False(convite.MarcarVisualizado(Depois.AddDays(1)));
        Assert.Equal(Depois, convite.AtualizadoEm);
    }

    [Fact]
    public void RegistrarResposta_TodosConfirmam_DeveGravarRespostasVisualizadoERespondidoEm()
    {
        var convite = CriarConvite();

        convite.RegistrarRespostaRsvp(Todos(convite, RespostaRsvp.Confirmado), [], Depois);

        Assert.All(convite.Convidados, pessoa => Assert.Equal(RespostaRsvp.Confirmado, pessoa.Resposta));
        Assert.Equal(StatusEnvioConvite.Visualizado, convite.StatusEnvio);
        Assert.Equal(Depois, convite.RespondidoEm);
    }

    [Fact]
    public void RegistrarResposta_ComIdDeOutroConvite_DeveRejeitarSemAlterarNada()
    {
        var convite = CriarConvite();
        var respostas = Todos(convite, RespostaRsvp.Confirmado);
        respostas[0] = new RespostaPessoaRsvp(Guid.NewGuid(), RespostaRsvp.Confirmado);

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(respostas, [], Depois));

        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, excecao.Message);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(RespostaRsvp.Pendente, pessoa.Resposta));
        Assert.Null(convite.RespondidoEm);
        Assert.Equal(StatusEnvioConvite.NaoEnviado, convite.StatusEnvio);
    }

    [Fact]
    public void RegistrarResposta_SemTodasAsPessoas_DeveRejeitar()
    {
        var convite = CriarConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() =>
            convite.RegistrarRespostaRsvp([Todos(convite, RespostaRsvp.Confirmado)[0]], [], Depois));

        Assert.Equal(MensagensConvidados.RespostaIncompleta, excecao.Message);
    }

    [Fact]
    public void RegistrarResposta_PessoaRepetida_DeveRejeitar()
    {
        var convite = CriarConvite();
        var primeira = Todos(convite, RespostaRsvp.Confirmado)[0];

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp([primeira, primeira], [], Depois));

        Assert.Equal(MensagensConvidados.ConvidadoRepetido, excecao.Message);
    }

    [Theory]
    [InlineData(RespostaRsvp.Pendente)]
    [InlineData((RespostaRsvp)99)]
    public void RegistrarResposta_RespostaDiferenteDeVouOuNaoVou_DeveRejeitar(RespostaRsvp resposta)
    {
        var convite = CriarConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(Todos(convite, resposta), [], Depois));

        Assert.Equal(MensagensConvidados.RespostaPresencaInvalida, excecao.Message);
    }

    [Fact]
    public void RegistrarResposta_ComAcompanhantes_DeveCriarPessoasMarcadasComoAcompanhante()
    {
        var convite = CriarConvite(limite: 2);

        convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, "  Pedro   Lima ", FaixaEtaria.Adulto), new DadosAcompanhanteRsvp(null, "Nina", FaixaEtaria.Crianca)],
            Depois);

        var acompanhantes = convite.ConvidadosOrdenados().Where(pessoa => pessoa.Acompanhante).ToList();
        Assert.Equal(2, acompanhantes.Count);
        Assert.Equal("Pedro Lima", acompanhantes[0].Nome);
        Assert.Equal(FaixaEtaria.Crianca, acompanhantes[1].FaixaEtaria);
        Assert.All(acompanhantes, acompanhante => Assert.Equal(RespostaRsvp.Confirmado, acompanhante.Resposta));
        Assert.All(acompanhantes, acompanhante => Assert.Equal(convite.Id, acompanhante.ConviteId));
        Assert.Equal([2, 3], acompanhantes.Select(acompanhante => acompanhante.Ordem));
        Assert.Equal(2, convite.QuantidadeAcompanhantes());
    }

    [Fact]
    public void RegistrarResposta_AcimaDoLimiteDeAcompanhantes_DeveRejeitar()
    {
        var convite = CriarConvite(limite: 1);

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto), new DadosAcompanhanteRsvp(null, "Nina", FaixaEtaria.Adulto)],
            Depois));

        Assert.Equal(MensagensConvidados.LimiteAcompanhantesExcedido, excecao.Message);
        Assert.Equal(0, convite.QuantidadeAcompanhantes());
    }

    [Fact]
    public void RegistrarResposta_AcompanhanteSemNinguemConfirmado_DeveRejeitar()
    {
        var convite = CriarConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Recusado),
            [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto)],
            Depois));

        Assert.Equal(MensagensConvidados.AcompanhanteSemConfirmacao, excecao.Message);
    }

    [Theory]
    [InlineData(null, MensagensConvidados.NomeAcompanhanteObrigatorio)]
    [InlineData("   ", MensagensConvidados.NomeAcompanhanteObrigatorio)]
    [InlineData("P", MensagensConvidados.TamanhoNomeAcompanhante)]
    public void RegistrarResposta_NomeDeAcompanhanteInvalido_DeveRejeitar(string? nome, string mensagem)
    {
        var convite = CriarConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, nome, FaixaEtaria.Adulto)],
            Depois));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void RegistrarResposta_NomeDeAcompanhanteMuitoLongo_DeveRejeitar()
    {
        var convite = CriarConvite();

        Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, new string('a', Convidado.TamanhoMaximoNome + 1), FaixaEtaria.Adulto)],
            Depois));
    }

    [Fact]
    public void RegistrarResposta_FaixaEtariaInvalida_DeveRejeitar()
    {
        var convite = CriarConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, "Pedro", (FaixaEtaria)42)],
            Depois));

        Assert.Equal(MensagensConvidados.FaixaEtariaInvalida, excecao.Message);
    }

    [Fact]
    public void RegistrarResposta_IdDeTitularUsadoComoAcompanhante_DeveRejeitar()
    {
        var convite = CriarConvite();
        var titular = convite.Convidados[0];

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(titular.Id, "Renomeado", FaixaEtaria.Adulto)],
            Depois));

        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, excecao.Message);
        Assert.Equal("Célia Souza", titular.Nome);
    }

    [Fact]
    public void RegistrarResposta_NovaRespostaSemAcompanhanteAnterior_DeveRemoverEAtualizarOsMantidos()
    {
        var convite = CriarConvite(limite: 2);
        convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto), new DadosAcompanhanteRsvp(null, "Nina", FaixaEtaria.Adulto)],
            Agora);
        var nina = convite.Convidados.Single(pessoa => pessoa.Nome == "Nina");

        convite.RegistrarRespostaRsvp(
            Todos(convite, RespostaRsvp.Confirmado),
            [new DadosAcompanhanteRsvp(nina.Id, "Nina Lima", FaixaEtaria.Crianca)],
            Depois);

        var acompanhante = Assert.Single(convite.Convidados, pessoa => pessoa.Acompanhante);
        Assert.Equal(nina.Id, acompanhante.Id);
        Assert.Equal("Nina Lima", acompanhante.Nome);
        Assert.Equal(FaixaEtaria.Crianca, acompanhante.FaixaEtaria);
    }

    [Fact]
    public void RegistrarResposta_TodosRecusamSemAcompanhantes_DeveRemoverAcompanhantesAnteriores()
    {
        var convite = CriarConvite(limite: 1);
        convite.RegistrarRespostaRsvp(Todos(convite, RespostaRsvp.Confirmado), [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto)], Agora);

        convite.RegistrarRespostaRsvp(Todos(convite, RespostaRsvp.Recusado), [], Depois);

        Assert.DoesNotContain(convite.Convidados, pessoa => pessoa.Acompanhante);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(RespostaRsvp.Recusado, pessoa.Resposta));
    }

    [Fact]
    public void RegistrarResposta_RespostaMista_DeveGravarCadaPessoa()
    {
        var convite = CriarConvite();
        var pessoas = convite.ConvidadosOrdenados();

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(pessoas[0].Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(pessoas[1].Id, RespostaRsvp.Recusado)],
            [],
            Depois);

        Assert.Equal(RespostaRsvp.Confirmado, pessoas[0].Resposta);
        Assert.Equal(RespostaRsvp.Recusado, pessoas[1].Resposta);
    }

    [Fact]
    public void AtualizarPelaCerimonialista_DevePreservarMarcacaoDeAcompanhante()
    {
        var convite = CriarConvite(limite: 1);
        convite.RegistrarRespostaRsvp(Todos(convite, RespostaRsvp.Confirmado), [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto)], Agora);
        var dados = convite.ConvidadosOrdenados()
            .Select(pessoa => ConviteTestes.Pessoa(pessoa.Nome, resposta: pessoa.Resposta, id: pessoa.Id))
            .Append(ConviteTestes.Pessoa("Nova Pessoa"))
            .ToArray();

        convite.Atualizar(ConviteTestes.Dados("Família Souza", null, 1, dados), Depois);

        Assert.True(convite.Convidados.Single(pessoa => pessoa.Nome == "Pedro").Acompanhante);
        Assert.False(convite.Convidados.Single(pessoa => pessoa.Nome == "Nova Pessoa").Acompanhante);
    }
}
