using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.ModelosCronograma;

public sealed record SalvarItemModeloCronogramaRequest(
    [Required(ErrorMessage = MensagensModeloCronograma.MinutosObrigatorios)]
    [Range(-ItemCronograma.MinutosRelativosMaximo, ItemCronograma.MinutosRelativosMaximo, ErrorMessage = MensagensModeloCronograma.ForaDaJanela)]
    int? MinutosDesdeCerimonia,
    [Range(ItemCronograma.DuracaoMinima, ItemCronograma.DuracaoMaxima, ErrorMessage = MensagensCronograma.DuracaoInvalida)]
    int? DuracaoMinutos,
    [Required(ErrorMessage = MensagensCronograma.AtividadeObrigatoria)]
    [StringLength(ItemCronograma.TamanhoMaximoAtividade, ErrorMessage = MensagensCronograma.TamanhoAtividade)]
    string? Atividade,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ReferenciaLocalCronograma>))]
    ReferenciaLocalCronograma? ReferenciaLocal,
    [StringLength(ItemCronograma.TamanhoMaximoLocal, ErrorMessage = MensagensCronograma.TamanhoLocal)]
    string? Local,
    [StringLength(ItemCronograma.TamanhoMaximoResponsavel, ErrorMessage = MensagensCronograma.TamanhoResponsavel)]
    string? Responsavel,
    [property: JsonConverter(typeof(JsonStringEnumConverter<CategoriaFornecedor>))]
    CategoriaFornecedor? CategoriaFornecedor,
    [StringLength(ItemCronograma.TamanhoMaximoTexto, ErrorMessage = MensagensCronograma.TamanhoTexto)]
    string? Instrucoes) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var atividade = NormalizadorTexto.Normalizar(Atividade);

        if (atividade is not null && atividade.Length < ItemCronograma.TamanhoMinimoAtividade)
        {
            yield return new ValidationResult(MensagensCronograma.TamanhoAtividade, [nameof(Atividade)]);
        }

        if (ReferenciaLocal is { } referencia && !Enum.IsDefined(referencia))
        {
            yield return new ValidationResult(MensagensModeloCronograma.ReferenciaLocalInvalida, [nameof(ReferenciaLocal)]);
        }

        if (CategoriaFornecedor is { } categoria && !Enum.IsDefined(categoria))
        {
            yield return new ValidationResult(MensagensModeloCronograma.CategoriaInvalida, [nameof(CategoriaFornecedor)]);
        }
    }

    public DadosItemModeloCronograma ParaDados()
    {
        return new DadosItemModeloCronograma(
            MinutosDesdeCerimonia
                ?? throw new RegraNegocioException(MensagensModeloCronograma.MinutosObrigatorios, ItemModeloCronograma.CampoMinutos),
            DuracaoMinutos,
            Atividade,
            ReferenciaLocal,
            Local,
            Responsavel,
            CategoriaFornecedor,
            Instrucoes);
    }
}
