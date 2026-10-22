namespace Celebri.Api.Autenticacao;

public static class PoliticasLimiteRequisicao
{
    public const string Entrar = "entrar";
    public const string Cadastro = "cadastro";
    public const string Recuperacao = "recuperacao";
    public const string Renovar = "renovar";
    public const string Importacao = "importacao";
    public const string Rsvp = "rsvp";
    public const string AcessoAnfitriao = "acesso-anfitriao";
    public const string Contrato = "contrato";
    public const string Comprovante = "comprovante";
    public const string CronogramaPublico = "cronograma-publico";
    public const string SecaoConfiguracao = "LimitesRequisicao";
    public const string TituloLimiteExcedido = "Muitas tentativas. Aguarde um pouco e tente novamente.";

    public static readonly IReadOnlyDictionary<string, (int Limite, int JanelaSegundos)> Padroes =
        new Dictionary<string, (int Limite, int JanelaSegundos)>
        {
            [Entrar] = (5, 60),
            [Cadastro] = (5, 3600),
            [Recuperacao] = (5, 900),
            [Renovar] = (30, 60),
            [Importacao] = (30, 60),
            [Rsvp] = (30, 60),
            [AcessoAnfitriao] = (10, 900),
            [Contrato] = (20, 60),
            [Comprovante] = (20, 60),
            [CronogramaPublico] = (60, 60),
        };

    public static readonly IReadOnlySet<string> PorUsuario = new HashSet<string> { Contrato, Comprovante };
}
