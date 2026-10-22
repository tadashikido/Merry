using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Celebri.Aplicacao.Casamentos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record SalvarModeloCronogramaRequest(
    [Required(ErrorMessage = MensagensModeloCronograma.NomeObrigatorio)]
    [StringLength(ModeloCronograma.TamanhoMaximoNome, ErrorMessage = MensagensModeloCronograma.TamanhoNome)]
    string? Nome,
    [StringLength(ModeloCronograma.TamanhoMaximoDescricao, ErrorMessage = MensagensModeloCronograma.TamanhoDescricao)]
    string? Descricao,
    [RegularExpression(SalvarCasamentoRequest.PadraoHorario, ErrorMessage = MensagensModeloCronograma.HorarioReferenciaInvalido)]
    string? HorarioReferencia = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var nome = NormalizadorTexto.Normalizar(Nome);

        if (nome is not null && nome.Length < ModeloCronograma.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensModeloCronograma.TamanhoNome, [nameof(Nome)]);
        }
    }

    public TimeOnly? InterpretarHorarioReferencia()
    {
        if (string.IsNullOrWhiteSpace(HorarioReferencia))
        {
            return null;
        }

        if (!TimeOnly.TryParseExact(
                HorarioReferencia.Trim(),
                SalvarCasamentoRequest.FormatoHorario,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var resultado))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.HorarioReferenciaInvalido, ModeloCronograma.CampoHorarioReferencia);
        }

        return resultado;
    }
}
