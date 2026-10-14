using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Dominio.Usuarios;

namespace Casamento.Aplicacao.AcessosCasal;

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
