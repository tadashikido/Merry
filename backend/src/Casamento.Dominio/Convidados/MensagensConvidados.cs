namespace Casamento.Dominio.Convidados;

public static class MensagensConvidados
{
    public const string NomeObrigatorio = "Preencha este campo.";
    public const string TamanhoNome = "Use entre 2 e 120 caracteres.";
    public const string TamanhoGrupo = "Use até 60 caracteres.";
    public const string LimiteAcompanhantesForaDaFaixa = "Informe de 0 a 10 acompanhantes.";
    public const string TelefoneInvalido = "Informe o telefone com DDD, como (11) 98765-4321.";
    public const string EmailInvalido = "Informe um e-mail válido, como nome@exemplo.com.";
    public const string FaixaEtariaInvalida = "Informe se a pessoa é adulto ou criança.";
    public const string RespostaInvalida = "Informe a resposta: pendente, confirmado ou recusado.";
    public const string QuantidadeConvidados = "Um convite precisa ter de 1 a 30 pessoas.";
    public const string ConvidadoDeOutroConvite = "Um dos convidados informados não pertence a este convite.";
    public const string ConvidadoRepetido = "O mesmo convidado foi informado mais de uma vez.";
    public const string LimitePorCasamento = "Este casamento atingiu o limite de 5.000 convidados.";
    public const string CasamentoArquivado = "Este casamento está arquivado. Restaure para voltar a editar os convidados.";
    public const string ConviteNaoEncontrado = "Convite não encontrado.";
    public const string RespostaIncompleta = "Responda por todas as pessoas do convite.";
    public const string RespostaPresencaInvalida = "Escolha vou ou não vou para cada pessoa.";
    public const string AcompanhanteSemConfirmacao = "Para levar acompanhante, ao menos uma pessoa do convite precisa ir.";
    public const string LimiteAcompanhantesExcedido = "O número de acompanhantes passou do limite deste convite.";
    public const string NomeAcompanhanteObrigatorio = "Informe o nome do acompanhante.";
    public const string TamanhoNomeAcompanhante = "Use entre 2 e 120 caracteres no nome do acompanhante.";
}
