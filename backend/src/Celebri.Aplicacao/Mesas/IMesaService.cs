namespace Celebri.Aplicacao.Mesas;

public interface IMesaService
{
    Task<MapaMesasDto> ObterMapaAsync(Guid eventoId, CancellationToken cancelamento);

    Task<MesaDto> CriarAsync(Guid eventoId, SalvarMesaRequest request, CancellationToken cancelamento);

    Task<MesaDto> AtualizarAsync(Guid eventoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento);

    Task<MapaMesasDto> SentarAsync(Guid eventoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento);

    Task<MapaMesasDto> RetirarAsync(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento);

    Task<MapaMesasDto> DispensarAvisosAsync(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento);
}
