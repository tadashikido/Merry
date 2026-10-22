using Celebri.Dominio.Usuarios;
using Microsoft.AspNetCore.Authorization;

namespace Celebri.Api.Autorizacao;

public static class PoliticasAutorizacao
{
    public const string ListarEventos = "ListarEventos";
    public const string ConsultarEventos = "ConsultarEventos";
    public const string GerenciarEventos = "GerenciarEventos";
    public const string ConsultarConvidados = "ConsultarConvidados";
    public const string GerenciarConvidados = "GerenciarConvidados";
    public const string ConsultarRestricoesAlimentares = "ConsultarRestricoesAlimentares";
    public const string GerenciarRestricoesAlimentares = "GerenciarRestricoesAlimentares";
    public const string GerenciarAcessoAnfitriao = "GerenciarAcessoAnfitriao";
    public const string ConsultarTarefas = "ConsultarTarefas";
    public const string AlterarStatusTarefas = "AlterarStatusTarefas";
    public const string GerenciarTarefas = "GerenciarTarefas";
    public const string ConsultarPendenciasTarefas = "ConsultarPendenciasTarefas";
    public const string GerenciarModelosChecklist = "GerenciarModelosChecklist";
    public const string GerenciarChecklist = "GerenciarChecklist";
    public const string GerenciarModelosCronograma = "GerenciarModelosCronograma";
    public const string GerenciarFornecedores = "GerenciarFornecedores";
    public const string ConsultarFornecedoresEvento = "ConsultarFornecedoresEvento";
    public const string GerenciarFornecedoresEvento = "GerenciarFornecedoresEvento";
    public const string ConsultarFinanceiroEvento = "ConsultarFinanceiroEvento";
    public const string GerenciarFinanceiroEvento = "GerenciarFinanceiroEvento";
    public const string ConsultarAlertasPagamentos = "ConsultarAlertasPagamentos";
    public const string ConsultarCronograma = "ConsultarCronograma";
    public const string GerenciarCronograma = "GerenciarCronograma";
    public const string ConsultarMesas = "ConsultarMesas";
    public const string GerenciarMesas = "GerenciarMesas";

    private static readonly IReadOnlyList<string> SomenteAssessoria = [nameof(PapelUsuario.Dono)];

    private static readonly IReadOnlyList<string> AssessoriaEAnfitriao = [nameof(PapelUsuario.Dono), nameof(PapelUsuario.Anfitriao)];

    public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> PapeisPorPolitica = new Dictionary<string, IReadOnlyList<string>>
    {
        [ListarEventos] = SomenteAssessoria,
        [ConsultarEventos] = AssessoriaEAnfitriao,
        [GerenciarEventos] = SomenteAssessoria,
        [ConsultarConvidados] = AssessoriaEAnfitriao,
        [GerenciarConvidados] = AssessoriaEAnfitriao,
        [ConsultarRestricoesAlimentares] = SomenteAssessoria,
        [GerenciarRestricoesAlimentares] = SomenteAssessoria,
        [GerenciarAcessoAnfitriao] = SomenteAssessoria,
        [ConsultarTarefas] = AssessoriaEAnfitriao,
        [AlterarStatusTarefas] = AssessoriaEAnfitriao,
        [GerenciarTarefas] = SomenteAssessoria,
        [ConsultarPendenciasTarefas] = SomenteAssessoria,
        [GerenciarModelosChecklist] = SomenteAssessoria,
        [GerenciarChecklist] = SomenteAssessoria,
        [GerenciarModelosCronograma] = SomenteAssessoria,
        [GerenciarFornecedores] = SomenteAssessoria,
        [ConsultarFornecedoresEvento] = AssessoriaEAnfitriao,
        [GerenciarFornecedoresEvento] = SomenteAssessoria,
        [ConsultarFinanceiroEvento] = AssessoriaEAnfitriao,
        [GerenciarFinanceiroEvento] = SomenteAssessoria,
        [ConsultarAlertasPagamentos] = SomenteAssessoria,
        [ConsultarCronograma] = AssessoriaEAnfitriao,
        [GerenciarCronograma] = SomenteAssessoria,
        [ConsultarMesas] = AssessoriaEAnfitriao,
        [GerenciarMesas] = AssessoriaEAnfitriao,
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
