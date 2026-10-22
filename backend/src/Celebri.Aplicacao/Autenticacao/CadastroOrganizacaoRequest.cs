using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.Autenticacao;

public sealed record CadastroOrganizacaoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Organizacao.TamanhoMaximoNome, MinimumLength = Organizacao.TamanhoMinimoNome, ErrorMessage = MensagensValidacao.TamanhoNome)]
    string NomeAssessoria,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(Usuario.TamanhoMaximoNome, MinimumLength = Usuario.TamanhoMinimoNome, ErrorMessage = MensagensValidacao.TamanhoNome)]
    string Nome,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(NormalizadorEmail.TamanhoMaximo, ErrorMessage = MensagensValidacao.EmailInvalido)]
    [EmailAddress(ErrorMessage = MensagensValidacao.EmailInvalido)]
    string Email,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    string Senha) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(NomeAssessoria) is false && NomeAssessoria.Trim().Length < Organizacao.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensValidacao.TamanhoNome, [nameof(NomeAssessoria)]);
        }

        if (string.IsNullOrWhiteSpace(Nome) is false && Nome.Trim().Length < Usuario.TamanhoMinimoNome)
        {
            yield return new ValidationResult(MensagensValidacao.TamanhoNome, [nameof(Nome)]);
        }

        if (Senha is not null)
        {
            var erroSenha = PoliticaSenha.Validar(Senha, Email);
            if (erroSenha is not null)
            {
                yield return new ValidationResult(erroSenha, [nameof(Senha)]);
            }
        }
    }
}
