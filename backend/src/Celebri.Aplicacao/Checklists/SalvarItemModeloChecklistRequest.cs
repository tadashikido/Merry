using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Checklists;

public sealed record SalvarItemModeloChecklistRequest(
    [Required(ErrorMessage = MensagensTarefas.TituloObrigatorio)]
    [StringLength(TarefaEvento.TamanhoMaximoTitulo, ErrorMessage = MensagensTarefas.TamanhoTitulo)]
    string? Titulo,
    [StringLength(TarefaEvento.TamanhoMaximoDescricao, ErrorMessage = MensagensTarefas.TamanhoDescricao)]
    string? Descricao,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ResponsavelTarefa>))]
    ResponsavelTarefa? Responsavel,
    [property: JsonConverter(typeof(JsonStringEnumConverter<CategoriaTarefa>))]
    CategoriaTarefa? Categoria,
    [Required(ErrorMessage = MensagensChecklist.DiasObrigatorios)]
    int? DiasAntesDoEvento) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var titulo = NormalizadorTexto.Normalizar(Titulo);

        if (titulo is not null && titulo.Length < TarefaEvento.TamanhoMinimoTitulo)
        {
            yield return new ValidationResult(MensagensTarefas.TamanhoTitulo, [nameof(Titulo)]);
        }

        if (Responsavel is { } responsavel && !Enum.IsDefined(responsavel))
        {
            yield return new ValidationResult(MensagensTarefas.ResponsavelInvalido, [nameof(Responsavel)]);
        }

        if (Categoria is { } categoria && !Enum.IsDefined(categoria))
        {
            yield return new ValidationResult(MensagensTarefas.CategoriaInvalida, [nameof(Categoria)]);
        }

        if (DiasAntesDoEvento is { } dias && !ItemModeloChecklist.DiasValidos(dias))
        {
            yield return new ValidationResult(MensagensChecklist.DiasForaDaFaixa, [nameof(DiasAntesDoEvento)]);
        }
    }

    public DadosItemModeloChecklist ParaDados()
    {
        return new DadosItemModeloChecklist(
            Titulo,
            Descricao,
            Responsavel ?? ResponsavelTarefa.Assessoria,
            Categoria ?? CategoriaTarefa.Geral,
            DiasAntesDoEvento ?? throw new RegraNegocioException(MensagensChecklist.DiasObrigatorios));
    }
}
