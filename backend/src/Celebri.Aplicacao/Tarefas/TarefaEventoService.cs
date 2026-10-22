using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Tarefas;

public class TarefaEventoService : ITarefaEventoService
{
    public const int LimitePendenciasPorGrupo = 50;

    private static readonly StatusTarefa[] StatusPermitidosAnfitriao = [StatusTarefa.AFazer, StatusTarefa.Concluida];

    private readonly IEventoRepository _eventoRepository;
    private readonly ITarefaEventoRepository _tarefaRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public TarefaEventoService(
        IEventoRepository eventoRepository,
        ITarefaEventoRepository tarefaRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _tarefaRepository = tarefaRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ListaTarefasDto> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var responsavel = ResponsavelVisivel();
        var tarefas = await _tarefaRepository.ListarPorEventoAsync(evento.Id, responsavel, cancelamento);
        var hoje = _calendario.Hoje();

        return new ListaTarefasDto(
            OrdenacaoTarefas.Ordenar(tarefas).Select(tarefa => ParaDto(tarefa, hoje)).ToList(),
            OrdenacaoTarefas.Resumir(tarefas, hoje),
            evento.Arquivado,
            responsavel is not null);
    }

    public async Task<TarefaDto> ObterAsync(Guid eventoId, Guid tarefaId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var tarefa = await ObterTarefaAsync(evento.Id, tarefaId, cancelamento);
        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> CriarAsync(Guid eventoId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);

        if (await _tarefaRepository.ContarPorEventoAsync(evento.Id, cancelamento) >= TarefaEvento.LimitePorEvento)
        {
            throw new RegraNegocioException(MensagensTarefas.LimitePorEvento);
        }

        var tarefa = TarefaEvento.Criar(evento.Id, request.ParaDados(), _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        _tarefaRepository.Adicionar(tarefa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> AtualizarAsync(Guid eventoId, Guid tarefaId, SalvarTarefaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var tarefa = await ObterTarefaAsync(evento.Id, tarefaId, cancelamento);

        tarefa.Atualizar(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task<TarefaDto> AlterarStatusAsync(
        Guid eventoId,
        Guid tarefaId,
        AlterarStatusTarefaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var tarefa = await ObterTarefaAsync(evento.Id, tarefaId, cancelamento);
        var status = request.Status ?? throw new RegraNegocioException(MensagensTarefas.StatusObrigatorio);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        if (!ehAssessoria && !StatusPermitidosAnfitriao.Contains(status))
        {
            throw new RegraNegocioException(MensagensTarefas.StatusNaoPermitidoAnfitriao);
        }

        var autor = ehAssessoria ? ResponsavelTarefa.Assessoria : ResponsavelTarefa.Anfitriao;
        tarefa.AlterarStatus(status, autor, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(tarefa, _calendario.Hoje());
    }

    public async Task RemoverAsync(Guid eventoId, Guid tarefaId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var tarefa = await ObterTarefaAsync(evento.Id, tarefaId, cancelamento);

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
            pendencias.EventosComAtraso,
            pendencias.Atrasadas.Select(tarefa => ParaDto(tarefa, hoje)).ToList(),
            pendencias.EstaSemana.Select(tarefa => ParaDto(tarefa, hoje)).ToList());
    }

    public static TarefaDto ParaDto(TarefaEvento tarefa, DateOnly hoje)
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
            tarefa.EventoId,
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
        return _usuarioAtual.EhAssessoria() ? null : ResponsavelTarefa.Anfitriao;
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<Evento> ObterEventoEditavelAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        return evento;
    }

    private async Task<TarefaEvento> ObterTarefaAsync(Guid eventoId, Guid tarefaId, CancellationToken cancelamento)
    {
        return await _tarefaRepository.ObterPorIdAsync(eventoId, tarefaId, ResponsavelVisivel(), cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensTarefas.NaoEncontrada);
    }
}
