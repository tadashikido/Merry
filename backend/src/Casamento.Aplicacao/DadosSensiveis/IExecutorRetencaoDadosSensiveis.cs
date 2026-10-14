namespace Casamento.Aplicacao.DadosSensiveis;

public interface IExecutorRetencaoDadosSensiveis
{
    Task<int> ExecutarAsync(CancellationToken cancelamento);
}
