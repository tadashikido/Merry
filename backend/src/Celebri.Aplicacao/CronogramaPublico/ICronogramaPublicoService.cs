namespace Celebri.Aplicacao.CronogramaPublico;

public interface ICronogramaPublicoService
{
    Task<CronogramaPublicoDto> ConsultarAsync(ConsultarCronogramaPublicoRequest request, CancellationToken cancelamento);
}
