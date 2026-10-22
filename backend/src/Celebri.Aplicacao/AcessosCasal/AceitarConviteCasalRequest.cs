using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.AcessosCasal;

public sealed record AceitarConviteCasalRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenConviteCasal.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string? Token,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Senha) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Senha is not null && PoliticaSenha.Validar(Senha) is { } erroSenha)
        {
            yield return new ValidationResult(erroSenha, [nameof(Senha)]);
        }
    }
}
