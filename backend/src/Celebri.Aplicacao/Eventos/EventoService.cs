using System.Globalization;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Eventos;

public class EventoService : IEventoService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IChecklistRepository _checklistRepository;

    public EventoService(
        IEventoRepository eventoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        IChecklistRepository checklistRepository)
    {
        _checklistRepository = checklistRepository;
        _usuarioAtual = usuarioAtual;
        _eventoRepository = eventoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
    }

    public async Task<IReadOnlyList<EventoResumoDto>> ListarAsync(SituacaoListagemEventos situacao, CancellationToken cancelamento)
    {
        var arquivados = situacao switch
        {
            SituacaoListagemEventos.Ativos => false,
            SituacaoListagemEventos.Arquivados => true,
            _ => throw new RegraNegocioException(MensagensEvento.SituacaoInvalida),
        };

        var eventos = await _eventoRepository.ListarAsync(arquivados, cancelamento);
        var hoje = _calendario.Hoje();
        var ordenados = arquivados
            ? OrdenacaoEventos.OrdenarArquivados(eventos)
            : OrdenacaoEventos.OrdenarAtivos(eventos, hoje);

        return ordenados.Select(evento => ParaResumo(evento, hoje)).ToList();
    }

    public async Task<EventoDto> ObterAsync(Guid id, CancellationToken cancelamento)
    {
        var evento = await ObterExistenteAsync(id, cancelamento);
        return await ParaDtoComChecklistAsync(evento, cancelamento);
    }

    public async Task<EventoDto> CriarAsync(SalvarEventoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = Evento.Criar(request.ParaDados(), _relogio.GetUtcNow());
        _eventoRepository.Adicionar(evento);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(evento, _calendario.Hoje(), _usuarioAtual.EhAssessoria());
    }

    public async Task<EventoDto> AtualizarAsync(Guid id, SalvarEventoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterExistenteAsync(id, cancelamento);
        evento.Atualizar(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(evento, cancelamento);
    }

    public async Task<EventoDto> ArquivarAsync(Guid id, CancellationToken cancelamento)
    {
        var evento = await ObterExistenteAsync(id, cancelamento);
        evento.Arquivar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(evento, cancelamento);
    }

    public async Task<EventoDto> RestaurarAsync(Guid id, CancellationToken cancelamento)
    {
        var evento = await ObterExistenteAsync(id, cancelamento);
        evento.Restaurar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await ParaDtoComChecklistAsync(evento, cancelamento);
    }

    public static string? FormatarHorario(TimeOnly? horario)
    {
        return horario?.ToString(SalvarEventoRequest.FormatoHorario, CultureInfo.InvariantCulture);
    }

    public static EventoResumoDto ParaResumo(Evento evento, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(evento);

        return new EventoResumoDto(
            evento.Id,
            evento.NomePrimeiraPessoa,
            evento.NomeSegundaPessoa,
            evento.Data,
            FormatarHorario(evento.Horario),
            evento.LocalCerimonia,
            evento.ConvidadosEstimados,
            evento.CalcularFase(hoje).ToString(),
            evento.CalcularDiasRestantes(hoje),
            evento.Arquivado);
    }

    public static EventoDto ParaDto(Evento evento, DateOnly hoje)
    {
        return ParaDto(evento, hoje, exibirDadosInternos: true);
    }

    public static EventoDto ParaDto(Evento evento, DateOnly hoje, bool exibirDadosInternos)
    {
        ArgumentNullException.ThrowIfNull(evento);

        return new EventoDto(
            evento.Id,
            evento.NomePrimeiraPessoa,
            evento.NomeSegundaPessoa,
            evento.Data,
            FormatarHorario(evento.Horario),
            evento.LocalCerimonia,
            evento.LocalRecepcao,
            evento.ConvidadosEstimados,
            exibirDadosInternos ? evento.Observacoes : null,
            evento.CalcularFase(hoje).ToString(),
            evento.CalcularDiasRestantes(hoje),
            evento.Arquivado,
            evento.ArquivadoEm,
            evento.CriadoEm,
            evento.AtualizadoEm,
            evento.DataLimiteRsvp,
            evento.DataLimiteRsvpEfetiva());
    }

    private async Task<EventoDto> ParaDtoComChecklistAsync(Evento evento, CancellationToken cancelamento)
    {
        var ehAssessoria = _usuarioAtual.EhAssessoria();
        var dto = ParaDto(evento, _calendario.Hoje(), ehAssessoria);

        if (!ehAssessoria)
        {
            return dto;
        }

        var progresso = await _checklistRepository.ObterProgressoAsync(evento.Id, cancelamento);
        return dto with { PercentualChecklist = progresso.Percentual };
    }

    private async Task<Evento> ObterExistenteAsync(Guid id, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }
}
