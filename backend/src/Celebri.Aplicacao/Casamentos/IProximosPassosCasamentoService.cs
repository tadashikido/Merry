namespace Casamento.Aplicacao.Casamentos;

public interface IProximosPassosCasamentoService
{
    Task<ProximosPassosCasamentoDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento);
}
