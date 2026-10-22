using Celebri.Dominio.Casamentos;

namespace Celebri.Aplicacao.Persistencia;

public interface ICasamentoRepository
{
    Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento);

    Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    void Adicionar(CasamentoAssessorado casamento);
}
