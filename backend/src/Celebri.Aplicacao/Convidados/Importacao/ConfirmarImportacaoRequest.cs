using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record ConfirmarImportacaoRequest(
    bool SomenteValidos,
    [Range(0, Convite.ConvidadosMaximoPorCasamento, ErrorMessage = MensagensImportacaoConvidados.PlanilhaAlterada)]
    int ConvitesEsperados,
    [Range(0, Convite.ConvidadosMaximoPorCasamento, ErrorMessage = MensagensImportacaoConvidados.PlanilhaAlterada)]
    int PessoasEsperadas);
