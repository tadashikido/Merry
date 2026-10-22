using Celebri.Dominio.Usuarios;
using Microsoft.AspNetCore.Authorization;

namespace Celebri.Api.Autorizacao;

public static class PoliticasAutorizacao
{
    public const string ListarCasamentos = "ListarCasamentos";
    public const string ConsultarCasamentos = "ConsultarCasamentos";
    public const string GerenciarCasamentos = "GerenciarCasamentos";
    public const string ConsultarConvidados = "ConsultarConvidados";
    public const string GerenciarConvidados = "GerenciarConvidados";
    public const string ConsultarRestricoesAlimentares = "ConsultarRestricoesAlimentares";
    public const string GerenciarRestricoesAlimentares = "GerenciarRestricoesAlimentares";
    public const string GerenciarAcessoCasal = "GerenciarAcessoCasal";
    public const string ConsultarTarefas = "ConsultarTarefas";
    public const string AlterarStatusTarefas = "AlterarStatusTarefas";
    public const string GerenciarTarefas = "GerenciarTarefas";
    public const string ConsultarPendenciasTarefas = "ConsultarPendenciasTarefas";
    public const string GerenciarModelosChecklist = "GerenciarModelosChecklist";
    public const string GerenciarChecklist = "GerenciarChecklist";
    public const string GerenciarModelosCronograma = "GerenciarModelosCronograma";
    public const string GerenciarFornecedores = "GerenciarFornecedores";
    public const string ConsultarFornecedoresCasamento = "ConsultarFornecedoresCasamento";
    public const string GerenciarFornecedoresCasamento = "GerenciarFornecedoresCasamento";
    public const string ConsultarFinanceiroCasamento = "ConsultarFinanceiroCasamento";
    public const string GerenciarFinanceiroCasamento = "GerenciarFinanceiroCasamento";
    public const string ConsultarAlertasPagamentos = "ConsultarAlertasPagamentos";
    public const string ConsultarCronograma = "ConsultarCronograma";
    public const string GerenciarCronograma = "GerenciarCronograma";
    public const string ConsultarMesas = "ConsultarMesas";
    public const string GerenciarMesas = "GerenciarMesas";

    private static readonly IReadOnlyList<string> SomenteAssessoria = [nameof(PapelUsuario.Dono)];

    private static readonly IReadOnlyList<string> AssessoriaECasal = [nameof(PapelUsuario.Dono), nameof(PapelUsuario.Casal)];

    public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> PapeisPorPolitica = new Dictionary<string, IReadOnlyList<string>>
    {
        [ListarCasamentos] = SomenteAssessoria,
        [ConsultarCasamentos] = AssessoriaECasal,
        [GerenciarCasamentos] = SomenteAssessoria,
        [ConsultarConvidados] = AssessoriaECasal,
        [GerenciarConvidados] = AssessoriaECasal,
        [ConsultarRestricoesAlimentares] = SomenteAssessoria,
        [GerenciarRestricoesAlimentares] = SomenteAssessoria,
        [GerenciarAcessoCasal] = SomenteAssessoria,
        [ConsultarTarefas] = AssessoriaECasal,
        [AlterarStatusTarefas] = AssessoriaECasal,
        [GerenciarTarefas] = SomenteAssessoria,
        [ConsultarPendenciasTarefas] = SomenteAssessoria,
        [GerenciarModelosChecklist] = SomenteAssessoria,
        [GerenciarChecklist] = SomenteAssessoria,
        [GerenciarModelosCronograma] = SomenteAssessoria,
        [GerenciarFornecedores] = SomenteAssessoria,
        [ConsultarFornecedoresCasamento] = AssessoriaECasal,
        [GerenciarFornecedoresCasamento] = SomenteAssessoria,
        [ConsultarFinanceiroCasamento] = AssessoriaECasal,
        [GerenciarFinanceiroCasamento] = SomenteAssessoria,
        [ConsultarAlertasPagamentos] = SomenteAssessoria,
        [ConsultarCronograma] = AssessoriaECasal,
        [GerenciarCronograma] = SomenteAssessoria,
        [ConsultarMesas] = AssessoriaECasal,
        [GerenciarMesas] = AssessoriaECasal,
    };

    public static void Registrar(AuthorizationOptions opcoes)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        foreach (var (politica, papeis) in PapeisPorPolitica)
        {
            opcoes.AddPolicy(politica, construtor => construtor.RequireAuthenticatedUser().RequireRole(papeis));
        }
    }
}
