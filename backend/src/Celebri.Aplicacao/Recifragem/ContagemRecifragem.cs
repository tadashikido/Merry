namespace Celebri.Aplicacao.Recifragem;

public sealed record ContagemRecifragem(int Recifrados, int JaNaChaveAtual, int Ilegiveis, int Concorrentes)
{
    public static readonly ContagemRecifragem Vazia = new(0, 0, 0, 0);

    public ContagemRecifragem Somar(ContagemRecifragem outra)
    {
        ArgumentNullException.ThrowIfNull(outra);

        return new ContagemRecifragem(
            Recifrados + outra.Recifrados,
            JaNaChaveAtual + outra.JaNaChaveAtual,
            Ilegiveis + outra.Ilegiveis,
            Concorrentes + outra.Concorrentes);
    }
}
