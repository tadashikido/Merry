using Celebri.Dominio.Convidados;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Excecoes;
using Celebri.Testes.Unidade.Convidados;

namespace Celebri.Testes.Unidade.DadosSensiveis;

public class ConviteDadosSensiveisTestes
{
    private static readonly DateTimeOffset Agora = DateTimeOffset.UnixEpoch.AddDays(10);

    private static readonly ConsentimentoDadosSensiveis ConsentimentoConvidado =
        new(Agora, "2026-09-29", OrigemConsentimento.Convidado, null);

    private readonly List<(RestricaoAlimentar Restricao, Guid ConvidadoId)> _cifrados = [];

    private string Cifrar(RestricaoAlimentar restricao, Guid convidadoId)
    {
        _cifrados.Add((restricao, convidadoId));
        return $"v1.cifra-{convidadoId:N}";
    }

    private static Convite NovoConvite(int limite = 1)
    {
        return Convite.Criar(Guid.NewGuid(), ConviteTestes.Dados("Família Souza", null, limite, ConviteTestes.Pessoa("Célia"), ConviteTestes.Pessoa("Lia")), Agora);
    }

    private static AlteracaoDadosSensiveis SemGluten()
    {
        return AlteracaoDadosSensiveis.Informar(RestricaoAlimentar.Criar([TipoRestricaoAlimentar.SemGluten], null, null)!);
    }

    [Fact]
    public void Resposta_ComRestricaoEConsentimento_DeveGuardarCifraEConsentimentoPorPessoa()
    {
        var convite = NovoConvite();
        var (celia, lia) = (convite.Convidados[0], convite.Convidados[1]);

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(celia.Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(lia.Id, RespostaRsvp.Confirmado, SemGluten())],
            [],
            ConsentimentoConvidado,
            Cifrar,
            Agora);

