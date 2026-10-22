namespace Casamento.Dominio.Autenticacao;

public class TokenRedefinicaoSenha
{
    public const int TamanhoHash = 64;

    private TokenRedefinicaoSenha()
    {
        TokenHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid UsuarioId { get; private set; }

    public string TokenHash { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset ExpiraEm { get; private set; }

    public DateTimeOffset? UsadoEm { get; private set; }

    public DateTimeOffset? InvalidadoEm { get; private set; }

    public static TokenRedefinicaoSenha Emitir(Guid usuarioId, string tokenHash, DateTimeOffset agora, DateTimeOffset expiraEm)
    {
        return new TokenRedefinicaoSenha
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            TokenHash = tokenHash,
            CriadoEm = agora,
            ExpiraEm = expiraEm,
        };
    }

    public bool EstaValido(DateTimeOffset agora)
    {
        return !UsadoEm.HasValue && !InvalidadoEm.HasValue && ExpiraEm > agora;
    }

    public void MarcarUsado(DateTimeOffset agora)
    {
        UsadoEm ??= agora;
    }

    public void Invalidar(DateTimeOffset agora)
    {
        InvalidadoEm ??= agora;
    }
}
