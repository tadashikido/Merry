namespace Celebri.Dominio.Casamentos;

public static class MensagensCasamento
{
    public const string NomeObrigatorio = "Preencha o nome das duas pessoas do casal.";
    public const string TamanhoNome = "Use entre 2 e 80 caracteres.";
    public const string DataForaDaFaixa = "Informe uma data entre 2000 e 2100.";
    public const string HorarioInvalido = "Informe o horário no formato 24 h, como 16:30.";
    public const string TamanhoLocal = "Use até 200 caracteres.";
    public const string ConvidadosForaDaFaixa = "Informe um número entre 1 e 5.000.";
    public const string TamanhoObservacoes = "Use até 2.000 caracteres.";
    public const string ArquivadoSemEdicao = "Este casamento está arquivado. Restaure para voltar a editar.";
    public const string NaoEncontrado = "Casamento não encontrado.";
    public const string DataLimiteRsvpInvalida = "A data limite precisa ser igual ou anterior à data do casamento.";
    public const string SituacaoInvalida = "Informe a situação Ativos ou Arquivados.";
}
