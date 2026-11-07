using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.Impersonacao;

public sealed record IniciarImpersonacaoRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    Guid OrganizacaoId,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(500, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string Motivo);
