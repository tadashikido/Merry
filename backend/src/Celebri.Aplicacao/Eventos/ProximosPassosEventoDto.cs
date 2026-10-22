namespace Celebri.Aplicacao.Eventos;

public sealed record ProximosPassosEventoDto(
    bool AnfitriaoConvidado,
    bool ChecklistAplicado,
    bool ConvidadosCadastrados,
    bool ConvitesEnviados)
{
    public bool TodosConcluidos => AnfitriaoConvidado && ChecklistAplicado && ConvidadosCadastrados && ConvitesEnviados;
}
