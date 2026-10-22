using Casamento.Dominio.Casamentos;

namespace Casamento.Aplicacao.Persistencia;

public interface ICasamentoRepository
{
    Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento);

    Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento);

    void Adicionar(CasamentoAssessorado casamento);
}
