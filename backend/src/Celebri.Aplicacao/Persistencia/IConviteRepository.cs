using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Persistencia;

public interface IConviteRepository
{
    Task<IReadOnlyList<Convite>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid eventoId, CancellationToken cancelamento);

    Task<Convite?> ObterPorIdAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento);

    Task<int> ContarConvidadosAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ResumoConvidados> ObterResumoAsync(Guid eventoId, CancellationToken cancelamento);

    Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid eventoId, CancellationToken cancelamento);

    Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid eventoId, CancellationToken cancelamento);

    void Adicionar(Convite convite);

    void AdicionarVarios(IEnumerable<Convite> convites);

    void Remover(Convite convite);
}
