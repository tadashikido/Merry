using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;

namespace Casamento.Aplicacao.Casamentos;

public class ProximosPassosCasamentoService : IProximosPassosCasamentoService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IAcessoCasalRepository _acessoCasalRepository;
    private readonly IChecklistRepository _checklistRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly TimeProvider _relogio;

    public ProximosPassosCasamentoService(
        ICasamentoRepository casamentoRepository,
        IAcessoCasalRepository acessoCasalRepository,
        IChecklistRepository checklistRepository,
        IConviteRepository conviteRepository,
        TimeProvider relogio)
    {
        _casamentoRepository = casamentoRepository;
        _acessoCasalRepository = acessoCasalRepository;
        _checklistRepository = checklistRepository;
        _conviteRepository = conviteRepository;
        _relogio = relogio;
    }

    public async Task<ProximosPassosCasamentoDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);

        var acessos = await _acessoCasalRepository.ListarNaoRevogadosAsync(casamento.Id, cancelamento);
        var progresso = await _checklistRepository.ObterProgressoAsync(casamento.Id, cancelamento);
        var envio = await _conviteRepository.ObterResumoEnvioAsync(casamento.Id, cancelamento);
        var agora = _relogio.GetUtcNow();

        return CalculadoraProximosPassos.Calcular(
            acessos.Select(acesso => acesso.Situacao(agora)).ToList(),
            progresso,
            envio);
    }
}
