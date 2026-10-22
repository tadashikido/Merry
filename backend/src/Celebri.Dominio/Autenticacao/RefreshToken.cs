namespace Celebri.Dominio.Autenticacao;

public class RefreshToken
{
    public const int TamanhoHash = 64;

    private RefreshToken()
    {
        TokenHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid UsuarioId { get; private set; }

    public string TokenHash { get; private set; }

    public Guid Familia { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset ExpiraEm { get; private set; }

    public DateTimeOffset? SubstituidoEm { get; private set; }

    public DateTimeOffset? RevogadoEm { get; private set; }

    public bool FoiUtilizado => SubstituidoEm.HasValue || RevogadoEm.HasValue;

    public static RefreshToken Emitir(Guid usuarioId, Guid familia, string tokenHash, DateTimeOffset agora, DateTimeOffset expiraEm)
    {
        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
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

    public void Substituir(DateTimeOffset agora)
    {
        SubstituidoEm ??= agora;
    }

    public void Revogar(DateTimeOffset agora)
    {
        RevogadoEm ??= agora;
    }
}
