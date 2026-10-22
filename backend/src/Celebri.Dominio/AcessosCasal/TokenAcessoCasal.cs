namespace Celebri.Dominio.AcessosCasal;

public class TokenAcessoCasal
{
    public const int TamanhoHash = 64;

    private TokenAcessoCasal()
    {
        TokenHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid AcessoCasalId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string TokenHash { get; private set; }

    public DateTimeOffset GeradoEm { get; private set; }

    public static TokenAcessoCasal Gerar(AcessoCasal acesso, Guid organizacaoId, string tokenHash, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(acesso);

        if (organizacaoId == Guid.Empty)
        {
            throw new ArgumentException("A organização do convite do casal é obrigatória.", nameof(organizacaoId));
        }

        ValidarHash(tokenHash);

        return new TokenAcessoCasal
        {
            Id = Guid.NewGuid(),
            AcessoCasalId = acesso.Id,
            CasamentoId = acesso.CasamentoId,
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
            throw new ArgumentException("O hash do convite do casal deve ter 64 caracteres hexadecimais.", nameof(tokenHash));
        }
    }
}