        Assert.False(celia.PossuiRestricaoAlimentar);
        Assert.True(lia.PossuiRestricaoAlimentar);
        Assert.Equal($"v1.cifra-{lia.Id:N}", lia.DadosSensiveis!.ConteudoCifrado);
        Assert.Equal(Agora, lia.DadosSensiveis.ConsentidoEm);
        Assert.Equal("2026-09-29", lia.DadosSensiveis.VersaoTermo);
        Assert.Equal(OrigemConsentimento.Convidado, lia.DadosSensiveis.OrigemConsentimento);
        Assert.Equal(convite.EventoId, lia.DadosSensiveis.EventoId);
        Assert.Equal(lia.Id, Assert.Single(_cifrados).ConvidadoId);
    }

    [Fact]
    public void Resposta_ComRestricaoSemConsentimento_DeveRecusarSemAlterarNada()
    {
        var convite = NovoConvite();
        var lia = convite.Convidados[1];

        var excecao = Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(lia.Id, RespostaRsvp.Confirmado, SemGluten())],
            [],
            null,
            Cifrar,
            Agora));

        Assert.Equal(MensagensDadosSensiveis.ConsentimentoObrigatorio, excecao.Message);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(RespostaRsvp.Pendente, pessoa.Resposta));
        Assert.Null(convite.RespondidoEm);
        Assert.Null(lia.DadosSensiveis);
        Assert.Empty(_cifrados);
    }

    [Fact]
    public void Resposta_RestricaoParaQuemNaoVai_NaoExigeConsentimentoENaoGrava()
    {
        var convite = NovoConvite();

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Recusado, SemGluten())],
            [],
            null,
            Cifrar,
            Agora);

        Assert.Null(convite.Convidados[1].DadosSensiveis);
        Assert.Empty(_cifrados);
    }

    [Fact]
    public void Resposta_SemCampo_DeveManterERecusado_DeveRemover()
    {
        var convite = NovoConvite();
        var (celia, lia) = (convite.Convidados[0], convite.Convidados[1]);
        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(celia.Id, RespostaRsvp.Confirmado, SemGluten()), new RespostaPessoaRsvp(lia.Id, RespostaRsvp.Confirmado, SemGluten())],
            [],
            ConsentimentoConvidado,
            Cifrar,
            Agora);
        var consentimentoOriginal = celia.DadosSensiveis!.ConsentidoEm;

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(celia.Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(lia.Id, RespostaRsvp.Recusado)],
            [],
            Agora.AddDays(1));

        Assert.True(celia.PossuiRestricaoAlimentar);
        Assert.Equal(consentimentoOriginal, celia.DadosSensiveis.ConsentidoEm);
        Assert.Null(lia.DadosSensiveis);
    }

    [Fact]
    public void Resposta_ObjetoVazio_DeveRemover()
    {
        var convite = NovoConvite();
        var celia = convite.Convidados[0];
        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(celia.Id, RespostaRsvp.Confirmado, SemGluten()), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Confirmado)],
            [],
            ConsentimentoConvidado,
            Cifrar,
            Agora);

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(celia.Id, RespostaRsvp.Confirmado, AlteracaoDadosSensiveis.Remover), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Confirmado)],
            [],
            null,
            Cifrar,
            Agora);

        Assert.Null(celia.DadosSensiveis);
    }

    [Fact]
    public void Resposta_AcompanhanteNovoComRestricao_DeveCifrarComIdDoAcompanhante()
    {
        var convite = NovoConvite();

        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Confirmado)],
            [new DadosAcompanhanteRsvp(null, "Pedro Lima", FaixaEtaria.Adulto, SemGluten())],
            ConsentimentoConvidado,
            Cifrar,
            Agora);

        var pedro = convite.Convidados.Single(pessoa => pessoa.Acompanhante);
        Assert.True(pedro.PossuiRestricaoAlimentar);
        Assert.Equal(pedro.Id, Assert.Single(_cifrados).ConvidadoId);
        Assert.NotEqual(Guid.Empty, pedro.Id);
    }

    [Fact]
    public void Resposta_AcompanhanteComRestricaoSemConsentimento_DeveRecusar()
    {
        var convite = NovoConvite();

        Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Confirmado)],
            [new DadosAcompanhanteRsvp(null, "Pedro Lima", FaixaEtaria.Adulto, SemGluten())],
            null,
            Cifrar,
            Agora));

        Assert.DoesNotContain(convite.Convidados, pessoa => pessoa.Acompanhante);
    }

    [Fact]
    public void Resposta_SobrecargaSemCifragem_NaoPodeGravarDadoSensivel()
    {
        var convite = NovoConvite();

        Assert.Throws<RegraNegocioException>(() => convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado, SemGluten()), new RespostaPessoaRsvp(convite.Convidados[1].Id, RespostaRsvp.Confirmado)],
            [],
            Agora));
    }

    [Fact]
    public void Cerimonialista_ComUsuario_DeveRegistrarOrigemEUsuario()
    {
        var convite = NovoConvite();
        var usuario = Guid.NewGuid();
        var celia = convite.Convidados[0];

        convite.RegistrarDadosSensiveis(
            celia.Id,
            SemGluten(),
            new ConsentimentoDadosSensiveis(Agora, "2026-09-29", OrigemConsentimento.Cerimonialista, usuario),
            Cifrar,
            Agora.AddHours(1));

        Assert.Equal(OrigemConsentimento.Cerimonialista, celia.DadosSensiveis!.OrigemConsentimento);
        Assert.Equal(usuario, celia.DadosSensiveis.RegistradoPorUsuarioId);
        Assert.Equal(Agora.AddHours(1), convite.AtualizadoEm);
    }

    [Fact]
    public void Cerimonialista_SemUsuario_DeveFalhar()
    {
        var convite = NovoConvite();

        Assert.Throws<ArgumentException>(() => convite.RegistrarDadosSensiveis(
            convite.Convidados[0].Id,
            SemGluten(),
            new ConsentimentoDadosSensiveis(Agora, "2026-09-29", OrigemConsentimento.Cerimonialista, null),
            Cifrar,
            Agora));
    }

    [Fact]
    public void Cerimonialista_PessoaDeOutroConvite_DeveRecusar()
    {
        var convite = NovoConvite();

        Assert.Throws<RegraNegocioException>(() => convite.RegistrarDadosSensiveis(Guid.NewGuid(), SemGluten(), ConsentimentoConvidado, Cifrar, Agora));
    }

    [Fact]
    public void Cerimonialista_InformarSemConsentimento_DeveRecusar()
    {
        var convite = NovoConvite();

        var excecao = Assert.Throws<RegraNegocioException>(() =>
            convite.RegistrarDadosSensiveis(convite.Convidados[0].Id, SemGluten(), null, Cifrar, Agora));

        Assert.Equal(MensagensDadosSensiveis.ConsentimentoObrigatorio, excecao.Message);
    }

    [Fact]
    public void AtualizarConvite_PessoaRemovida_DeveLevarDadoSensivelJunto()
    {
        var convite = NovoConvite();
        var celia = convite.Convidados[0];
        convite.RegistrarDadosSensiveis(convite.Convidados[1].Id, SemGluten(), ConsentimentoConvidado, Cifrar, Agora);

        convite.Atualizar(ConviteTestes.Dados("Família Souza", null, 1, ConviteTestes.Pessoa("Célia", id: celia.Id)), Agora);

        Assert.Single(convite.Convidados);
        Assert.DoesNotContain(convite.Convidados, pessoa => pessoa.PossuiRestricaoAlimentar);
    }
}
