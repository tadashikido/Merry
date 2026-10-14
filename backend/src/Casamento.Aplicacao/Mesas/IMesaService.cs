namespace Casamento.Aplicacao.Mesas;

public interface IMesaService
{
    Task<MapaMesasDto> ObterMapaAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<MesaDto> CriarAsync(Guid casamentoId, SalvarMesaRequest request, CancellationToken cancelamento);

    Task<MesaDto> AtualizarAsync(Guid casamentoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento);

    Task RemoverAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento);

    Task<MapaMesasDto> SentarAsync(Guid casamentoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento);

    Task<MapaMesasDto> RetirarAsync(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento);

    Task<MapaMesasDto> DispensarAvisosAsync(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento);
}
