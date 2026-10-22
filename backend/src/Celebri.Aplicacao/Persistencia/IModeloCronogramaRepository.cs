using Casamento.Aplicacao.ModelosCronograma;
using Casamento.Dominio.Cronogramas;

namespace Casamento.Aplicacao.Persistencia;

public interface IModeloCronogramaRepository
{
    Task<IReadOnlyList<ModeloCronogramaResumo>> ListarAsync(CancellationToken cancelamento);

    Task<ModeloCronograma?> ObterComItensAsync(Guid modeloId, CancellationToken cancelamento);

    Task<int> ContarAsync(CancellationToken cancelamento);

    Task<bool> ExisteNomeAsync(string nome, Guid? ignorarModeloId, CancellationToken cancelamento);

    void Adicionar(ModeloCronograma modelo);

    void Remover(ModeloCronograma modelo);
}
