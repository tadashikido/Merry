using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Fornecedores;
using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Persistencia;

public interface IDuplicacaoCasamentoRepository
{
    Task<IReadOnlyList<TarefaParaDuplicar>> ListarTarefasAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<VinculoParaDuplicar>> ListarVinculosAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<ItemCronograma>> ListarItensCronogramaAsync(Guid casamentoOrigemId, CancellationToken cancelamento);

    void AdicionarItensCronograma(IEnumerable<ItemCronograma> itens);

    void AdicionarTarefas(IEnumerable<TarefaCasamento> tarefas);

    void AdicionarVinculos(IEnumerable<FornecedorCasamento> vinculos);
}
