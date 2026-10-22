using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.DadosSensiveis;

public sealed record SalvarRestricaoAlimentarRequest(
    [MaxLength(RestricaoAlimentar.QuantidadeMaximaTipos, ErrorMessage = MensagensDadosSensiveis.TipoRepetido)]
    IReadOnlyList<string?>? Tipos,
    [StringLength(RestricaoAlimentarRequest.TamanhoMaximoEntradaOutra, ErrorMessage = MensagensDadosSensiveis.TamanhoOutraRestricao)]
    string? OutraRestricao,
    [StringLength(RestricaoAlimentarRequest.TamanhoMaximoEntradaNecessidade, ErrorMessage = MensagensDadosSensiveis.TamanhoNecessidadeEspecial)]
    string? NecessidadeEspecial,
    bool? ConsentimentoObtido) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        return ParaRestricaoRequest().Validate(validationContext);
    }

    public RestricaoAlimentarRequest ParaRestricaoRequest()
    {
        return new RestricaoAlimentarRequest(Tipos, OutraRestricao, NecessidadeEspecial);
    }
}
