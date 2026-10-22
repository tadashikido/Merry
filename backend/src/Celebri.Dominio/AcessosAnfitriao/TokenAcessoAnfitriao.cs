namespace Celebri.Dominio.AcessosAnfitriao;

public class TokenAcessoAnfitriao
{
    public const int TamanhoHash = 64;

    private TokenAcessoAnfitriao()
    {
        TokenHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid AcessoAnfitriaoId { get; private set; }

    public Guid EventoId { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string TokenHash { get; private set; }

    public DateTimeOffset GeradoEm { get; private set; }

    public static TokenAcessoAnfitriao Gerar(AcessoAnfitriao acesso, Guid organizacaoId, string tokenHash, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(acesso);

        if (organizacaoId == Guid.Empty)
        {
            throw new ArgumentException("A organização do convite dos anfitriões é obrigatória.", nameof(organizacaoId));
        }

        ValidarHash(tokenHash);

        return new TokenAcessoAnfitriao
        {
            Id = Guid.NewGuid(),
            AcessoAnfitriaoId = acesso.Id,
            EventoId = acesso.EventoId,
            OrganizacaoId = organizacaoId,
            TokenHash = tokenHash,
            GeradoEm = agora,
        };
    }

    public void Renovar(string tokenHash, DateTimeOffset agora)
    {
        ValidarHash(tokenHash);
        TokenHash = tokenHash;
        GeradoEm = agora;
    }

    private static void ValidarHash(string tokenHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);

        if (tokenHash.Length != TamanhoHash)
        {
            throw new ArgumentException("O hash do convite dos anfitriões deve ter 64 caracteres hexadecimais.", nameof(tokenHash));
        }
    }
}
