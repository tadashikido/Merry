using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Tarefas;

public class TarefaCasamentoService : ITarefaCasamentoService
{
    public const int LimitePendenciasPorGrupo = 50;

    private static readonly StatusTarefa[] StatusPermitidosCasal = [StatusTarefa.AFazer, StatusTarefa.Concluida];

    private readonly ICasamentoRepository _casamentoRepository;
    private readonly ITarefaCasamentoRepository _tarefaRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public TarefaCasamentoService(
        ICasamentoRepository casamentoRepository,
        ITarefaCasamentoRepository tarefaRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _casamentoRepository = casamentoRepository;
        _tarefaRepository = tarefaRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ListaTarefasDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var responsavel = ResponsavelVisivel();
        var tarefas = await _tarefaRepository.ListarPorCasamentoAsync(casamento.Id, responsavel, cancelamento);
        var hoje = _calendario.Hoje();

        return new ListaTarefasDto(
            OrdenacaoTarefas.Ordenar(tarefas).Select(tarefa => ParaDto(tarefa, hoje)).ToList(),
            OrdenacaoTarefas.Resumir(tarefas, hoje),
            casamento.Arquivado,
            responsavel is not null);
    }

    public async Task<TarefaDto> ObterAsync(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var tarefa = await ObterTarefaAsync(casamento.Id, tarefaId, cancelamento);
        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> CriarAsync(Guid casamentoId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);

        if (await _tarefaRepository.ContarPorCasamentoAsync(casamento.Id, cancelamento) >= TarefaCasamento.LimitePorCasamento)
        {
            throw new RegraNegocioException(MensagensTarefas.LimitePorCasamento);
        }

        var tarefa = TarefaCasamento.Criar(casamento.Id, request.ParaDados(), _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        _tarefaRepository.Adicionar(tarefa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> AtualizarAsync(Guid casamentoId, Guid tarefaId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var tarefa = await ObterTarefaAsync(casamento.Id, tarefaId, cancelamento);

        tarefa.Atualizar(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> AlterarStatusAsync(
        Guid casamentoId,
        Guid tarefaId,
        AlterarStatusTarefaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var tarefa = await ObterTarefaAsync(casamento.Id, tarefaId, cancelamento);
        var status = request.Status ?? throw new RegraNegocioException(MensagensTarefas.StatusObrigatorio);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        if (!ehAssessoria && !StatusPermitidosCasal.Contains(status))
        {
            throw new RegraNegocioException(MensagensTarefas.StatusNaoPermitidoCasal);
        }

        var autor = ehAssessoria ? ResponsavelTarefa.Assessoria : ResponsavelTarefa.Casal;
        tarefa.AlterarStatus(status, autor, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task RemoverAsync(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var tarefa = await ObterTarefaAsync(casamento.Id, tarefaId, cancelamento);

        _tarefaRepository.Remover(tarefa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<PendenciasTarefasDto> ObterPendenciasAsync(CancellationToken cancelamento)
    {
        var hoje = _calendario.Hoje();
        var pendencias = await _tarefaRepository.ListarPendenciasAsync(hoje, LimitePendenciasPorGrupo, cancelamento);

        return new PendenciasTarefasDto(
            pendencias.TotalAtrasadas,
            pendencias.TotalEstaSemana,
            pendencias.CasamentosComAtraso,
            pendencias.Atrasadas.Select(tarefa => ParaDto(tarefa, hoje)).ToList(),
            pendencias.EstaSemana.Select(tarefa => ParaDto(tarefa, hoje)).ToList());
    }

    public static TarefaDto ParaDto(TarefaCasamento tarefa, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(tarefa);

        return new TarefaDto(
            tarefa.Id,
            tarefa.Titulo,
            tarefa.Descricao,
            tarefa.Responsavel.ToString(),
            tarefa.Categoria.ToString(),
            tarefa.Status.ToString(),
            tarefa.Prazo,
            tarefa.EstaAtrasada(hoje),
            tarefa.VenceNaSemana(hoje),
            tarefa.DiasParaPrazo(hoje),
            tarefa.ConcluidaEm,
            tarefa.ConcluidaPor?.ToString(),
            tarefa.OrigemModeloItemId is not null,
            tarefa.CriadoEm,
            tarefa.AtualizadoEm);
    }

    public static TarefaPendenteDto ParaDto(TarefaPendente tarefa, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(tarefa);

        return new TarefaPendenteDto(
            tarefa.Id,
            tarefa.CasamentoId,
            tarefa.NomePrimeiraPessoa,
            tarefa.NomeSegundaPessoa,
            tarefa.Titulo,
            tarefa.Responsavel.ToString(),
            tarefa.Categoria.ToString(),
            tarefa.Status.ToString(),
            tarefa.Prazo,
            tarefa.Prazo.DayNumber - hoje.DayNumber);
    }

    private ResponsavelTarefa? ResponsavelVisivel()
    {
        return _usuarioAtual.EhAssessoria() ? null : ResponsavelTarefa.Casal;
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<CasamentoAssessorado> ObterCasamentoEditavelAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensCasamento.ArquivadoSemEdicao);
        }

        return casamento;
    }

    private async Task<TarefaCasamento> ObterTarefaAsync(Guid casamentoId, Guid tarefaId, CancellationToken cancelamento)
    {
        return await _tarefaRepository.ObterPorIdAsync(casamentoId, tarefaId, ResponsavelVisivel(), cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensTarefas.NaoEncontrada);
    }
}
