using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Convidados.Importacao;

public sealed record ConfirmarImportacaoRequest(
    bool SomenteValidos,
    [Range(0, Convite.ConvidadosMaximoPorCasamento, ErrorMessage = MensagensImportacaoConvidados.PlanilhaAlterada)]
    int ConvitesEsperados,
    [Range(0, Convite.ConvidadosMaximoPorCasamento, ErrorMessage = MensagensImportacaoConvidados.PlanilhaAlterada)]
    int PessoasEsperadas);
