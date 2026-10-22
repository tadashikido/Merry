namespace Casamento.Dominio.Fornecedores;

public static class MensagensFornecedoresCasamento
{
    public const string FornecedorObrigatorio = "Escolha o fornecedor.";
    public const string StatusObrigatorio = "Escolha a situação.";
    public const string StatusInvalido = "Escolha uma situação da lista.";
    public const string TamanhoServico = "Use até 120 caracteres.";
    public const string TamanhoNotas = "Use até 2.000 caracteres.";
    public const string ValorInvalido = "Informe um valor entre R$ 0,00 e R$ 99.999.999,99, com até 2 casas decimais.";
    public const string ContratadoSemValor = "Informe o valor contratado.";
    public const string JaVinculado = "Este fornecedor já está neste casamento.";
    public const string FornecedorArquivado = "Restaure o fornecedor na base para vinculá-lo.";
    public const string LimitePorCasamento = "Este casamento chegou a 200 fornecedores. Remova algum para adicionar outro.";
    public const string NaoEncontrado = "Fornecedor do casamento não encontrado.";
    public const string ContratoNaoEncontrado = "Este fornecedor não tem contrato anexado.";
    public const string ContratoFormatoInvalido = "Envie o contrato em PDF.";
    public const string ContratoVazio = "O arquivo está vazio. Escolha o PDF do contrato.";
    public const string ContratoGrandeDemais = "O contrato passa de 10 MB. Envie um PDF menor.";
    public const string ImportarMesmoCasamento = "Escolha outro casamento para importar os fornecedores.";
    public const string CasamentoOrigemObrigatorio = "Escolha o casamento de origem.";
}
