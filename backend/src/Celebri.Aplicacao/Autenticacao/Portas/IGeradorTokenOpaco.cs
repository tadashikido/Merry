namespace Casamento.Aplicacao.Autenticacao.Portas;

public interface IGeradorTokenOpaco
{
    string Gerar();

    string CalcularHash(string valor);
}
