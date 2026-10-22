using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Eventos;

public sealed record DuplicarEventoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Evento.TamanhoMaximoNome, MinimumLength = Evento.TamanhoMinimoNome, ErrorMessage = MensagensEvento.TamanhoNome)]
    string NomePrimeiraPessoa,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Evento.TamanhoMaximoNome, MinimumLength = Evento.TamanhoMinimoNome, ErrorMessage = MensagensEvento.TamanhoNome)]
    string NomeSegundaPessoa,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    DateOnly? Data,
    [RegularExpression(SalvarEventoRequest.PadraoHorario, ErrorMessage = MensagensEvento.HorarioInvalido)]
    string? Horario,
    [StringLength(Evento.TamanhoMaximoLocal, ErrorMessage = MensagensEvento.TamanhoLocal)]
    string? LocalCerimonia,
    [StringLength(Evento.TamanhoMaximoLocal, ErrorMessage = MensagensEvento.TamanhoLocal)]
    string? LocalRecepcao,
    bool CopiarTarefas = true,
    bool CopiarFornecedores = true,
    bool CopiarCronograma = true) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(NomePrimeiraPessoa) && NomePrimeiraPessoa.Trim().Length < Evento.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensEvento.TamanhoNome, [nameof(NomePrimeiraPessoa)]);
        }

        if (!string.IsNullOrWhiteSpace(NomeSegundaPessoa) && NomeSegundaPessoa.Trim().Length < Evento.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensEvento.TamanhoNome, [nameof(NomeSegundaPessoa)]);
        }

        if (Data is { } data && (data < Evento.DataMinima || data > Evento.DataMaxima))
        {
            yield return new ValidationResult(MensagensEvento.DataForaDaFaixa, [nameof(Data)]);
        }
    }

    public DadosEvento ParaDados()
    {
        return new DadosEvento(
            NomePrimeiraPessoa,
            NomeSegundaPessoa,
            Data ?? default,
            SalvarEventoRequest.InterpretarHorario(Horario),
            LocalCerimonia,
            LocalRecepcao,
            ConvidadosEstimados: null,
            Observacoes: null,
            DataLimiteRsvp: null);
    }
}
