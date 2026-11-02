namespace Celebri.Dominio.Operadores;

public class RefreshTokenOperador
{
    public const int TamanhoHash = 64;

    private RefreshTokenOperador()
    {
        TokenHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OperadorId { get; private set; }

    public string TokenHash { get; private set; }

    public Guid Familia { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset ExpiraEm { get; private set; }

    public DateTimeOffset? SubstituidoEm { get; private set; }

    public DateTimeOffset? RevogadoEm { get; private set; }

    public bool FoiUtilizado => SubstituidoEm.HasValue || RevogadoEm.HasValue;

    public static RefreshTokenOperador Emitir(Guid operadorId, Guid familia, string tokenHash, DateTimeOffset agora, DateTimeOffset expiraEm)
    {
        return new RefreshTokenOperador
        {
            Id = Guid.NewGuid(),
            OperadorId = operadorId,
            Familia = familia,
            TokenHash = tokenHash,
            CriadoEm = agora,
            ExpiraEm = expiraEm,
        };
    }

    public bool EstaAtivo(DateTimeOffset agora)
    {
        return !FoiUtilizado && ExpiraEm > agora;
    }

    public bool PodeSerReapresentado(DateTimeOffset agora, TimeSpan janela)
    {
        return RevogadoEm is null
            && SubstituidoEm is { } substituidoEm
            && agora - substituidoEm <= janela
            && ExpiraEm > agora;
    }

    public void Substituir(DateTimeOffset agora)
    {
        SubstituidoEm ??= agora;
    }

    public void Revogar(DateTimeOffset agora)
    {
        RevogadoEm ??= agora;
    }
}
