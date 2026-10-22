namespace Casamento.Testes.Unidade.Autenticacao.Fakes;

public class RelogioFixo : TimeProvider
{
    public RelogioFixo(DateTimeOffset agora)
    {
        Agora = agora;
    }

    public DateTimeOffset Agora { get; private set; }

    public override DateTimeOffset GetUtcNow()
    {
        return Agora;
    }

    public void Avancar(TimeSpan intervalo)
    {
        Agora = Agora.Add(intervalo);
    }
}
