using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public sealed record SalvarConvidadoRequest(
    Guid? Id,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Convidado.TamanhoMaximoNome, ErrorMessage = MensagensConvidados.TamanhoNome)]
    string? Nome,
    [StringLength(NormalizadorTelefone.TamanhoMaximoEntrada, ErrorMessage = MensagensConvidados.TelefoneInvalido)]
    string? Telefone,
    [StringLength(ValidadorEmailConvidado.TamanhoMaximo, ErrorMessage = MensagensConvidados.EmailInvalido)]
    string? Email,
    [property: JsonConverter(typeof(JsonStringEnumConverter<FaixaEtaria>))]
    FaixaEtaria? FaixaEtaria,
    [property: JsonConverter(typeof(JsonStringEnumConverter<RespostaRsvp>))]
    RespostaRsvp? Resposta) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var nome = NormalizadorTexto.Normalizar(Nome);

        if (nome is not null && nome.Length < Convidado.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensConvidados.TamanhoNome, [nameof(Nome)]);
        }

        if (!NormalizadorTelefone.Valido(Telefone))
        {
            yield return new ValidationResult(MensagensConvidados.TelefoneInvalido, [nameof(Telefone)]);
        }

        if (!ValidadorEmailConvidado.Valido(Email))
        {
            yield return new ValidationResult(MensagensConvidados.EmailInvalido, [nameof(Email)]);
        }

        if (FaixaEtaria is { } faixa && !Enum.IsDefined(faixa))
        {
            yield return new ValidationResult(MensagensConvidados.FaixaEtariaInvalida, [nameof(FaixaEtaria)]);
        }

        if (Resposta is { } resposta && !Enum.IsDefined(resposta))
        {
            yield return new ValidationResult(MensagensConvidados.RespostaInvalida, [nameof(Resposta)]);
        }
    }

    public DadosConvidado ParaDados()
    {
        return new DadosConvidado(
            Id,
            Nome,
            Telefone,
            Email,
            FaixaEtaria ?? Dominio.Convidados.FaixaEtaria.Adulto,
            Resposta ?? RespostaRsvp.Pendente);
    }
}
