namespace Casamento.Dominio.Rsvp;

public static class MensagensRsvp
{
    public const string LinkInvalido = "Link de confirmação inválido ou desativado.";
    public const string PrazoEncerrado = "O prazo para responder terminou. Para mudar algo, fale com quem enviou o convite.";
    public const string LinkInexistente = "Este convite ainda não tem link de confirmação.";
    public const string LinkIrrecuperavel = "Não foi possível recuperar este link. Gere um novo link.";
    public const string LinkGeradoEmParalelo = "O link foi alterado por outra operação. Tente novamente.";
    public const string CasamentoArquivado = "Este casamento está arquivado. Restaure para voltar a enviar convites.";
}
