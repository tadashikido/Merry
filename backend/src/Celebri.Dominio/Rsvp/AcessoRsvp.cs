using Celebri.Dominio.Convidados;

namespace Celebri.Dominio.Rsvp;

public class AcessoRsvp
{
    public const int TamanhoHash = 64;
    public const int TamanhoMaximoTokenCifrado = 200;

    private AcessoRsvp()
    {
        TokenHash = string.Empty;
        TokenCifrado = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid ConviteId { get; private set; }

    public Guid EventoId { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string TokenHash { get; private set; }

    public string TokenCifrado { get; private set; }

    public DateTimeOffset GeradoEm { get; private set; }

    public static AcessoRsvp Gerar(Convite convite, string tokenHash, string tokenCifrado, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(convite);
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenCifrado);

        if (convite.OrganizacaoId == Guid.Empty)
        {
            throw new InvalidOperationException("O convite precisa estar persistido na organização antes de gerar o link RSVP.");
        }

        if (tokenHash.Length != TamanhoHash)
        {
            throw new ArgumentException("O hash do token RSVP deve ter 64 caracteres hexadecimais.", nameof(tokenHash));
        }

        return new AcessoRsvp
        {
            Id = Guid.NewGuid(),
            ConviteId = convite.Id,
            EventoId = convite.EventoId,
            OrganizacaoId = convite.OrganizacaoId,
            TokenHash = tokenHash,
            TokenCifrado = tokenCifrado,
            GeradoEm = agora,
        };
    }

    public void Renovar(string tokenHash, string tokenCifrado, DateTimeOffset agora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenCifrado);

        if (tokenHash.Length != TamanhoHash)
        {
            throw new ArgumentException("O hash do token RSVP deve ter 64 caracteres hexadecimais.", nameof(tokenHash));
        }

        TokenHash = tokenHash;
        TokenCifrado = tokenCifrado;
        GeradoEm = agora;
    }
}
