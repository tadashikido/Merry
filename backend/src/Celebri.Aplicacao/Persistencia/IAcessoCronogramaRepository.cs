using Celebri.Aplicacao.Recifragem;
using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.Persistencia;

public interface IAcessoCronogramaRepository
{
    Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento);

    Task<IReadOnlyList<AcessoCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<AcessoCronograma?> ObterAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento);

    void Adicionar(AcessoCronograma acesso);

    void Remover(AcessoCronograma acesso);

    Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposAcessoId, int quantidade, CancellationToken cancelamento);

    Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento);
}
