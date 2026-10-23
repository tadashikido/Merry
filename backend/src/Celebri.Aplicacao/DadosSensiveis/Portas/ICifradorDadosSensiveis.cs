using Celebri.Aplicacao.Recifragem;

namespace Celebri.Aplicacao.DadosSensiveis.Portas;

public interface ICifradorDadosSensiveis
{
    string Cifrar(string texto, Guid convidadoId);

    string? Decifrar(string conteudoCifrado, Guid convidadoId);

    RecifragemCifra Recifrar(string conteudoCifrado, Guid convidadoId);
}
