using Celebri.Aplicacao.Excecoes;
using Celebri.Dominio.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Celebri.Infraestrutura.Persistencia.Isolamento;

public sealed class IsolamentoOrganizacaoInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ValidarIsolamento(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ValidarIsolamento(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public static void ValidarIsolamento(DbContext? contexto)
    {
        if (contexto is null)
        {
            return;
        }

        var casamentoDbContext = contexto as CasamentoDbContext;
        var organizacaoAtual = casamentoDbContext?.OrganizacaoIdAtual;
        var casamentosPermitidos = casamentoDbContext?.CasamentosPermitidos;

        foreach (var entrada in contexto.ChangeTracker.Entries<IPertenceOrganizacao>())
        {
            if (entrada.State is EntityState.Unchanged or EntityState.Detached)
            {
                continue;
            }

            ValidarEntrada(entrada, organizacaoAtual);
            ValidarCasamento(entrada, casamentosPermitidos);
        }
    }

    private static void ValidarEntrada(EntityEntry<IPertenceOrganizacao> entrada, Guid? organizacaoAtual)
    {
        var nomeEntidade = entrada.Metadata.ClrType.Name;

        if (organizacaoAtual is not { } organizacao || organizacao == Guid.Empty)
        {
            throw new ViolacaoIsolamentoException(nomeEntidade);
        }

        var propriedade = entrada.Property<Guid>(nameof(IPertenceOrganizacao.OrganizacaoId));

        if (entrada.State == EntityState.Added)
        {
            if (propriedade.CurrentValue == Guid.Empty)
            {
                propriedade.CurrentValue = organizacao;
                return;
            }

            if (propriedade.CurrentValue != organizacao)
            {
                throw new ViolacaoIsolamentoException(nomeEntidade);
            }

            return;
        }

        if (propriedade.OriginalValue != organizacao || propriedade.CurrentValue != organizacao)
        {
            throw new ViolacaoIsolamentoException(nomeEntidade);
        }
    }

    private static void ValidarCasamento(EntityEntry<IPertenceOrganizacao> entrada, IReadOnlyCollection<Guid>? casamentosPermitidos)
    {
        if (casamentosPermitidos is null)
        {
            return;
        }

        var nomePropriedade = entrada.Entity switch
        {
            IPertenceCasamento => CasamentoDbContext.PropriedadeCasamento,
            IRaizCasamento => CasamentoDbContext.PropriedadeRaizCasamento,
            _ => null,
        };

        if (nomePropriedade is null)
        {
            return;
        }

        var propriedade = entrada.Property<Guid>(nomePropriedade);
        var permitido = casamentosPermitidos.Contains(propriedade.CurrentValue)
            && (entrada.State == EntityState.Added || casamentosPermitidos.Contains(propriedade.OriginalValue));

        if (!permitido)
        {
            throw new ViolacaoIsolamentoException(entrada.Metadata.ClrType.Name);
        }
    }
}
