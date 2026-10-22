using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Tarefas;

namespace Celebri.Testes.Unidade.Tarefas;

public class TarefaEventoTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2027, 3, 10);
    private static readonly Guid EventoId = Guid.NewGuid();

    private static DadosTarefa Dados(
        string? titulo = "Contratar fotógrafo",
        string? descricao = null,
        ResponsavelTarefa responsavel = ResponsavelTarefa.Assessoria,
        CategoriaTarefa categoria = CategoriaTarefa.Fornecedores,
        DateOnly? prazo = null)
    {
        return new DadosTarefa(titulo, descricao, responsavel, categoria, prazo);
    }

    private static TarefaEvento Criar(DateOnly? prazo = null, ResponsavelTarefa responsavel = ResponsavelTarefa.Assessoria)
    {
        return TarefaEvento.Criar(EventoId, Dados(prazo: prazo, responsavel: responsavel), Guid.NewGuid(), Agora);
    }

    [Fact]
    public void Criar_DeveIniciarAFazerSemOrganizacaoESemOrigem()
    {
        var usuario = Guid.NewGuid();

        var tarefa = TarefaEvento.Criar(EventoId, Dados(titulo: "  Contratar   fotógrafo  ", descricao: "   "), usuario, Agora);

        Assert.NotEqual(Guid.Empty, tarefa.Id);
        Assert.Equal(Guid.Empty, tarefa.OrganizacaoId);
        Assert.Equal(EventoId, tarefa.EventoId);
        Assert.Equal("Contratar fotógrafo", tarefa.Titulo);
        Assert.Null(tarefa.Descricao);
        Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
        Assert.True(tarefa.EstaAberta);
        Assert.Null(tarefa.OrigemModeloItemId);
        Assert.Equal(usuario, tarefa.CriadoPorUsuarioId);
        Assert.Equal(Agora, tarefa.CriadoEm);
        Assert.Equal(Agora, tarefa.AtualizadoEm);
        Assert.Null(tarefa.ConcluidaEm);
    }

    [Fact]
    public void Criar_ComOrigemDeModelo_DeveGuardarOItemDeOrigem()
    {
        var item = Guid.NewGuid();

        var tarefa = TarefaEvento.Criar(EventoId, Dados(), null, Agora, item);

        Assert.Equal(item, tarefa.OrigemModeloItemId);
    }

    [Fact]
    public void Entidade_DevePertencerAoEventoParaReceberOFiltroGlobal()
    {
        Assert.True(typeof(IPertenceEvento).IsAssignableFrom(typeof(TarefaEvento)));
        Assert.True(typeof(TarefaEvento).GetProperty(nameof(TarefaEvento.OrganizacaoId))!.SetMethod!.IsPrivate);
    }

    [Fact]
    public void Criar_SemEvento_DeveLancarArgumentException()
    {
        Assert.Throws<ArgumentException>(() => TarefaEvento.Criar(Guid.Empty, Dados(), null, Agora));
    }

    [Theory]
    [InlineData(null, MensagensTarefas.TituloObrigatorio)]
    [InlineData("   ", MensagensTarefas.TituloObrigatorio)]
    [InlineData("A", MensagensTarefas.TamanhoTitulo)]
    public void Criar_TituloInvalido_DeveLancarRegraDeNegocio(string? titulo, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => TarefaEvento.Criar(EventoId, Dados(titulo: titulo), null, Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Criar_TituloNoLimite_DeveAceitarEAcimaDeveRejeitar()
    {
        var limite = new string('a', TarefaEvento.TamanhoMaximoTitulo);

        Assert.Equal(limite, TarefaEvento.Criar(EventoId, Dados(titulo: limite), null, Agora).Titulo);
        Assert.Throws<RegraNegocioException>(() => TarefaEvento.Criar(EventoId, Dados(titulo: limite + "a"), null, Agora));
    }

    [Fact]
    public void Criar_DescricaoAcimaDoLimite_DeveLancarRegraDeNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            TarefaEvento.Criar(EventoId, Dados(descricao: new string('d', TarefaEvento.TamanhoMaximoDescricao + 1)), null, Agora));

        Assert.Equal(MensagensTarefas.TamanhoDescricao, excecao.Message);
    }

    [Fact]
    public void Criar_EnumsForaDaLista_DevemSerRejeitados()
    {
        Assert.Throws<RegraNegocioException>(() => TarefaEvento.Criar(EventoId, Dados(responsavel: (ResponsavelTarefa)9), null, Agora));
        Assert.Throws<RegraNegocioException>(() => TarefaEvento.Criar(EventoId, Dados(categoria: (CategoriaTarefa)99), null, Agora));
    }

    [Theory]
    [InlineData(1999, 12, 31)]
    [InlineData(2101, 1, 1)]
    public void Criar_PrazoForaDaFaixa_DeveLancarRegraDeNegocio(int ano, int mes, int dia)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            TarefaEvento.Criar(EventoId, Dados(prazo: new DateOnly(ano, mes, dia)), null, Agora));

        Assert.Equal(MensagensTarefas.PrazoForaDaFaixa, excecao.Message);
    }

    [Fact]
    public void Criar_PrazoNoPassadoOuAposOEvento_DeveSerPermitido()
    {
        Assert.Equal(Hoje.AddDays(-30), Criar(Hoje.AddDays(-30)).Prazo);
        Assert.Equal(new DateOnly(2100, 12, 31), Criar(new DateOnly(2100, 12, 31)).Prazo);
    }

    [Fact]
    public void Atualizar_DeveAplicarDadosEManterCriacao()
    {
        var tarefa = Criar();
        var depois = Agora.AddHours(2);

        tarefa.Atualizar(Dados(titulo: "Novo título", responsavel: ResponsavelTarefa.Anfitriao, categoria: CategoriaTarefa.Cerimonia, prazo: Hoje), depois);

        Assert.Equal("Novo título", tarefa.Titulo);
        Assert.Equal(ResponsavelTarefa.Anfitriao, tarefa.Responsavel);
        Assert.Equal(CategoriaTarefa.Cerimonia, tarefa.Categoria);
        Assert.Equal(Hoje, tarefa.Prazo);
        Assert.Equal(Agora, tarefa.CriadoEm);
        Assert.Equal(depois, tarefa.AtualizadoEm);
    }

    [Fact]
    public void AlterarStatus_ParaConcluida_DeveRegistrarAutorEDataEReabrirDeveLimpar()
    {
        var tarefa = Criar(Hoje.AddDays(-1));
        var usuario = Guid.NewGuid();

        tarefa.AlterarStatus(StatusTarefa.Concluida, ResponsavelTarefa.Anfitriao, usuario, Agora);

        Assert.Equal(StatusTarefa.Concluida, tarefa.Status);
        Assert.Equal(Agora, tarefa.ConcluidaEm);
        Assert.Equal(ResponsavelTarefa.Anfitriao, tarefa.ConcluidaPor);
        Assert.Equal(usuario, tarefa.ConcluidaPorUsuarioId);
        Assert.False(tarefa.EstaAtrasada(Hoje));

        tarefa.AlterarStatus(StatusTarefa.AFazer, ResponsavelTarefa.Assessoria, Guid.NewGuid(), Agora.AddMinutes(1));

        Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
        Assert.Null(tarefa.ConcluidaEm);
        Assert.Null(tarefa.ConcluidaPor);
        Assert.Null(tarefa.ConcluidaPorUsuarioId);
        Assert.True(tarefa.EstaAtrasada(Hoje));
    }

    [Fact]
    public void AlterarStatus_MesmoStatus_NaoDeveAlterarNada()
    {
        var tarefa = Criar();

        tarefa.AlterarStatus(StatusTarefa.AFazer, ResponsavelTarefa.Assessoria, null, Agora.AddDays(1));

        Assert.Equal(Agora, tarefa.AtualizadoEm);
    }

    [Fact]
    public void AlterarStatus_Invalido_DeveLancarRegraDeNegocio()
    {
        var tarefa = Criar();

        Assert.Throws<RegraNegocioException>(() => tarefa.AlterarStatus((StatusTarefa)42, ResponsavelTarefa.Assessoria, null, Agora));
    }

    [Theory]
    [InlineData(-1, StatusTarefa.AFazer, true)]
    [InlineData(-1, StatusTarefa.EmAndamento, true)]
    [InlineData(-1, StatusTarefa.Concluida, false)]
    [InlineData(-1, StatusTarefa.Cancelada, false)]
    [InlineData(0, StatusTarefa.AFazer, false)]
    [InlineData(5, StatusTarefa.AFazer, false)]
    public void EstaAtrasada_DeveConsiderarPrazoAnteriorAHojeEStatusAberto(int dias, StatusTarefa status, bool esperado)
    {
        var tarefa = Criar(Hoje.AddDays(dias));
        tarefa.AlterarStatus(status, ResponsavelTarefa.Assessoria, null, Agora);

        Assert.Equal(esperado, tarefa.EstaAtrasada(Hoje));
    }

    [Fact]
    public void EstaAtrasada_SemPrazo_NuncaEstaAtrasada()
    {
        Assert.False(Criar().EstaAtrasada(Hoje));
        Assert.False(Criar().VenceNaSemana(Hoje));
        Assert.Null(Criar().DiasParaPrazo(Hoje));
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(6, true)]
    [InlineData(7, false)]
    public void VenceNaSemana_DeveCobrirHojeAteSeisDiasDepois(int dias, bool esperado)
    {
        var tarefa = Criar(Hoje.AddDays(dias));

        Assert.Equal(esperado, tarefa.VenceNaSemana(Hoje));
        Assert.Equal(dias, tarefa.DiasParaPrazo(Hoje));
    }

    [Fact]
    public void VenceNaSemana_TarefaCancelada_NaoDeveContar()
    {
        var tarefa = Criar(Hoje);
        tarefa.AlterarStatus(StatusTarefa.Cancelada, ResponsavelTarefa.Assessoria, null, Agora);

        Assert.False(tarefa.VenceNaSemana(Hoje));
        Assert.False(tarefa.EstaAberta);
    }

    [Fact]
    public void FimJanelaSemana_DeveSerHojeMaisSeisDias()
    {
        Assert.Equal(Hoje.AddDays(6), TarefaEvento.FimJanelaSemana(Hoje));
    }
}
