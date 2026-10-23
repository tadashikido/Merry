namespace Celebri.Aplicacao.Recifragem;

public sealed record RecifragemCifra(SituacaoCifra Situacao, string? NovoConteudo)
{
    public static readonly RecifragemCifra JaNaChaveAtual = new(SituacaoCifra.ChaveAtual, null);

    public static readonly RecifragemCifra Ilegivel = new(SituacaoCifra.Ilegivel, null);

    public static RecifragemCifra Recifrada(string novoConteudo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(novoConteudo);
        return new RecifragemCifra(SituacaoCifra.ChaveAnterior, novoConteudo);
    }
}
