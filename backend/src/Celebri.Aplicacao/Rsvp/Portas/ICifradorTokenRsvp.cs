namespace Celebri.Aplicacao.Rsvp.Portas;

public interface ICifradorTokenRsvp
{
    string Cifrar(string token, Guid conviteId);

    string? Decifrar(string tokenCifrado, Guid conviteId);
}
