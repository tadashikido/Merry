namespace Casamento.Dominio.Mesas;

public static class MensagensMesas
{
    public const string NumeroObrigatorio = "Preencha este campo.";
    public const string NumeroForaDaFaixa = "Use um número de 1 a 999.";
    public const string CapacidadeObrigatoria = "Preencha este campo.";
    public const string CapacidadeForaDaFaixa = "Use de 1 a 30 lugares.";
    public const string TamanhoNome = "Use até 60 caracteres.";
    public const string NumeroRepetido = "Já existe uma mesa com este número neste casamento.";
    public const string EspecialRepetida = "Este casamento já tem uma mesa dos noivos.";
    public const string LimitePorCasamento = "Este casamento chegou ao limite de 500 mesas.";
    public const string MesaNaoEncontrada = "Mesa não encontrada.";
    public const string CasamentoArquivado = "Este casamento está arquivado. Restaure para voltar a organizar as mesas.";
    public const string SomenteConfirmados = "Só pessoas com presença confirmada podem ser sentadas.";
    public const string PessoasObrigatorias = "Selecione ao menos uma pessoa.";
    public const string PessoasDemais = "Selecione no máximo 200 pessoas por vez.";
    public const string PessoaRepetida = "Pessoa repetida na seleção.";
    public const string PessoaDeOutroCasamento = "Uma ou mais pessoas não pertencem a este casamento.";
    public const string MesaAlteradaEmParalelo = "O mapa de mesas mudou enquanto você organizava. Atualize e tente de novo.";

    public static string CapacidadeExcedida(string rotuloMesa, int capacidade, int livres)
    {
        return livres <= 0
            ? $"A {rotuloMesa} está completa ({capacidade} lugares). Escolha outra mesa."
            : $"A {rotuloMesa} tem {capacidade} lugares e {livres} {(livres == 1 ? "livre" : "livres")}. Escolha até {livres} {(livres == 1 ? "pessoa" : "pessoas")} ou outra mesa.";
    }

    public static string CapacidadeAbaixoDaOcupacao(string rotuloMesa, int ocupacao)
    {
        return $"A {rotuloMesa} já tem {ocupacao} {(ocupacao == 1 ? "pessoa" : "pessoas")}. Os lugares não podem ficar abaixo disso.";
    }
}
