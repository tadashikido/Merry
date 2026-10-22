using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Cronogramas;

public sealed record SalvarItemCronogramaRequest(
    [property: JsonConverter(typeof(JsonStringEnumConverter<DiaCronograma>))]
    DiaCronograma? Dia,
    [Required(ErrorMessage = MensagensCronograma.InicioObrigatorio)]
    [RegularExpression(SalvarEventoRequest.PadraoHorario, ErrorMessage = MensagensCronograma.HorarioInvalido)]
    string? Inicio,
    [Range(ItemCronograma.DuracaoMinima, ItemCronograma.DuracaoMaxima, ErrorMessage = MensagensCronograma.DuracaoInvalida)]
    int? DuracaoMinutos,
    [Required(ErrorMessage = MensagensCronograma.AtividadeObrigatoria)]
    [StringLength(ItemCronograma.TamanhoMaximoAtividade, ErrorMessage = MensagensCronograma.TamanhoAtividade)]
    string? Atividade,
    [StringLength(ItemCronograma.TamanhoMaximoLocal, ErrorMessage = MensagensCronograma.TamanhoLocal)]
    string? Local,
    [StringLength(ItemCronograma.TamanhoMaximoResponsavel, ErrorMessage = MensagensCronograma.TamanhoResponsavel)]
    string? Responsavel,
    Guid? FornecedorEventoId,
    [StringLength(ItemCronograma.TamanhoMaximoTexto, ErrorMessage = MensagensCronograma.TamanhoTexto)]
    string? Instrucoes,
    [StringLength(ItemCronograma.TamanhoMaximoTexto, ErrorMessage = MensagensCronograma.TamanhoTexto)]
    string? NotasInternas) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var atividade = NormalizadorTexto.Normalizar(Atividade);

        if (atividade is not null && atividade.Length < ItemCronograma.TamanhoMinimoAtividade)
        {
            yield return new ValidationResult(MensagensCronograma.TamanhoAtividade, [nameof(Atividade)]);
        }

        if (Dia is { } dia && !Enum.IsDefined(dia))
        {
            yield return new ValidationResult(MensagensCronograma.DiaInvalido, [nameof(Dia)]);
        }
    }

    public DadosItemCronograma ParaDados()
    {
        return new DadosItemCronograma(
            Dia ?? DiaCronograma.DiaDoEvento,
            InterpretarInicio(Inicio),
            DuracaoMinutos,
            Atividade,
            Local,
            Responsavel,
            FornecedorEventoId,
            Instrucoes,
            NotasInternas);
    }

    private static TimeOnly InterpretarInicio(string? inicio)
    {
        if (string.IsNullOrWhiteSpace(inicio))
        {
            throw new RegraNegocioException(MensagensCronograma.InicioObrigatorio, ItemCronograma.CampoInicio);
        }

        if (!TimeOnly.TryParseExact(
                inicio.Trim(),
                SalvarEventoRequest.FormatoHorario,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var resultado))
        {
            throw new RegraNegocioException(MensagensCronograma.HorarioInvalido, ItemCronograma.CampoInicio);
        }

        return resultado;
    }
}
