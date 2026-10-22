namespace Casamento.Aplicacao.Confirmacoes;

public interface IPainelConfirmacoesService
{
    Task<PainelConfirmacoesDto> ObterAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ExportacaoBuffetDto> ExportarBuffetAsync(Guid casamentoId, ExportarBuffetRequest request, CancellationToken cancelamento);
}
