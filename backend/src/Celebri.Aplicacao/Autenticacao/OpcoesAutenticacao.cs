namespace Celebri.Aplicacao.Autenticacao;

public class OpcoesAutenticacao
{
    public const string Secao = "Autenticacao";

    public int ValidadeTokenAcessoMinutos { get; set; } = 15;

    public int ValidadeRefreshTokenDias { get; set; } = 14;

    public int JanelaReusoRefreshTokenSegundos { get; set; } = 15;

    public int ValidadeTokenRedefinicaoMinutos { get; set; } = 60;

    public int ValidadeConviteAnfitriaoDias { get; set; } = 7;

    public string UrlFrontend { get; set; } = string.Empty;
}
