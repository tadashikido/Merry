using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Convidados;

public sealed record SalvarConviteRequest(
    [StringLength(Convite.TamanhoMaximoNome, ErrorMessage = MensagensConvidados.TamanhoNome)]
    string? Nome,
    [StringLength(Convite.TamanhoMaximoGrupo, ErrorMessage = MensagensConvidados.TamanhoGrupo)]
    string? Grupo,
    [Range(Convite.LimiteAcompanhantesMinimo, Convite.LimiteAcompanhantesMaximo, ErrorMessage = MensagensConvidados.LimiteAcompanhantesForaDaFaixa)]
    int? LimiteAcompanhantes,
    [Required(ErrorMessage = MensagensConvidados.QuantidadeConvidados)]
    [MinLength(Convite.ConvidadosMinimo, ErrorMessage = MensagensConvidados.QuantidadeConvidados)]
    [MaxLength(Convite.ConvidadosMaximo, ErrorMessage = MensagensConvidados.QuantidadeConvidados)]
    IReadOnlyList<SalvarConvidadoRequest>? Convidados) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var nome = NormalizadorTexto.Normalizar(Nome);

        if (nome is not null && nome.Length < Convite.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensConvidados.TamanhoNome, [nameof(Nome)]);
        }
    }

    public DadosConvite ParaDados()
    {
        return new DadosConvite(
            Nome,
            Grupo,
            LimiteAcompanhantes ?? Convite.LimiteAcompanhantesMinimo,
            (Convidados ?? []).Select(convidado => convidado.ParaDados()).ToList());
    }
}
