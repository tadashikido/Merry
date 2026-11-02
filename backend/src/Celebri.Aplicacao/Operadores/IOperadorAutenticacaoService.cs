namespace Celebri.Aplicacao.Operadores;

public interface IOperadorAutenticacaoService
{
    Task<ResultadoAutenticacaoOperador> EntrarAsync(EntrarOperadorRequest request, CancellationToken cancelamento);

    Task<ResultadoAutenticacaoOperador> RenovarAsync(string? refreshToken, CancellationToken cancelamento);

    Task SairAsync(string? refreshToken, CancellationToken cancelamento);

    Task<OperadorAutenticadoDto> ObterOperadorAsync(Guid operadorId, CancellationToken cancelamento);
}
