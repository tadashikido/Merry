namespace Celebri.Aplicacao.Operadores;

public interface IProvisionamentoOperadorService
{
    Task<bool> ProvisionarInicialAsync(CancellationToken cancelamento);
}
