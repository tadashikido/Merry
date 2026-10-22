namespace Casamento.Dominio.Checklists;

public static class MensagensChecklist
{
    public const string NomeObrigatorio = "Informe o nome do modelo.";
    public const string TamanhoNome = "Use entre 2 e 80 caracteres.";
    public const string TamanhoDescricaoModelo = "Use até 500 caracteres.";
    public const string NomeRepetido = "Já existe um modelo com esse nome.";
    public const string LimiteModelos = "Sua assessoria já tem 50 modelos. Exclua um antes de criar outro.";
    public const string LimiteItens = "Este modelo já tem 200 itens.";
    public const string DiasForaDaFaixa = "Use de 0 a 1.095 dias antes ou até 365 dias depois.";
    public const string DiasObrigatorios = "Informe quando a tarefa deve acontecer.";
    public const string ModeloNaoEncontrado = "Modelo não encontrado.";
    public const string ItemNaoEncontrado = "Item não encontrado.";
    public const string ModeloObrigatorio = "Escolha um modelo.";
    public const string AplicacaoConcorrente = "O checklist mudou em outra tela. Recarregue e tente de novo.";

    public static string LimiteTarefas(int existentes, int novas)
    {
        return $"Este casamento passaria de 500 tarefas (hoje tem {existentes}, o modelo cria {novas}). Exclua tarefas ou use um modelo menor.";
    }
}
