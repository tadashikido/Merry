using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Casamentos;

public class DuplicacaoCasamentoService : IDuplicacaoCasamentoService
{
    public const string CampoData = "data";

    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IDuplicacaoCasamentoRepository _duplicacaoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public DuplicacaoCasamentoService(
        ICasamentoRepository casamentoRepository,
        IDuplicacaoCasamentoRepository duplicacaoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _casamentoRepository = casamentoRepository;
        _duplicacaoRepository = duplicacaoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<PreviaDuplicacaoDto> PreverAsync(Guid casamentoOrigemId, DateOnly? novaData, CancellationToken cancelamento)
    {
        if (novaData is { } data && (data < CasamentoAssessorado.DataMinima || data > CasamentoAssessorado.DataMaxima))
        {
            throw new RegraNegocioException(MensagensCasamento.DataForaDaFaixa, CampoData);
        }

        var origem = await ObterOrigemAsync(casamentoOrigemId, cancelamento);
        var hoje = _calendario.Hoje();
        var plano = await MontarPlanoAsync(
            origem,
            novaData,
            hoje,
            new OpcoesCopia(Tarefas: true, Fornecedores: true, Cronograma: true),
            cancelamento);

        return new PreviaDuplicacaoDto(
            CasamentoService.ParaResumo(origem, hoje),
            plano.Tarefas.Count,
            plano.TarefasDoChecklist,
            plano.NascemAtrasadas,
            plano.TarefasCanceladasIgnoradas,
            plano.Vinculos.Count,
            plano.FornecedoresIgnorados,
            plano.ItensCronograma.Count);
    }

    public async Task<DuplicacaoCasamentoDto> DuplicarAsync(
        Guid casamentoOrigemId,
        DuplicarCasamentoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var origem = await ObterOrigemAsync(casamentoOrigemId, cancelamento);
        var agora = _relogio.GetUtcNow();
        var hoje = _calendario.Hoje();
        var casamento = CasamentoAssessorado.Criar(request.ParaDados(), agora);
        var plano = await MontarPlanoAsync(
            origem,
            casamento.Data,
            hoje,
            new OpcoesCopia(request.CopiarTarefas, request.CopiarFornecedores, request.CopiarCronograma),
            cancelamento);

        var usuarioId = _usuarioAtual.UsuarioId;
        var tarefas = plano.GerarTarefas(casamento.Id, usuarioId, agora);
        var vinculos = plano.GerarVinculos(casamento.Id, usuarioId, agora);
        var itensCronograma = plano.GerarItensCronograma(origem, casamento, vinculos, usuarioId, agora);

        _casamentoRepository.Adicionar(casamento);
        _duplicacaoRepository.AdicionarTarefas(tarefas);
        _duplicacaoRepository.AdicionarVinculos(vinculos);
        _duplicacaoRepository.AdicionarItensCronograma(itensCronograma);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        var dto = CasamentoService.ParaDto(casamento, hoje, exibirDadosInternos: true) with
        {
            PercentualChecklist = plano.TarefasDoChecklist > 0 ? 0 : null,
        };

        return new DuplicacaoCasamentoDto(dto, tarefas.Count, vinculos.Count, itensCronograma.Count);
    }

    private async Task<PlanoDuplicacaoCasamento> MontarPlanoAsync(
        CasamentoAssessorado origem,
        DateOnly? novaData,
        DateOnly hoje,
        OpcoesCopia opcoes,
        CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaParaDuplicar> tarefas = opcoes.Tarefas
            ? await _duplicacaoRepository.ListarTarefasAsync(origem.Id, cancelamento)
            : [];
        IReadOnlyList<VinculoParaDuplicar> vinculos = opcoes.Fornecedores
            ? await _duplicacaoRepository.ListarVinculosAsync(origem.Id, cancelamento)
            : [];
        IReadOnlyList<ItemCronograma> itensCronograma = opcoes.Cronograma
            ? await _duplicacaoRepository.ListarItensCronogramaAsync(origem.Id, cancelamento)
            : [];

        return PlanoDuplicacaoCasamento.Montar(origem.Data, novaData, hoje, tarefas, vinculos, itensCronograma);
    }

    private async Task<CasamentoAssessorado> ObterOrigemAsync(Guid id, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private sealed record OpcoesCopia(bool Tarefas, bool Fornecedores, bool Cronograma);
}
