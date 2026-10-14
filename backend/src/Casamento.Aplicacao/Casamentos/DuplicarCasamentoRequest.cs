using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Dominio.Casamentos;

namespace Casamento.Aplicacao.Casamentos;

public sealed record DuplicarCasamentoRequest(
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
    bool CopiarTarefas = true,
    bool CopiarFornecedores = true,
    bool CopiarCronograma = true) : IValidatableObject
{
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
    }

    public DadosCasamento ParaDados()
    {
        return new DadosCasamento(
            NomePrimeiraPessoa,
            NomeSegundaPessoa,
            Data ?? default,
            SalvarCasamentoRequest.InterpretarHorario(Horario),
            LocalCerimonia,
            LocalRecepcao,
            ConvidadosEstimados: null,
            Observacoes: null,
            DataLimiteRsvp: null);
    }
}
