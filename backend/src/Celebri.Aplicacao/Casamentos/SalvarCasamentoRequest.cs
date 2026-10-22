using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Excecoes;

namespace Casamento.Aplicacao.Casamentos;

public sealed record SalvarCasamentoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(CasamentoAssessorado.TamanhoMaximoNome, MinimumLength = CasamentoAssessorado.TamanhoMinimoNome, ErrorMessage = MensagensCasamento.TamanhoNome)]
    string NomePrimeiraPessoa,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(CasamentoAssessorado.TamanhoMaximoNome, MinimumLength = CasamentoAssessorado.TamanhoMinimoNome, ErrorMessage = MensagensCasamento.TamanhoNome)]
    string NomeSegundaPessoa,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    DateOnly? Data,
    [RegularExpression(SalvarCasamentoRequest.PadraoHorario, ErrorMessage = MensagensCasamento.HorarioInvalido)]
    string? Horario,
    [StringLength(CasamentoAssessorado.TamanhoMaximoLocal, ErrorMessage = MensagensCasamento.TamanhoLocal)]
    string? LocalCerimonia,
    [StringLength(CasamentoAssessorado.TamanhoMaximoLocal, ErrorMessage = MensagensCasamento.TamanhoLocal)]
    string? LocalRecepcao,
    [Range(CasamentoAssessorado.ConvidadosMinimo, CasamentoAssessorado.ConvidadosMaximo, ErrorMessage = MensagensCasamento.ConvidadosForaDaFaixa)]
    int? ConvidadosEstimados,
    [StringLength(CasamentoAssessorado.TamanhoMaximoObservacoes, ErrorMessage = MensagensCasamento.TamanhoObservacoes)]
    string? Observacoes,
    DateOnly? DataLimiteRsvp = null) : IValidatableObject
{
    public const string PadraoHorario = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    public const string FormatoHorario = "HH:mm";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(NomePrimeiraPessoa) && NomePrimeiraPessoa.Trim().Length < CasamentoAssessorado.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensCasamento.TamanhoNome, [nameof(NomePrimeiraPessoa)]);
        }

        if (!string.IsNullOrWhiteSpace(NomeSegundaPessoa) && NomeSegundaPessoa.Trim().Length < CasamentoAssessorado.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensCasamento.TamanhoNome, [nameof(NomeSegundaPessoa)]);
        }

        if (Data is { } data && (data < CasamentoAssessorado.DataMinima || data > CasamentoAssessorado.DataMaxima))
        {
            yield return new ValidationResult(MensagensCasamento.DataForaDaFaixa, [nameof(Data)]);
        }

        if (DataLimiteRsvp is { } dataLimite && (dataLimite < CasamentoAssessorado.DataMinima || (Data is { } dataCasamento && dataLimite > dataCasamento)))
        {
            yield return new ValidationResult(MensagensCasamento.DataLimiteRsvpInvalida, [nameof(DataLimiteRsvp)]);
        }
    }

    public DadosCasamento ParaDados()
    {
        return new DadosCasamento(
            NomePrimeiraPessoa,
            NomeSegundaPessoa,
            Data ?? default,
            InterpretarHorario(Horario),
            LocalCerimonia,
            LocalRecepcao,
            ConvidadosEstimados,
            Observacoes,
            DataLimiteRsvp);
    }

    public static TimeOnly? InterpretarHorario(string? horario)
    {
        if (string.IsNullOrWhiteSpace(horario))
        {
            return null;
        }

        if (!TimeOnly.TryParseExact(horario.Trim(), FormatoHorario, CultureInfo.InvariantCulture, DateTimeStyles.None, out var resultado))
        {
            throw new RegraNegocioException(MensagensCasamento.HorarioInvalido);
        }

        return resultado;
    }
}
