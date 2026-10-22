namespace Celebri.Aplicacao.Confirmacoes;

public interface IPainelConfirmacoesService
{
    Task<PainelConfirmacoesDto> ObterAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ExportacaoBuffetDto> ExportarBuffetAsync(Guid eventoId, ExportarBuffetRequest request, CancellationToken cancelamento);
}
