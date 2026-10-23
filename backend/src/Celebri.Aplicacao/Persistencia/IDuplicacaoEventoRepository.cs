using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Persistencia;

public interface IDuplicacaoEventoRepository
{
    Task<IReadOnlyList<TarefaParaDuplicar>> ListarTarefasAsync(Guid eventoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<VinculoParaDuplicar>> ListarVinculosAsync(Guid eventoOrigemId, CancellationToken cancelamento);

    Task<IReadOnlyList<ItemCronograma>> ListarItensCronogramaAsync(Guid eventoOrigemId, CancellationToken cancelamento);

    void AdicionarItensCronograma(IEnumerable<ItemCronograma> itens);

    void AdicionarTarefas(IEnumerable<TarefaEvento> tarefas);

    void AdicionarVinculos(IEnumerable<FornecedorEvento> vinculos);
}
