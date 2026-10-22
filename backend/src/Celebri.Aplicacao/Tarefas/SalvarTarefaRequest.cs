using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Tarefas;

public sealed record SalvarTarefaRequest(
    [Required(ErrorMessage = MensagensTarefas.TituloObrigatorio)]
    [StringLength(TarefaCasamento.TamanhoMaximoTitulo, ErrorMessage = MensagensTarefas.TamanhoTitulo)]
    string? Titulo,
    [StringLength(TarefaCasamento.TamanhoMaximoDescricao, ErrorMessage = MensagensTarefas.TamanhoDescricao)]
    string? Descricao,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ResponsavelTarefa>))]
    ResponsavelTarefa? Responsavel,
    [property: JsonConverter(typeof(JsonStringEnumConverter<CategoriaTarefa>))]
    CategoriaTarefa? Categoria,
    DateOnly? Prazo) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var titulo = NormalizadorTexto.Normalizar(Titulo);

        if (titulo is not null && titulo.Length < TarefaCasamento.TamanhoMinimoTitulo)
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

        if (Prazo is { } prazo && (prazo < TarefaCasamento.PrazoMinimo || prazo > TarefaCasamento.PrazoMaximo))
        {
            yield return new ValidationResult(MensagensTarefas.PrazoForaDaFaixa, [nameof(Prazo)]);
        }
    }

    public DadosTarefa ParaDados()
    {
        return new DadosTarefa(
            Titulo,
            Descricao,
            Responsavel ?? ResponsavelTarefa.Assessoria,
            Categoria ?? CategoriaTarefa.Geral,
            Prazo);
    }
}
