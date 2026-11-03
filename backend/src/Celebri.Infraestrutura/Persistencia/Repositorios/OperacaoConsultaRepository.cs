using Celebri.Aplicacao.Operacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class OperacaoConsultaRepository : IOperacaoConsultaRepository
{
    private const int DiasAtividade = 30;

    private readonly CelebriDbContext _contexto;

    public OperacaoConsultaRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<AssessoriaResumoDto>> ListarAssessoriasAsync(string? busca, SituacaoAssessoria? situacao, CancellationToken cancelamento)
    {
        var organizacoes = await _contexto.Organizacoes.AsNoTracking()
            .Select(organizacao => new { organizacao.Id, organizacao.Nome, organizacao.CriadaEm, organizacao.SuspensaEm })
            .ToListAsync(cancelamento);

        var donos = (await LeituraCrossOrganizacao<Usuario>()
                .Where(usuario => usuario.Papel == PapelUsuario.Dono)
                .Select(usuario => new { usuario.OrganizacaoId, usuario.Email, usuario.UltimoLoginEm })
                .ToListAsync(cancelamento))
            .GroupBy(dono => dono.OrganizacaoId)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.First());

        var totalPorOrganizacao = (await LeituraCrossOrganizacao<Evento>()
                .GroupBy(evento => evento.OrganizacaoId)
                .Select(grupo => new { OrganizacaoId = grupo.Key, Total = grupo.Count() })
                .ToListAsync(cancelamento))
            .ToDictionary(item => item.OrganizacaoId, item => item.Total);

        var termo = busca?.Trim();

        return organizacoes
            .Select(organizacao => new
            {
                organizacao,
                EmailDono = donos.TryGetValue(organizacao.Id, out var dono) ? dono.Email : null,
                UltimoLogin = donos.TryGetValue(organizacao.Id, out var donoLogin) ? donoLogin.UltimoLoginEm : null,
            })
            .Where(item => string.IsNullOrEmpty(termo)
                || item.organizacao.Nome.Contains(termo, StringComparison.OrdinalIgnoreCase)
                || (item.EmailDono is not null && item.EmailDono.Contains(termo, StringComparison.OrdinalIgnoreCase)))
            .Where(item => situacao is null
                || (situacao == SituacaoAssessoria.Suspensa) == (item.organizacao.SuspensaEm is not null))
            .OrderBy(item => item.organizacao.Nome, StringComparer.OrdinalIgnoreCase)
            .Select(item => new AssessoriaResumoDto(
                item.organizacao.Id,
                item.organizacao.Nome,
                item.organizacao.CriadaEm,
                totalPorOrganizacao.GetValueOrDefault(item.organizacao.Id),
                item.UltimoLogin,
                item.organizacao.SuspensaEm is not null))
            .ToList();
    }

    public async Task<DashboardOperacaoDto> ObterDashboardAsync(DateTimeOffset agora, CancellationToken cancelamento)
    {
        var corte = agora.AddDays(-DiasAtividade);

        var totalAssessorias = await _contexto.Organizacoes.AsNoTracking().CountAsync(cancelamento);
        var novasNoPeriodo = await _contexto.Organizacoes.AsNoTracking().CountAsync(organizacao => organizacao.CriadaEm >= corte, cancelamento);

        var ativas30Dias = await LeituraCrossOrganizacao<Usuario>()
            .Where(usuario => usuario.Papel == PapelUsuario.Dono && usuario.UltimoLoginEm != null && usuario.UltimoLoginEm >= corte)
            .Select(usuario => usuario.OrganizacaoId)
            .Distinct()
            .CountAsync(cancelamento);

        var totalEventos = await LeituraCrossOrganizacao<Evento>().CountAsync(cancelamento);

        return new DashboardOperacaoDto(totalAssessorias, ativas30Dias, totalEventos, novasNoPeriodo);
    }

    private IQueryable<T> LeituraCrossOrganizacao<T>()
        where T : class
    {
        return _contexto.Set<T>().AsNoTracking().IgnoreQueryFilters();
    }
}
