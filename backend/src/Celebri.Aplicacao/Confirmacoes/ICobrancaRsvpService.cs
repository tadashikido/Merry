namespace Casamento.Aplicacao.Confirmacoes;

public interface ICobrancaRsvpService
{
    Task<CobrancaRsvpDto> RegistrarAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);
}
