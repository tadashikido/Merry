using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.DadosSensiveis;

public sealed partial class ExecutorRetencaoDadosSensiveis : IExecutorRetencaoDadosSensiveis
{
    private readonly IServiceScopeFactory _fabricaEscopos;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly OpcoesRetencaoDadosSensiveis _opcoes;
    private readonly ILogger<ExecutorRetencaoDadosSensiveis> _logger;

    public ExecutorRetencaoDadosSensiveis(
        IServiceScopeFactory fabricaEscopos,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IOptions<OpcoesRetencaoDadosSensiveis> opcoes,
        ILogger<ExecutorRetencaoDadosSensiveis> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _fabricaEscopos = fabricaEscopos;
        _calendario = calendario;
        _relogio = relogio;
        _opcoes = opcoes.Value;
        _logger = logger;
    }

    public async Task<int> ExecutarAsync(CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> organizacoes;

        await using (var escopo = _fabricaEscopos.CreateAsyncScope())
        {
            organizacoes = await escopo.ServiceProvider.GetRequiredService<IOrganizacaoRepository>().ListarIdsAsync(cancelamento);
        }

        var limite = _calendario.Hoje().AddDays(-_opcoes.DiasAposCasamento);
        var agora = _relogio.GetUtcNow();
        var total = 0;

        foreach (var organizacaoId in organizacoes)
        {
            cancelamento.ThrowIfCancellationRequested();

            await using var escopo = _fabricaEscopos.CreateAsyncScope();
            escopo.ServiceProvider.GetRequiredService<EscopoIsolamentoSistema>().Assumir(organizacaoId);
            total += await escopo.ServiceProvider.GetRequiredService<IDadosSensiveisRepository>()
                .AnonimizarVencidosAsync(limite, agora, cancelamento);
        }

        RegistrarExecucao(total, organizacoes.Count, _opcoes.DiasAposCasamento);
        return total;
    }

    [LoggerMessage(
        EventId = 9201,
        Level = LogLevel.Information,
        Message = "Retenção de dados sensíveis concluída: {Quantidade} registros anonimizados em {Organizacoes} organizações verificadas (prazo de {Dias} dias após o casamento).")]
    private partial void RegistrarExecucao(int quantidade, int organizacoes, int dias);
}
