using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Persistencia;

public interface IDuplicacaoCasamentoRepository
{
    Task<IReadOnlyList<TarefaParaDuplicar>> ListarTarefasAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<VinculoParaDuplicar>> ListarVinculosAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<ItemCronograma>> ListarItensCronogramaAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    void AdicionarItensCronograma(IEnumerable<ItemCronograma> itens);

    void AdicionarTarefas(IEnumerable<TarefaCasamento> tarefas);

    void AdicionarVinculos(IEnumerable<FornecedorCasamento> vinculos);
}
