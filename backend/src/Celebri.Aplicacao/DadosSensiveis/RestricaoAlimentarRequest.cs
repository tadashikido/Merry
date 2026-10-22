using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.DadosSensiveis;

public sealed record RestricaoAlimentarRequest(
    [MaxLength(RestricaoAlimentar.QuantidadeMaximaTipos, ErrorMessage = MensagensDadosSensiveis.TipoRepetido)]
    IReadOnlyList<string?>? Tipos,
    [StringLength(RestricaoAlimentarRequest.TamanhoMaximoEntradaOutra, ErrorMessage = MensagensDadosSensiveis.TamanhoOutraRestricao)]
    string? OutraRestricao,
    [StringLength(RestricaoAlimentarRequest.TamanhoMaximoEntradaNecessidade, ErrorMessage = MensagensDadosSensiveis.TamanhoNecessidadeEspecial)]
    string? NecessidadeEspecial) : IValidatableObject
{
    public const int TamanhoMaximoEntradaOutra = RestricaoAlimentar.TamanhoMaximoOutraRestricao * 2;
    public const int TamanhoMaximoEntradaNecessidade = RestricaoAlimentar.TamanhoMaximoNecessidadeEspecial * 2;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((Tipos ?? []).Any(nome => !TiposRestricaoAlimentar.TentarInterpretar(nome, out _)))
        {
            yield return new ValidationResult(MensagensDadosSensiveis.TipoInvalido, [nameof(Tipos)]);
        }
    }

    public RestricaoAlimentar? ParaRestricao()
    {
        var tipos = new List<TipoRestricaoAlimentar>();

        foreach (var nome in Tipos ?? [])
        {
            if (!TiposRestricaoAlimentar.TentarInterpretar(nome, out var tipo))
            {
                throw new Dominio.Excecoes.RegraNegocioException(MensagensDadosSensiveis.TipoInvalido);
            }

            tipos.Add(tipo);
        }

        return RestricaoAlimentar.Criar(tipos, OutraRestricao, NecessidadeEspecial);
    }

    public AlteracaoDadosSensiveis ParaAlteracao()
    {
        return AlteracaoDadosSensiveis.Para(ParaRestricao());
    }
}
