using Casamento.Dominio.Casamentos;

namespace Casamento.Dominio.Cronogramas;

public class AcessoCronograma
{
    public const int TamanhoHash = 64;
    public const int TamanhoMaximoTokenCifrado = 200;

    private AcessoCronograma()
    {
        TokenHash = string.Empty;
        TokenCifrado = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public TipoAcessoCronograma Tipo { get; private set; }

    public Guid? FornecedorCasamentoId { get; private set; }

    public string? ResponsavelChave { get; private set; }

    public string TokenHash { get; private set; }

    public string TokenCifrado { get; private set; }

    public DateTimeOffset GeradoEm { get; private set; }

    public DestinoAcessoCronograma Destino => Tipo switch
    {
        TipoAcessoCronograma.Fornecedor => DestinoAcessoCronograma.DoFornecedor(FornecedorCasamentoId),
        TipoAcessoCronograma.Responsavel => DestinoAcessoCronograma.DoResponsavel(ResponsavelChave),
        _ => DestinoAcessoCronograma.Geral(),
    };

    public static AcessoCronograma Gerar(
        CasamentoAssessorado casamento,
        DestinoAcessoCronograma destino,
        string tokenHash,
        string tokenCifrado,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(casamento);
        ArgumentNullException.ThrowIfNull(destino);

        if (casamento.OrganizacaoId == Guid.Empty)
        {
            throw new InvalidOperationException("O casamento precisa estar persistido na organização antes de gerar o link do cronograma.");
        }

        var acesso = new AcessoCronograma
        {
            Id = Guid.NewGuid(),
            OrganizacaoId = casamento.OrganizacaoId,
            CasamentoId = casamento.Id,
            Tipo = destino.Tipo,
            FornecedorCasamentoId = destino.FornecedorCasamentoId,
            ResponsavelChave = destino.ResponsavelChave,
        };

        acesso.Renovar(tokenHash, tokenCifrado, agora);
        return acesso;
    }

    public void Renovar(string tokenHash, string tokenCifrado, DateTimeOffset agora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenCifrado);

        if (tokenHash.Length != TamanhoHash)
        {
            throw new ArgumentException("O hash do token do cronograma deve ter 64 caracteres hexadecimais.", nameof(tokenHash));
        }

        TokenHash = tokenHash;
        TokenCifrado = tokenCifrado;
        GeradoEm = agora;
    }

    public bool AtendeItem(ItemCronograma item)
    {
        ArgumentNullException.ThrowIfNull(item);
        return item.CasamentoId == CasamentoId && Destino.AtendeItem(item);
    }

    public bool MesmoDestino(DestinoAcessoCronograma destino)
    {
        ArgumentNullException.ThrowIfNull(destino);
        return Destino == destino;
    }
}
