using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Eventos;

public sealed record SalvarEventoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Evento.TamanhoMaximoNome, MinimumLength = Evento.TamanhoMinimoNome, ErrorMessage = MensagensEvento.TamanhoNome)]
    string NomePrimeiraPessoa,
    [StringLength(Evento.TamanhoMaximoNome, ErrorMessage = MensagensEvento.TamanhoNome)]
    string? NomeSegundaPessoa,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    DateOnly? Data,
    [RegularExpression(SalvarEventoRequest.PadraoHorario, ErrorMessage = MensagensEvento.HorarioInvalido)]
    string? Horario,
    [StringLength(Evento.TamanhoMaximoLocal, ErrorMessage = MensagensEvento.TamanhoLocal)]
    string? LocalCerimonia,
    [StringLength(Evento.TamanhoMaximoLocal, ErrorMessage = MensagensEvento.TamanhoLocal)]
    string? LocalRecepcao,
    [Range(Evento.ConvidadosMinimo, Evento.ConvidadosMaximo, ErrorMessage = MensagensEvento.ConvidadosForaDaFaixa)]
    int? ConvidadosEstimados,
    [StringLength(Evento.TamanhoMaximoObservacoes, ErrorMessage = MensagensEvento.TamanhoObservacoes)]
    string? Observacoes,
    DateOnly? DataLimiteRsvp = null,
    [Required(ErrorMessage = MensagensEvento.TipoObrigatorio)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<TipoEvento>))]
    TipoEvento? Tipo = null) : IValidatableObject
{
    public const string PadraoHorario = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    public const string FormatoHorario = "HH:mm";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(NomePrimeiraPessoa) && NomePrimeiraPessoa.Trim().Length < Evento.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensEvento.TamanhoNome, [nameof(NomePrimeiraPessoa)]);
        }

        foreach (var erro in ValidarHomenageados(Tipo, NomeSegundaPessoa))
        {
            yield return erro;
        }

        if (Data is { } data && (data < Evento.DataMinima || data > Evento.DataMaxima))
        {
            yield return new ValidationResult(MensagensEvento.DataForaDaFaixa, [nameof(Data)]);
        }

        if (DataLimiteRsvp is { } dataLimite && (dataLimite < Evento.DataMinima || (Data is { } dataEvento && dataLimite > dataEvento)))
        {
            yield return new ValidationResult(MensagensEvento.DataLimiteRsvpInvalida, [nameof(DataLimiteRsvp)]);
        }
    }

    public DadosEvento ParaDados()
    {
        return new DadosEvento(
            NomePrimeiraPessoa,
            NomeSegundaPessoa,
            Data ?? default,
            InterpretarHorario(Horario),
            LocalCerimonia,
            LocalRecepcao,
            ConvidadosEstimados,
            Observacoes,
            DataLimiteRsvp,
            Tipo ?? throw new RegraNegocioException(MensagensEvento.TipoObrigatorio, Evento.CampoTipo));
    }

    public static IEnumerable<ValidationResult> ValidarHomenageados(TipoEvento? tipo, string? nomeSegundaPessoa)
    {
        if (tipo is { } valor && !RegrasTipoEvento.EhDisponivel(valor))
        {
            yield return new ValidationResult(MensagensEvento.TipoInvalido, [nameof(Tipo)]);
            yield break;
        }

        var informado = !string.IsNullOrWhiteSpace(nomeSegundaPessoa);

        if (tipo is { } exige && RegrasTipoEvento.ExigeSegundoNome(exige) && !informado)
        {
            yield return new ValidationResult(MensagensEvento.SegundoNomeObrigatorio, [nameof(NomeSegundaPessoa)]);
        }
        else if (tipo is { } aceita && !RegrasTipoEvento.AceitaSegundoNome(aceita) && informado)
        {
            yield return new ValidationResult(MensagensEvento.UmHomenageado, [nameof(NomeSegundaPessoa)]);
        }
        else if (informado && nomeSegundaPessoa!.Trim().Length < Evento.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensEvento.TamanhoNome, [nameof(NomeSegundaPessoa)]);
        }
    }

    public static TimeOnly? InterpretarHorario(string? horario)
    {
        if (string.IsNullOrWhiteSpace(horario))
        {
            return null;
        }

        if (!TimeOnly.TryParseExact(horario.Trim(), FormatoHorario, CultureInfo.InvariantCulture, DateTimeStyles.None, out var resultado))
        {
            throw new RegraNegocioException(MensagensEvento.HorarioInvalido);
        }

        return resultado;
    }
}
