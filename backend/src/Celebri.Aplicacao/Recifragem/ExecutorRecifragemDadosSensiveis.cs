using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Celebri.Aplicacao.Recifragem;

public sealed partial class ExecutorRecifragemDadosSensiveis : IExecutorRecifragemDadosSensiveis
{
    public const int TamanhoLotePadrao = 200;
    public const string TipoDadosSensiveis = "dados sensíveis de convidados";
    public const string TipoLinksCronograma = "links de cronograma";

    private readonly IServiceScopeFactory _fabricaEscopos;
    private readonly ICifradorDadosSensiveis _cifradorDadosSensiveis;
    private readonly ICifradorTokenCronograma _cifradorTokenCronograma;
    private readonly ILogger<ExecutorRecifragemDadosSensiveis> _logger;
    private readonly int _tamanhoLote;

    public ExecutorRecifragemDadosSensiveis(
        IServiceScopeFactory fabricaEscopos,
        ICifradorDadosSensiveis cifradorDadosSensiveis,
        ICifradorTokenCronograma cifradorTokenCronograma,
        ILogger<ExecutorRecifragemDadosSensiveis> logger)
        : this(fabricaEscopos, cifradorDadosSensiveis, cifradorTokenCronograma, logger, TamanhoLotePadrao)
    {
    }

    public ExecutorRecifragemDadosSensiveis(
        IServiceScopeFactory fabricaEscopos,
        ICifradorDadosSensiveis cifradorDadosSensiveis,
        ICifradorTokenCronograma cifradorTokenCronograma,
        ILogger<ExecutorRecifragemDadosSensiveis> logger,
        int tamanhoLote)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(tamanhoLote, 1);

        _fabricaEscopos = fabricaEscopos;
        _cifradorDadosSensiveis = cifradorDadosSensiveis;
        _cifradorTokenCronograma = cifradorTokenCronograma;
        _logger = logger;
        _tamanhoLote = tamanhoLote;
    }

    public async Task<ResultadoRecifragem> ExecutarAsync(CancellationToken cancelamento)
    {
        IReadOnlyList<Guid> organizacoes;

        await using (var escopo = _fabricaEscopos.CreateAsyncScope())
        {
            organizacoes = await escopo.ServiceProvider.GetRequiredService<IOrganizacaoRepository>().ListarIdsAsync(cancelamento);
        }

        var dadosSensiveis = ContagemRecifragem.Vazia;
        var linksCronograma = ContagemRecifragem.Vazia;

        foreach (var organizacaoId in organizacoes)
        {
            cancelamento.ThrowIfCancellationRequested();

            await using var escopo = _fabricaEscopos.CreateAsyncScope();
            escopo.ServiceProvider.GetRequiredService<EscopoIsolamentoSistema>().Assumir(organizacaoId);

            var repositorioDados = escopo.ServiceProvider.GetRequiredService<IDadosSensiveisRepository>();
            dadosSensiveis = dadosSensiveis.Somar(await RecifrarAsync(
                repositorioDados.ListarCifrasAsync,
                cifra => _cifradorDadosSensiveis.Recifrar(cifra.Conteudo, cifra.IdAssociado),
                repositorioDados.SubstituirCifrasAsync,
                cancelamento));

            var repositorioAcessos = escopo.ServiceProvider.GetRequiredService<IAcessoCronogramaRepository>();
            linksCronograma = linksCronograma.Somar(await RecifrarAsync(
                repositorioAcessos.ListarCifrasAsync,
                cifra => _cifradorTokenCronograma.Recifrar(cifra.Conteudo, cifra.IdAssociado),
                repositorioAcessos.SubstituirCifrasAsync,
                cancelamento));
        }

        RegistrarContagem(TipoDadosSensiveis, dadosSensiveis.Recifrados, dadosSensiveis.JaNaChaveAtual, dadosSensiveis.Ilegiveis, dadosSensiveis.Concorrentes, organizacoes.Count);
        RegistrarContagem(TipoLinksCronograma, linksCronograma.Recifrados, linksCronograma.JaNaChaveAtual, linksCronograma.Ilegiveis, linksCronograma.Concorrentes, organizacoes.Count);

        return new ResultadoRecifragem(dadosSensiveis, linksCronograma, organizacoes.Count);
    }

    private async Task<ContagemRecifragem> RecifrarAsync(
        Func<Guid?, int, CancellationToken, Task<IReadOnlyList<CifraArmazenada>>> listar,
        Func<CifraArmazenada, RecifragemCifra> recifrar,
        Func<IReadOnlyList<SubstituicaoCifra>, CancellationToken, Task<int>> substituir,
        CancellationToken cancelamento)
    {
        var contagem = ContagemRecifragem.Vazia;
        Guid? ultimoId = null;

        while (true)
        {
            cancelamento.ThrowIfCancellationRequested();

            var lote = await listar(ultimoId, _tamanhoLote, cancelamento);

            if (lote.Count == 0)
            {
                return contagem;
            }

            var substituicoes = new List<SubstituicaoCifra>();
            var jaNaChaveAtual = 0;
            var ilegiveis = 0;

            foreach (var cifra in lote)
            {
                var recifragem = recifrar(cifra);

                switch (recifragem.Situacao)
                {
                    case SituacaoCifra.ChaveAtual:
                        jaNaChaveAtual++;
                        break;
                    case SituacaoCifra.ChaveAnterior:
                        substituicoes.Add(new SubstituicaoCifra(cifra.Id, cifra.Conteudo, recifragem.NovoConteudo!));
                        break;
                    default:
                        ilegiveis++;
                        break;
                }
            }

            var recifrados = substituicoes.Count == 0 ? 0 : await substituir(substituicoes, cancelamento);

            contagem = contagem.Somar(new ContagemRecifragem(recifrados, jaNaChaveAtual, ilegiveis, substituicoes.Count - recifrados));
            ultimoId = lote[^1].Id;

            if (lote.Count < _tamanhoLote)
            {
                return contagem;
            }
        }
    }

    [LoggerMessage(
        EventId = 9211,
        Level = LogLevel.Information,
        Message = "Recifragem de {Tipo} concluída: {Recifrados} recifrados para a chave atual, {JaNaChaveAtual} já estavam na chave atual, {Ilegiveis} ilegíveis com as chaves configuradas e {Concorrentes} alterados durante a execução, em {Organizacoes} organizações.")]
    private partial void RegistrarContagem(string tipo, int recifrados, int jaNaChaveAtual, int ilegiveis, int concorrentes, int organizacoes);
}
