using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosCasal;
using Celebri.Dominio.Checklists;

namespace Celebri.Aplicacao.Casamentos;

public static class CalculadoraProximosPassos
{
    public static ProximosPassosCasamentoDto Calcular(
        IEnumerable<SituacaoAcessoCasal> situacoesAcessoCasal,
        ProgressoChecklist progressoChecklist,
        ResumoEnvioConvites envioConvites)
    {
        ArgumentNullException.ThrowIfNull(situacoesAcessoCasal);
        ArgumentNullException.ThrowIfNull(progressoChecklist);
        ArgumentNullException.ThrowIfNull(envioConvites);

        var casalConvidado = situacoesAcessoCasal.Any(situacao =>
            situacao is SituacaoAcessoCasal.Pendente or SituacaoAcessoCasal.Ativo);

        return new ProximosPassosCasamentoDto(
            casalConvidado,
            progressoChecklist.Total > 0,
            envioConvites.PossuiConvites,
            envioConvites.PossuiEnviados);
    }
}
