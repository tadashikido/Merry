using Celebri.Aplicacao.Confirmacoes;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using static Celebri.Testes.Unidade.Convidados.ConviteTestes;

namespace Celebri.Testes.Unidade.Confirmacoes;

public class CobrancaRsvpTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2027, 5, 7);
    private static readonly DateOnly DepoisDoPrazo = new(2027, 5, 13);

    private static Convite Enviado(Guid eventoId, string nome = "Família Souza")
    {
        var convite = Convite.Criar(eventoId, Dados(nome, null, 0, Pessoa("Carla"), Pessoa("Pedro")), Agora);
        convite.MarcarEnviado(Agora);
        return convite;
    }

    [Fact]
    public void RegistrarCobranca_ConviteEnviadoComPendente_DeveGravarInstanteEIncrementar()
    {
        var convite = Enviado(Guid.NewGuid());
        var depois = Agora.AddHours(3);

        convite.RegistrarCobranca(Agora);
        convite.RegistrarCobranca(depois);

        Assert.Equal(depois, convite.UltimaCobrancaEm);
        Assert.Equal(2, convite.QuantidadeCobrancas);
        Assert.Equal(depois, convite.AtualizadoEm);
        Assert.Equal(StatusEnvioConvite.Enviado, convite.StatusEnvio);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(RespostaRsvp.Pendente, pessoa.Resposta));
    }

    [Fact]
    public void Criar_DeveComecarSemCobranca()
    {
        var convite = Convite.Criar(Guid.NewGuid(), Dados(), Agora);

        Assert.Null(convite.UltimaCobrancaEm);
        Assert.Equal(0, convite.QuantidadeCobrancas);
    }

    [Fact]
    public void RegistrarCobranca_ConviteNaoEnviado_DeveLancarRegraDeNegocio()
    {
        var convite = Convite.Criar(Guid.NewGuid(), Dados(), Agora);

        var erro = Assert.Throws<RegraNegocioException>(() => convite.RegistrarCobranca(Agora));

        Assert.Equal(MensagensConvidados.ConviteNaoCobravel, erro.Message);
        Assert.Null(convite.UltimaCobrancaEm);
        Assert.Equal(0, convite.QuantidadeCobrancas);
    }

    [Fact]
    public void RegistrarCobranca_ConviteTodoRespondido_DeveLancarRegraDeNegocio()
    {
        var convite = Convite.Criar(Guid.NewGuid(), Dados("Rocha", null, 0, Pessoa("Caio", resposta: RespostaRsvp.Confirmado)), Agora);
        convite.MarcarEnviado(Agora);

        Assert.False(convite.PodeSerCobrado());
        Assert.Throws<RegraNegocioException>(() => convite.RegistrarCobranca(Agora));
    }

    [Fact]
    public void PodeSerCobrado_VisualizadoComPendente_DeveSerVerdadeiro()
    {
        var convite = Convite.Criar(Guid.NewGuid(), Dados(), Agora);
        convite.MarcarVisualizado(Agora);

        Assert.True(convite.PodeSerCobrado());
    }

    [Fact]
    public void Calcular_ConviteEnviadoComLinkEPrazoAberto_DeveSerCobravelSemCobranca()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje, new HashSet<Guid> { convite.Id });

        var pendente = Assert.Single(painel.Pendentes);
        Assert.True(pendente.Cobravel);
        Assert.Null(pendente.UltimaCobrancaEm);
        Assert.Equal(0, pendente.QuantidadeCobrancas);
    }

    [Fact]
    public void Calcular_DeveDevolverUltimaCobrancaEQuantidade()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);
        convite.RegistrarCobranca(Agora);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje, new HashSet<Guid> { convite.Id });

        var pendente = Assert.Single(painel.Pendentes);
        Assert.Equal(Agora, pendente.UltimaCobrancaEm);
        Assert.Equal(1, pendente.QuantidadeCobrancas);
    }

    [Fact]
    public void Calcular_SemLinkAtivo_NaoDeveSerCobravel()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje, new HashSet<Guid>());

        Assert.False(Assert.Single(painel.Pendentes).Cobravel);
    }

    [Fact]
    public void Calcular_NaoEnviado_NaoDeveSerCobravelMesmoComLink()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Convite.Criar(evento.Id, Dados(), Agora);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje, new HashSet<Guid> { convite.Id });

        Assert.False(Assert.Single(painel.Pendentes).Cobravel);
    }

    [Fact]
    public void Calcular_PrazoEncerrado_NenhumPendenteDeveSerCobravel()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], DepoisDoPrazo, new HashSet<Guid> { convite.Id });

        Assert.False(painel.Prazo.AceitaRespostas);
        Assert.False(Assert.Single(painel.Pendentes).Cobravel);
    }

    [Fact]
    public void Calcular_EventoArquivado_NenhumPendenteDeveSerCobravel()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);
        evento.Arquivar(Agora);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje, new HashSet<Guid> { convite.Id });

        Assert.False(Assert.Single(painel.Pendentes).Cobravel);
    }

    [Fact]
    public void Calcular_SobrecargaSemLinks_DeveManterContratoAnteriorSemCobraveis()
    {
        var evento = CalculadoraPainelConfirmacoesTestes.NovoEvento();
        var convite = Enviado(evento.Id);

        var painel = CalculadoraPainelConfirmacoes.Calcular(evento, [convite], Hoje);

        Assert.False(Assert.Single(painel.Pendentes).Cobravel);
    }
}
