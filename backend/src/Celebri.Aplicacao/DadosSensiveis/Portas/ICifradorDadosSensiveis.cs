namespace Casamento.Aplicacao.DadosSensiveis.Portas;

public interface ICifradorDadosSensiveis
{
    string Cifrar(string texto, Guid convidadoId);

    string? Decifrar(string conteudoCifrado, Guid convidadoId);
}
