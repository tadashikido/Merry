using Celebri.Dominio.Operadores;

namespace Celebri.Aplicacao.Persistencia;

public interface IOperadorPlataformaRepository
{
    Task<OperadorPlataforma?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    Task<OperadorPlataforma?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    void Adicionar(OperadorPlataforma operador);
}
