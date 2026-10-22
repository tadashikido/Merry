namespace Casamento.Aplicacao.Casamentos;

public sealed record ProximosPassosCasamentoDto(
    bool CasalConvidado,
    bool ChecklistAplicado,
    bool ConvidadosCadastrados,
    bool ConvitesEnviados)
{
    public bool TodosConcluidos => CasalConvidado && ChecklistAplicado && ConvidadosCadastrados && ConvitesEnviados;
}
