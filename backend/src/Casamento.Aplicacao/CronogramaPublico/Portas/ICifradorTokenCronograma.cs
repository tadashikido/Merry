namespace Casamento.Aplicacao.CronogramaPublico.Portas;

public interface ICifradorTokenCronograma
{
    string Cifrar(string token, Guid casamentoId);

    string? Decifrar(string tokenCifrado, Guid casamentoId);
}
