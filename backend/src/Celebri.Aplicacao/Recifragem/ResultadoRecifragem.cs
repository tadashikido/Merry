namespace Celebri.Aplicacao.Recifragem;

public sealed record ResultadoRecifragem(ContagemRecifragem DadosSensiveis, ContagemRecifragem LinksCronograma, int Organizacoes)
{
    public bool PossuiIlegiveis => DadosSensiveis.Ilegiveis + LinksCronograma.Ilegiveis > 0;
}
