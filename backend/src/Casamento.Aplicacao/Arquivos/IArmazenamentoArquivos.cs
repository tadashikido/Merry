namespace Casamento.Aplicacao.Arquivos;

public interface IArmazenamentoArquivos
{
    Task SalvarAsync(ChaveArquivo chave, ReadOnlyMemory<byte> conteudo, CancellationToken cancelamento);

    Task<Stream?> AbrirLeituraAsync(ChaveArquivo chave, CancellationToken cancelamento);

    Task RemoverAsync(ChaveArquivo chave, CancellationToken cancelamento);
}
