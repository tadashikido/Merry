using Casamento.Api.Tarefas;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.UsuarioAtual;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Casamento.Testes.Unidade.DadosSensiveis;

public class RetencaoDadosSensiveisTestes
{
    private static string DiretorioFontes()
    {
        var diretorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (diretorio is not null && !Directory.Exists(Path.Combine(diretorio.FullName, "src", "Casamento.Aplicacao")))
        {
            diretorio = diretorio.Parent;
        }

        return Path.Combine(diretorio?.FullName ?? throw new DirectoryNotFoundException("Pasta backend/src não encontrada."), "src");
    }

    private static IEnumerable<(string Arquivo, string Conteudo)> Fontes()
    {
        return Directory.EnumerateFiles(DiretorioFontes(), "*.cs", SearchOption.AllDirectories)
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Select(arquivo => (arquivo, File.ReadAllText(arquivo)));
    }

    [Fact]
    public void EscopoSistema_SoPodeSerAssumidoPeloExecutorDeRetencao()
    {
        var chamadores = Fontes()
            .Where(fonte => fonte.Conteudo.Contains(".Assumir(", StringComparison.Ordinal))
            .Select(fonte => Path.GetFileName(fonte.Arquivo))
            .ToList();

        Assert.Equal(["ExecutorRetencaoDadosSensiveis.cs"], chamadores);
    }

    [Fact]
    public void CodigoDeDadosSensiveis_NaoDeveLogarConteudo()
    {
        var violacoes = Fontes()
            .Where(fonte => fonte.Arquivo.Contains("DadosSensiveis", StringComparison.Ordinal) || fonte.Arquivo.Contains("RestricoesAlimentares", StringComparison.Ordinal))
            .SelectMany(fonte => fonte.Conteudo.Split('\n').Select(linha => (fonte.Arquivo, Linha: linha)))
            .Where(item => item.Linha.Contains("Log", StringComparison.Ordinal)
                && (item.Linha.Contains("Restricao.", StringComparison.Ordinal)
                    || item.Linha.Contains("OutraRestricao", StringComparison.Ordinal)
                    || item.Linha.Contains("NecessidadeEspecial", StringComparison.Ordinal)
                    || item.Linha.Contains("ConteudoCifrado", StringComparison.Ordinal)))
            .Select(item => $"{Path.GetFileName(item.Arquivo)}: {item.Linha.Trim()}")
            .ToList();

        Assert.Empty(violacoes);
    }

    [Fact]
    public void EscopoSistema_DeveSerAssumidoUmaUnicaVez()
    {
        var escopo = new EscopoIsolamentoSistema();
        var organizacao = Guid.NewGuid();

        escopo.Assumir(organizacao);

        Assert.Equal(organizacao, escopo.OrganizacaoId);
        Assert.Throws<InvalidOperationException>(() => escopo.Assumir(Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => new EscopoIsolamentoSistema().Assumir(Guid.Empty));
    }

    [Fact]
    public void ContextoRequisicao_EscopoSistema_DevePrevalecerSobreUsuarioMasNaoSobreRsvp()
    {
        var sistema = new EscopoIsolamentoSistema();
        var rsvp = new EscopoIsolamentoRsvp();
        var usuario = Guid.NewGuid();
        var contexto = new ContextoIsolamentoRequisicao(new ContextoIsolamentoUsuarioAtual(new UsuarioFixo(usuario)), rsvp, new EscopoIsolamentoAcessoCasal(), sistema, new EscopoIsolamentoCronogramaPublico());

        Assert.Equal(usuario, contexto.OrganizacaoId);

        var organizacaoSistema = Guid.NewGuid();
        sistema.Assumir(organizacaoSistema);
        Assert.Equal(organizacaoSistema, contexto.OrganizacaoId);

        var organizacaoRsvp = Guid.NewGuid();
        rsvp.Estabelecer(organizacaoRsvp, Guid.NewGuid());
        Assert.Equal(organizacaoRsvp, contexto.OrganizacaoId);
    }

    [Fact]
    public async Task Tarefa_FalhaNoExecutor_DeveLogarSoOTipoESeguir()
    {
        var logs = new RegistroLogsMemoria<TarefaRetencaoDadosSensiveis>();
        var tarefa = new TarefaRetencaoDadosSensiveis(
            new ExecutorFalho(),
            Options.Create(new OpcoesRetencaoDadosSensiveis()),
            logs);

        await tarefa.ExecutarCicloAsync(CancellationToken.None);

        var (nivel, mensagem, excecao) = Assert.Single(logs.Entradas);
        Assert.Equal(LogLevel.Error, nivel);
        Assert.Contains(nameof(InvalidOperationException), mensagem, StringComparison.Ordinal);
        Assert.DoesNotContain("SemGluten", mensagem, StringComparison.Ordinal);
        Assert.Null(excecao);
    }

    [Fact]
    public async Task Tarefa_Cancelada_DevePropagarCancelamento()
    {
        using var cancelamento = new CancellationTokenSource();
        await cancelamento.CancelAsync();
        var tarefa = new TarefaRetencaoDadosSensiveis(
            new ExecutorCancelavel(),
            Options.Create(new OpcoesRetencaoDadosSensiveis()),
            new RegistroLogsMemoria<TarefaRetencaoDadosSensiveis>());

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => tarefa.ExecutarCicloAsync(cancelamento.Token));
    }

    private sealed class ExecutorFalho : IExecutorRetencaoDadosSensiveis
    {
        public Task<int> ExecutarAsync(CancellationToken cancelamento)
        {
            throw new InvalidOperationException("detalhe SemGluten que não pode ir para o log");
        }
    }

    private sealed class ExecutorCancelavel : IExecutorRetencaoDadosSensiveis
    {
        public Task<int> ExecutarAsync(CancellationToken cancelamento)
        {
            cancelamento.ThrowIfCancellationRequested();
            return Task.FromResult(0);
        }
    }

    private sealed class UsuarioFixo : IUsuarioAtual
    {
        public UsuarioFixo(Guid organizacaoId)
        {
            OrganizacaoId = organizacaoId;
        }

        public bool Autenticado => true;

        public Guid? UsuarioId => Guid.NewGuid();

        public Guid? OrganizacaoId { get; }

        public Guid? CasamentoId => null;

        public string? Papel => "Dono";
    }
}
