using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Celebri.Api.Filtros;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class LimitarTamanhoRequisicaoAttribute : Attribute, IResourceFilter
{
    public const string TituloRequisicaoGrandeDemais = "A requisição passa do tamanho permitido.";

    public LimitarTamanhoRequisicaoAttribute(long limiteBytes, string mensagem)
    {
        LimiteBytes = limiteBytes;
        Mensagem = mensagem;
    }

    public long LimiteBytes { get; }

    public string Mensagem { get; }

    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (context.HttpContext.Request.ContentLength is { } tamanho && tamanho > LimiteBytes)
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status413PayloadTooLarge,
                Title = TituloRequisicaoGrandeDemais,
                Detail = Mensagem,
            })
            {
                StatusCode = StatusCodes.Status413PayloadTooLarge,
                ContentTypes = { "application/problem+json" },
            };
        }
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
