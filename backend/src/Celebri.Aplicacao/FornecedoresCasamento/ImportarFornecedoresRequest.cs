using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Fornecedores;

namespace Casamento.Aplicacao.FornecedoresCasamento;

public sealed record ImportarFornecedoresRequest(
    [Required(ErrorMessage = MensagensFornecedoresCasamento.CasamentoOrigemObrigatorio)]
    Guid? CasamentoOrigemId);
