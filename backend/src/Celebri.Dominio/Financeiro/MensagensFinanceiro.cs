namespace Celebri.Dominio.Financeiro;

public static class MensagensFinanceiro
{
    public const string ValorObrigatorio = "Informe o valor da parcela.";
    public const string ValorInvalido = "Informe um valor entre R$ 0,01 e R$ 99.999.999,99, com até 2 casas decimais.";
    public const string VencimentoObrigatorio = "Informe a data de vencimento.";
    public const string VencimentoInvalido = "Informe um vencimento entre 01/01/2000 e 31/12/2100.";
    public const string TamanhoObservacao = "Use até 120 caracteres.";
    public const string QuantidadeObrigatoria = "Informe o número de parcelas.";
    public const string QuantidadeInvalida = "Escolha de 1 a 60 parcelas.";
    public const string PrimeiroVencimentoObrigatorio = "Informe o primeiro vencimento.";
    public const string ValorPequenoParaDividir = "O valor é pequeno demais para dividir nesse número de parcelas.";
    public const string SemSaldoParaGerar = "Não há saldo a parcelar neste contrato.";
    public const string LimiteParcelas = "Este fornecedor chegou a 60 parcelas.";
    public const string VinculoNaoContratado = "Só fornecedores contratados têm parcelas. Marque o fornecedor como contratado e informe o valor.";
    public const string VinculoCancelado = "Este fornecedor foi cancelado. As parcelas ficam só como histórico.";
    public const string ParcelaNaoEncontrada = "Parcela não encontrada.";
    public const string ParcelaPagaSemEdicao = "Desfaça o pagamento para alterar ou remover esta parcela.";
    public const string ParcelaNaoPaga = "Esta parcela não está paga.";
    public const string PagamentoFuturo = "A data do pagamento não pode ser futura.";
    public const string PagamentoInvalido = "Informe uma data de pagamento a partir de 01/01/2000.";
    public const string ComprovanteSemPagamento = "Marque a parcela como paga antes de anexar o comprovante.";
    public const string ComprovanteFormatoInvalido = "Envie o comprovante em PDF, JPG ou PNG.";
    public const string ComprovanteVazio = "O arquivo está vazio. Escolha o comprovante.";
    public const string ComprovanteGrandeDemais = "O comprovante passa de 10 MB. Envie um arquivo menor.";
    public const string ComprovanteNaoEncontrado = "Esta parcela não tem comprovante anexado.";
    public const string VinculoComParcelas = "Este fornecedor tem parcelas registradas. Remova as parcelas antes de tirá-lo do evento.";
    public const string StatusComParcelas = "Este fornecedor tem parcelas. Para interromper o contrato, marque como cancelado.";

    public static string SomaExcede(string valor) =>
        $"As parcelas passariam do valor contratado em {valor}. Ajuste o valor.";

    public static string ContratadoAbaixoDasParcelas(string valor) =>
        $"O valor contratado não pode ficar abaixo das parcelas registradas ({valor}).";
}
