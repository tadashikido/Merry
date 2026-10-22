namespace Casamento.Dominio.Tarefas;

public static class MensagensTarefas
{
    public const string TituloObrigatorio = "Informe o título da tarefa.";
    public const string TamanhoTitulo = "Use entre 2 e 160 caracteres.";
    public const string TamanhoDescricao = "Use até 2.000 caracteres.";
    public const string ResponsavelInvalido = "Escolha Assessoria ou Casal.";
    public const string CategoriaInvalida = "Escolha uma categoria da lista.";
    public const string StatusInvalido = "Escolha A fazer, Em andamento, Concluída ou Cancelada.";
    public const string StatusObrigatorio = "Informe a nova situação da tarefa.";
    public const string PrazoForaDaFaixa = "Informe um prazo entre 2000 e 2100.";
    public const string NaoEncontrada = "Tarefa não encontrada.";
    public const string LimitePorCasamento = "Este casamento já tem 500 tarefas. Exclua ou conclua algumas antes de criar novas.";
    public const string StatusNaoPermitidoCasal = "Vocês podem concluir ou reabrir a tarefa. As demais situações ficam com a assessoria.";
}
