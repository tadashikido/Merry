using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Persistencia;

public interface IConviteRepository
{
    Task<IReadOnlyList<Convite>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<Convite?> ObterPorIdAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento);

    Task<int> ContarConvidadosAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ResumoConvidados> ObterResumoAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid casamentoId, CancellationToken cancelamento);

    Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid casamentoId, CancellationToken cancelamento);

    void Adicionar(Convite convite);

    void AdicionarVarios(IEnumerable<Convite> convites);

    void Remover(Convite convite);
}
