namespace Celebri.Aplicacao.Convidados.Importacao;

public interface IImportacaoConvidadosService
{
    Task<PreVisualizacaoImportacaoDto> PreVisualizarAsync(Guid eventoId, Stream conteudo, CancellationToken cancelamento);

    Task<ResultadoImportacaoDto> ImportarAsync(
        Guid eventoId,
        Stream conteudo,
        ConfirmarImportacaoRequest request,
        CancellationToken cancelamento);
}
