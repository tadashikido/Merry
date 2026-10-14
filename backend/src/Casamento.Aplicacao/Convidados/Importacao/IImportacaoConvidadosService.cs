namespace Casamento.Aplicacao.Convidados.Importacao;

public interface IImportacaoConvidadosService
{
    Task<PreVisualizacaoImportacaoDto> PreVisualizarAsync(Guid casamentoId, Stream conteudo, CancellationToken cancelamento);

    Task<ResultadoImportacaoDto> ImportarAsync(
        Guid casamentoId,
        Stream conteudo,
        ConfirmarImportacaoRequest request,
        CancellationToken cancelamento);
}
