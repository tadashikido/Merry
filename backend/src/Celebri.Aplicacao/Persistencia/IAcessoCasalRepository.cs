using Casamento.Dominio.AcessosCasal;

namespace Casamento.Aplicacao.Persistencia;

public interface IAcessoCasalRepository
{
    Task<IReadOnlyList<AcessoCasal>> ListarNaoRevogadosAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<AcessoCasal?> ObterPorIdAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento);

    Task<bool> ExisteNaoRevogadoComEmailAsync(string emailNormalizado, CancellationToken cancelamento);

    void Adicionar(AcessoCasal acesso);
}
