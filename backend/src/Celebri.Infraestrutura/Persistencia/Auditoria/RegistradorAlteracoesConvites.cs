using Celebri.Dominio.Convidados;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Auditoria;

public static class RegistradorAlteracoesConvites
{
    public static IReadOnlyList<RegistroAlteracaoConvite> Registrar(CasamentoDbContext contexto, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(contexto);

        contexto.ChangeTracker.DetectChanges();

        var alteracoes = new Dictionary<Guid, (Guid OrganizacaoId, Guid CasamentoId, AcaoAlteracaoConvite Acao)>();

        foreach (var entrada in contexto.ChangeTracker.Entries<Convite>())
        {
            var acao = entrada.State switch
            {
                EntityState.Added => AcaoAlteracaoConvite.Criacao,
                EntityState.Deleted => AcaoAlteracaoConvite.Remocao,
                EntityState.Modified => AcaoAlteracaoConvite.Alteracao,
                _ => (AcaoAlteracaoConvite?)null,
            };

            if (acao is { } acaoConvite)
            {
                alteracoes[entrada.Entity.Id] = (entrada.Entity.OrganizacaoId, entrada.Entity.CasamentoId, acaoConvite);
            }
        }

        foreach (var entrada in contexto.ChangeTracker.Entries<Convidado>())
        {
            if (entrada.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
            {
                continue;
            }

            var convidado = entrada.Entity;
            if (!alteracoes.ContainsKey(convidado.ConviteId))
            {
                alteracoes[convidado.ConviteId] = (convidado.OrganizacaoId, convidado.CasamentoId, AcaoAlteracaoConvite.Alteracao);
            }
        }

        if (alteracoes.Count == 0)
        {
            return [];
        }

        var autor = contexto.AutorAlteracao;
        var registros = alteracoes
            .Select(alteracao => RegistroAlteracaoConvite.Registrar(
                alteracao.Value.OrganizacaoId,
                alteracao.Value.CasamentoId,
                alteracao.Key,
                alteracao.Value.Acao,
                autor?.UsuarioId,
                autor?.Papel,
                agora))
            .ToList();

        contexto.RegistrosAlteracaoConvites.AddRange(registros);
        return registros;
    }
}
