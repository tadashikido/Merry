using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Rsvp;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.DadosSensiveis;

public class RestricaoAlimentarTestes
{
    [Fact]
    public void Criar_TudoVazio_DeveSignificarRemocao()
    {
        Assert.Null(RestricaoAlimentar.Criar([], "   ", "\t"));
        Assert.Null(RestricaoAlimentar.Criar(null, null, null));
    }

    [Fact]
    public void Criar_DeveNormalizarTextosEOrdenarTipos()
    {
        var restricao = RestricaoAlimentar.Criar(
            [TipoRestricaoAlimentar.SemLactose, TipoRestricaoAlimentar.Vegetariana],
            "  sem   carne\nde porco ",
            "cadeira\u0007de rodas")!;

        Assert.Equal([TipoRestricaoAlimentar.Vegetariana, TipoRestricaoAlimentar.SemLactose], restricao.Tipos);
        Assert.Equal("sem carne de porco", restricao.OutraRestricao);
        Assert.Equal("cadeira de rodas", restricao.NecessidadeEspecial);
    }

    [Fact]
    public void Criar_TipoRepetido_DeveRecusar()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            RestricaoAlimentar.Criar([TipoRestricaoAlimentar.Vegana, TipoRestricaoAlimentar.Vegana], null, null));

        Assert.Equal(MensagensDadosSensiveis.TipoRepetido, excecao.Message);
    }

    [Fact]
    public void Criar_TipoInexistente_DeveRecusar()
    {
        Assert.Throws<RegraNegocioException>(() => RestricaoAlimentar.Criar([(TipoRestricaoAlimentar)99], null, null));
    }

    [Theory]
    [InlineData(80, true)]
    [InlineData(81, false)]
    public void Criar_OutraRestricao_DeveRespeitarLimite(int tamanho, bool valido)
    {
        var texto = new string('a', tamanho);

        if (valido)
        {
            Assert.Equal(texto, RestricaoAlimentar.Criar([], texto, null)!.OutraRestricao);
        }
        else
        {
            var excecao = Assert.Throws<RegraNegocioException>(() => RestricaoAlimentar.Criar([], texto, null));
            Assert.Equal(MensagensDadosSensiveis.TamanhoOutraRestricao, excecao.Message);
        }
    }

    [Theory]
    [InlineData(200, true)]
    [InlineData(201, false)]
    public void Criar_NecessidadeEspecial_DeveRespeitarLimite(int tamanho, bool valido)
    {
        var texto = new string('b', tamanho);

        if (valido)
        {
            Assert.Equal(texto, RestricaoAlimentar.Criar([], null, texto)!.NecessidadeEspecial);
        }
        else
        {
            Assert.Throws<RegraNegocioException>(() => RestricaoAlimentar.Criar([], null, texto));
        }
    }

    [Theory]
    [InlineData("SemGluten", true)]
    [InlineData("semgluten", false)]
    [InlineData("2", false)]
    [InlineData("Outra", false)]
    [InlineData(null, false)]
    public void TiposRestricao_SoAceitaNomeExato(string? nome, bool esperado)
    {
        Assert.Equal(esperado, TiposRestricaoAlimentar.TentarInterpretar(nome, out _));
    }

    [Fact]
    public void Request_TipoDesconhecido_DeveGerarErroDeValidacao()
    {
        var request = new RestricaoAlimentarRequest(["Vegana", "Carnivora"], null, null);

        var erros = request.Validate(new ValidationContext(request)).ToList();

        Assert.Equal(MensagensDadosSensiveis.TipoInvalido, Assert.Single(erros).ErrorMessage);
    }

    [Fact]
    public void Request_Vazio_DeveVirarRemocaoEConteudo_DeveVirarInformar()
    {
        Assert.Same(AlteracaoDadosSensiveis.Remover, new RestricaoAlimentarRequest([], "", null).ParaAlteracao());

        var informar = new RestricaoAlimentarRequest(["SemGluten"], null, null).ParaAlteracao();

        Assert.Equal(TipoAlteracaoDadosSensiveis.Informar, informar.Tipo);
        Assert.Equal([TipoRestricaoAlimentar.SemGluten], informar.Restricao!.Tipos);
    }

    [Fact]
    public void ResponderRequest_SemCampoRestricao_DeveManter()
    {
        var request = new ResponderRsvpRequest("token", [new RespostaPessoaRsvpRequest(Guid.NewGuid(), Dominio.Convidados.RespostaRsvp.Confirmado)], [], null);

        Assert.Null(Assert.Single(request.ParaRespostas()).DadosSensiveis);
    }

    [Fact]
    public void Consentimento_NaoAceito_DeveSerNulo()
    {
        var request = new ResponderRsvpRequest("token", [], [], new ConsentimentoRsvpRequest(false, TermoPrivacidadeRsvp.VersaoVigente));

        Assert.Null(request.ParaConsentimento(DateTimeOffset.UnixEpoch));
        Assert.Null(new ResponderRsvpRequest("token", [], [], null).ParaConsentimento(DateTimeOffset.UnixEpoch));
    }

    [Fact]
    public void Consentimento_AceitoNaVersaoVigente_DeveRegistrarOrigemConvidado()
    {
        var agora = DateTimeOffset.UnixEpoch.AddDays(3);
        var request = new ResponderRsvpRequest("token", [], [], new ConsentimentoRsvpRequest(true, TermoPrivacidadeRsvp.VersaoVigente));

        var consentimento = request.ParaConsentimento(agora)!;

        Assert.Equal(agora, consentimento.ConsentidoEm);
        Assert.Equal(TermoPrivacidadeRsvp.VersaoVigente, consentimento.VersaoTermo);
        Assert.Equal(OrigemConsentimento.Convidado, consentimento.Origem);
        Assert.Null(consentimento.RegistradoPorUsuarioId);
    }

    [Theory]
    [InlineData("2020-01-01")]
    [InlineData(null)]
    public void Consentimento_VersaoDiferente_DeveRecusar(string? versao)
    {
        var request = new ResponderRsvpRequest("token", [], [], new ConsentimentoRsvpRequest(true, versao));

        var excecao = Assert.Throws<RegraNegocioException>(() => request.ParaConsentimento(DateTimeOffset.UnixEpoch));

        Assert.Equal(MensagensDadosSensiveis.TermoDesatualizado, excecao.Message);
    }

    [Theory]
    [InlineData("2027-05-15", "2027-06-14", false)]
    [InlineData("2027-05-15", "2027-06-15", true)]
    public void Opcoes_RetencaoEncerrada_SoDepoisDoPrazo(string dataCasamento, string hoje, bool encerrada)
    {
        var opcoes = new OpcoesRetencaoDadosSensiveis();

        Assert.Equal(encerrada, opcoes.RetencaoEncerrada(DateOnly.Parse(dataCasamento), DateOnly.Parse(hoje)));
        Assert.Equal(new DateOnly(2027, 6, 14), opcoes.DataExclusao(DateOnly.Parse(dataCasamento)));
    }

    [Theory]
    [InlineData(30, 360, true)]
    [InlineData(0, 360, false)]
    [InlineData(366, 360, false)]
    [InlineData(30, 0, false)]
    [InlineData(30, 1441, false)]
    public void Opcoes_Valida_DeveRespeitarFaixas(int dias, int intervalo, bool valida)
    {
        Assert.Equal(valida, new OpcoesRetencaoDadosSensiveis { DiasAposCasamento = dias, IntervaloMinutos = intervalo }.Valida());
    }
}
