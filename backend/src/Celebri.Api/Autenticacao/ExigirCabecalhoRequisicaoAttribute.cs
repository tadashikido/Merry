using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Celebri.Api.Autenticacao;

[AttributeUsage(AttributeTargets.Method)]
public sealed class ExigirCabecalhoRequisicaoAttribute : ActionFilterAttribute
{
    public const string NomeCabecalho = "X-Requested-With";
    public const string ValorCabecalho = "XMLHttpRequest";
    public const string TituloCabecalhoAusente = "A requisição não foi enviada pela aplicação.";

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var valor = context.HttpContext.Request.Headers[NomeCabecalho].ToString();
        if (!string.Equals(valor, ValorCabecalho, StringComparison.Ordinal))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = TituloCabecalhoAusente,
            })
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" },
            };
        }
    }
}
