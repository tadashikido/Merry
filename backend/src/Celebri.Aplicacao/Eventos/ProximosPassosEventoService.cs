using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Eventos;

public class ProximosPassosEventoService : IProximosPassosEventoService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IAcessoAnfitriaoRepository _acessoAnfitriaoRepository;
    private readonly IChecklistRepository _checklistRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly TimeProvider _relogio;

    public ProximosPassosEventoService(
        IEventoRepository eventoRepository,
        IAcessoAnfitriaoRepository acessoAnfitriaoRepository,
        IChecklistRepository checklistRepository,
        IConviteRepository conviteRepository,
        TimeProvider relogio)
    {
        _eventoRepository = eventoRepository;
        _acessoAnfitriaoRepository = acessoAnfitriaoRepository;
        _checklistRepository = checklistRepository;
        _conviteRepository = conviteRepository;
        _relogio = relogio;
    }

    public async Task<ProximosPassosEventoDto> ObterAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);

        var acessos = await _acessoAnfitriaoRepository.ListarNaoRevogadosAsync(evento.Id, cancelamento);
        var progresso = await _checklistRepository.ObterProgressoAsync(evento.Id, cancelamento);
        var envio = await _conviteRepository.ObterResumoEnvioAsync(evento.Id, cancelamento);
        var agora = _relogio.GetUtcNow();

        return CalculadoraProximosPassos.Calcular(
            acessos.Select(acesso => acesso.Situacao(agora)).ToList(),
            progresso,
            envio);
    }
}
