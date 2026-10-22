using System.Globalization;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Casamentos;

public class CasamentoService : ICasamentoService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IChecklistRepository _checklistRepository;

    public CasamentoService(
        ICasamentoRepository casamentoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        IChecklistRepository checklistRepository)
    {
        _checklistRepository = checklistRepository;
        _usuarioAtual = usuarioAtual;
        _casamentoRepository = casamentoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
    }

    public async Task<IReadOnlyList<CasamentoResumoDto>> ListarAsync(SituacaoListagemCasamentos situacao, CancellationToken cancelamento)
    {
        var arquivados = situacao switch
        {
            SituacaoListagemCasamentos.Ativos => false,
            SituacaoListagemCasamentos.Arquivados => true,
            _ => throw new RegraNegocioException(MensagensCasamento.SituacaoInvalida),
        };

        var casamentos = await _casamentoRepository.ListarAsync(arquivados, cancelamento);
        var hoje = _calendario.Hoje();
        var ordenados = arquivados
            ? OrdenacaoCasamentos.OrdenarArquivados(casamentos)
            : OrdenacaoCasamentos.OrdenarAtivos(casamentos, hoje);

        return ordenados.Select(casamento => ParaResumo(casamento, hoje)).ToList();
    }

    public async Task<CasamentoDto> ObterAsync(Guid id, CancellationToken cancelamento)
    {
        var casamento = await ObterExistenteAsync(id, cancelamento);
        return await ParaDtoComChecklistAsync(casamento, cancelamento);
    }

    public async Task<CasamentoDto> CriarAsync(SalvarCasamentoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = CasamentoAssessorado.Criar(request.ParaDados(), _relogio.GetUtcNow());
        _casamentoRepository.Adicionar(casamento);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(casamento, _calendario.Hoje(), _usuarioAtual.EhAssessoria());
    }

    public async Task<CasamentoDto> AtualizarAsync(Guid id, SalvarCasamentoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterExistenteAsync(id, cancelamento);
        casamento.Atualizar(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(casamento, cancelamento);
    }

    public async Task<CasamentoDto> ArquivarAsync(Guid id, CancellationToken cancelamento)
    {
        var casamento = await ObterExistenteAsync(id, cancelamento);
        casamento.Arquivar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(casamento, cancelamento);
    }

    public async Task<CasamentoDto> RestaurarAsync(Guid id, CancellationToken cancelamento)
    {
        var casamento = await ObterExistenteAsync(id, cancelamento);
        casamento.Restaurar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(casamento, cancelamento);
    }

    public static string? FormatarHorario(TimeOnly? horario)
    {
        return horario?.ToString(SalvarCasamentoRequest.FormatoHorario, CultureInfo.InvariantCulture);
    }

    public static CasamentoResumoDto ParaResumo(CasamentoAssessorado casamento, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(casamento);

        return new CasamentoResumoDto(
            casamento.Id,
            casamento.NomePrimeiraPessoa,
            casamento.NomeSegundaPessoa,
            casamento.Data,
            FormatarHorario(casamento.Horario),
            casamento.LocalCerimonia,
            casamento.ConvidadosEstimados,
            casamento.CalcularFase(hoje).ToString(),
            casamento.CalcularDiasRestantes(hoje),
            casamento.Arquivado);
    }

    public static CasamentoDto ParaDto(CasamentoAssessorado casamento, DateOnly hoje)
    {
        return ParaDto(casamento, hoje, exibirDadosInternos: true);
    }

    public static CasamentoDto ParaDto(CasamentoAssessorado casamento, DateOnly hoje, bool exibirDadosInternos)
    {
        ArgumentNullException.ThrowIfNull(casamento);

        return new CasamentoDto(
            casamento.Id,
            casamento.NomePrimeiraPessoa,
            casamento.NomeSegundaPessoa,
            casamento.Data,
            FormatarHorario(casamento.Horario),
            casamento.LocalCerimonia,
            casamento.LocalRecepcao,
            casamento.ConvidadosEstimados,
            exibirDadosInternos ? casamento.Observacoes : null,
            casamento.CalcularFase(hoje).ToString(),
            casamento.CalcularDiasRestantes(hoje),
            casamento.Arquivado,
            casamento.ArquivadoEm,
            casamento.CriadoEm,
            casamento.AtualizadoEm,
            casamento.DataLimiteRsvp,
            casamento.DataLimiteRsvpEfetiva());
    }

    private async Task<CasamentoDto> ParaDtoComChecklistAsync(CasamentoAssessorado casamento, CancellationToken cancelamento)
    {
        var ehAssessoria = _usuarioAtual.EhAssessoria();
        var dto = ParaDto(casamento, _calendario.Hoje(), ehAssessoria);

        if (!ehAssessoria)
        {
            return dto;
        }

        var progresso = await _checklistRepository.ObterProgressoAsync(casamento.Id, cancelamento);
        return dto with { PercentualChecklist = progresso.Percentual };
    }

    private async Task<CasamentoAssessorado> ObterExistenteAsync(Guid id, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }
}
