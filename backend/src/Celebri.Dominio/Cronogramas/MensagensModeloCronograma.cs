namespace Casamento.Dominio.Cronogramas;

public static class MensagensModeloCronograma
{
    public const string NomeObrigatorio = "Informe o nome do modelo.";
    public const string TamanhoNome = "Use entre 2 e 80 caracteres.";
    public const string TamanhoDescricao = "Use até 500 caracteres.";
    public const string NomeRepetido = "Já existe um modelo de cronograma com esse nome.";
    public const string LimiteModelos = "Sua assessoria já tem 50 modelos de cronograma. Exclua um antes de criar outro.";
    public const string LimiteItens = "Este modelo já tem 200 itens.";
    public const string MinutosObrigatorios = "Informe quando o item acontece em relação à cerimônia.";
    public const string ForaDaJanela = "Escolha um horário entre a véspera e o dia seguinte.";
    public const string ReferenciaForaDaJanela = "Com esse horário de referência, algum item ficaria fora da véspera ou do dia seguinte.";
    public const string ReferenciaLocalInvalida = "Escolha o local da cerimônia, o da recepção ou outro.";
    public const string CategoriaInvalida = "Escolha uma categoria de fornecedor válida.";
    public const string HorarioReferenciaInvalido = "Use o formato 00:00.";
    public const string ModeloNaoEncontrado = "Modelo não encontrado.";
    public const string ItemNaoEncontrado = "Item não encontrado.";
    public const string ModeloObrigatorio = "Escolha um modelo.";
    public const string HorarioCerimoniaObrigatorio = "Falta o horário da cerimônia. Informe-o em Editar casamento para usar modelos de cronograma.";
    public const string CronogramaVazio = "O cronograma ainda não tem itens para salvar como modelo.";
    public const string AplicacaoConcorrente = "O cronograma mudou em outra tela. Recarregue e tente de novo.";

    public static string LimiteItensCronograma(int existentes, int novos)
    {
        return $"O cronograma passaria de 200 itens (hoje tem {existentes}, o modelo cria {novos}). Exclua itens ou use um modelo menor.";
    }
}
