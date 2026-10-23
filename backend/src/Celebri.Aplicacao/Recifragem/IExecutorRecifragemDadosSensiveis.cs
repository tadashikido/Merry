namespace Celebri.Aplicacao.Recifragem;

public interface IExecutorRecifragemDadosSensiveis
{
    Task<ResultadoRecifragem> ExecutarAsync(CancellationToken cancelamento);
}
