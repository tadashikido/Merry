namespace Casamento.Dominio.Cronogramas;

public static class MensagensAcessoCronograma
{
    public const string LinkInvalido = "Link do cronograma inválido ou desativado.";
    public const string LinkNaoEncontrado = "Link do cronograma não encontrado.";
    public const string LinkIrrecuperavel = "Não foi possível recuperar este link. Gere um novo link.";
    public const string LinkGeradoEmParalelo = "O link foi alterado por outra operação. Tente novamente.";
    public const string CasamentoArquivado = "Este casamento está arquivado. Restaure para voltar a enviar links do cronograma.";
    public const string LinksExpirados = "Os links do cronograma valem até 7 dias depois do casamento.";
    public const string FornecedorInvalido = "Escolha um fornecedor deste casamento que não esteja cancelado.";
    public const string ResponsavelObrigatorio = "Informe o responsável.";
    public const string ResponsavelSemItens = "Nenhum item do cronograma tem este responsável.";
    public const string TipoInvalido = "Escolha equipe completa, fornecedor ou responsável.";
}
