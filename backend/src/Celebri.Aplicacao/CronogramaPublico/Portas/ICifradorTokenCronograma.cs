using Celebri.Aplicacao.Recifragem;

namespace Celebri.Aplicacao.CronogramaPublico.Portas;

public interface ICifradorTokenCronograma
{
    string Cifrar(string token, Guid eventoId);

    string? Decifrar(string tokenCifrado, Guid eventoId);

    RecifragemCifra Recifrar(string tokenCifrado, Guid eventoId);
}
