using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Checklists;

namespace Celebri.Aplicacao.Eventos;

public static class CalculadoraProximosPassos
{
    public static ProximosPassosEventoDto Calcular(
        IEnumerable<SituacaoAcessoAnfitriao> situacoesAcessoAnfitriao,
        ProgressoChecklist progressoChecklist,
        ResumoEnvioConvites envioConvites)
    {
        ArgumentNullException.ThrowIfNull(situacoesAcessoAnfitriao);
        ArgumentNullException.ThrowIfNull(progressoChecklist);
        ArgumentNullException.ThrowIfNull(envioConvites);

        var anfitriaoConvidado = situacoesAcessoAnfitriao.Any(situacao =>
            situacao is SituacaoAcessoAnfitriao.Pendente or SituacaoAcessoAnfitriao.Ativo);

        return new ProximosPassosEventoDto(
            anfitriaoConvidado,
            progressoChecklist.Total > 0,
            envioConvites.PossuiConvites,
            envioConvites.PossuiEnviados);
    }
}
