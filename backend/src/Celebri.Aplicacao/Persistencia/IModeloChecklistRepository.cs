using Casamento.Aplicacao.Checklists;
using Casamento.Dominio.Checklists;

namespace Casamento.Aplicacao.Persistencia;

public interface IModeloChecklistRepository
{
    Task<IReadOnlyList<ModeloChecklistResumo>> ListarAsync(CancellationToken cancelamento);

    Task<ModeloChecklist?> ObterComItensAsync(Guid modeloId, CancellationToken cancelamento);

    Task<int> ContarAsync(CancellationToken cancelamento);

    Task<bool> ExisteNomeAsync(string nome, Guid? ignorarModeloId, CancellationToken cancelamento);

    void Adicionar(ModeloChecklist modelo);

    void Remover(ModeloChecklist modelo);
}
