using System.ComponentModel.DataAnnotations;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresCasamento;

public sealed record ImportarFornecedoresRequest(
    [Required(ErrorMessage = MensagensFornecedoresCasamento.CasamentoOrigemObrigatorio)]
    Guid? CasamentoOrigemId);
