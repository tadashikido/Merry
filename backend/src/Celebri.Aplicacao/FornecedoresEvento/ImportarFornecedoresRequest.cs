using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record ImportarFornecedoresRequest(
    [Required(ErrorMessage = MensagensFornecedoresEvento.EventoOrigemObrigatorio)]
    Guid? EventoOrigemId);
