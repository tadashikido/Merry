using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public sealed record MarcarConvitesEnviadosRequest(
    [Required(ErrorMessage = MensagensConvidados.ConvitesParaEnvioObrigatorios)]
    [MinLength(1, ErrorMessage = MensagensConvidados.ConvitesParaEnvioObrigatorios)]
    IReadOnlyList<Guid>? ConviteIds);
