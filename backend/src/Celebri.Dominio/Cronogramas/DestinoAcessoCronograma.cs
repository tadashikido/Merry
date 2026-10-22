using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;

namespace Casamento.Dominio.Cronogramas;

public sealed record DestinoAcessoCronograma
{
    public const string CampoTipo = "tipo";
    public const string CampoFornecedor = "fornecedorCasamentoId";
    public const string CampoResponsavel = "responsavel";

    private DestinoAcessoCronograma(TipoAcessoCronograma tipo, Guid? fornecedorCasamentoId, string? responsavelChave)
    {
        Tipo = tipo;
        FornecedorCasamentoId = fornecedorCasamentoId;
        ResponsavelChave = responsavelChave;
    }

    public TipoAcessoCronograma Tipo { get; }

    public Guid? FornecedorCasamentoId { get; }

    public string? ResponsavelChave { get; }

    public static DestinoAcessoCronograma Geral()
    {
        return new DestinoAcessoCronograma(TipoAcessoCronograma.Geral, null, null);
    }

    public static DestinoAcessoCronograma DoFornecedor(Guid? fornecedorCasamentoId)
    {
        if (fornecedorCasamentoId is not { } id || id == Guid.Empty)
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.FornecedorInvalido, CampoFornecedor);
        }

        return new DestinoAcessoCronograma(TipoAcessoCronograma.Fornecedor, id, null);
    }

    public static DestinoAcessoCronograma DoResponsavel(string? responsavel)
    {
        var chave = NormalizadorTexto.ChaveComparacao(responsavel);

        if (chave is null)
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.ResponsavelObrigatorio, CampoResponsavel);
        }

        if (chave.Length > ItemCronograma.TamanhoMaximoResponsavel)
        {
            throw new RegraNegocioException(MensagensCronograma.TamanhoResponsavel, CampoResponsavel);
        }

        return new DestinoAcessoCronograma(TipoAcessoCronograma.Responsavel, null, chave);
    }

    public bool AtendeItem(ItemCronograma item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return Tipo switch
        {
            TipoAcessoCronograma.Geral => true,
            TipoAcessoCronograma.Fornecedor => item.FornecedorCasamentoId is { } vinculo && vinculo == FornecedorCasamentoId,
            TipoAcessoCronograma.Responsavel => item.ResponsavelChave is { } chave && string.Equals(chave, ResponsavelChave, StringComparison.Ordinal),
            _ => false,
        };
    }
}
