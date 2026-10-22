namespace Celebri.Aplicacao.Confirmacoes;

public interface ICobrancaRsvpService
{
    Task<CobrancaRsvpDto> RegistrarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);
}
