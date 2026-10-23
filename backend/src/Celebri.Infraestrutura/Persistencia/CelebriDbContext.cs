using System.Reflection;
using Celebri.Aplicacao.Auditoria;
using Celebri.Aplicacao.Isolamento;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Autenticacao;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.DadosSensiveis;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Mesas;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Rsvp;
using Celebri.Dominio.Tarefas;
using Celebri.Dominio.Usuarios;
using Celebri.Infraestrutura.Persistencia.Auditoria;
using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia;

public class CelebriDbContext : DbContext
{
    public const string PropriedadeEvento = nameof(IPertenceEvento.EventoId);
    public const string PropriedadeRaizEvento = nameof(IRaizEvento.Id);

    private static readonly IsolamentoOrganizacaoInterceptor InterceptorIsolamento = new();

    private static readonly MethodInfo MetodoAplicarFiltroOrganizacao = ObterMetodo(nameof(AplicarFiltroOrganizacao));
    private static readonly MethodInfo MetodoAplicarFiltroEvento = ObterMetodo(nameof(AplicarFiltroEvento));
    private static readonly MethodInfo MetodoAplicarFiltroRaizEvento = ObterMetodo(nameof(AplicarFiltroRaizEvento));

    private readonly IContextoIsolamento _contextoIsolamento;
    private readonly IAutorAlteracao? _autorAlteracao;
    private readonly TimeProvider _relogio;

    public CelebriDbContext(
        DbContextOptions<CelebriDbContext> opcoes,
        IContextoIsolamento contextoIsolamento,
        IAutorAlteracao? autorAlteracao = null,
        TimeProvider? relogio = null)
        : base(opcoes)
    {
        _contextoIsolamento = contextoIsolamento;
        _autorAlteracao = autorAlteracao;
        _relogio = relogio ?? TimeProvider.System;
    }

    public Guid? OrganizacaoIdAtual => _contextoIsolamento.OrganizacaoId;

    public IReadOnlyCollection<Guid>? EventosPermitidos => _contextoIsolamento.EventosPermitidos;

    public bool RestringirPorEvento => _contextoIsolamento.EventosPermitidos is not null;

    public Guid[] EventosPermitidosAtuais => _contextoIsolamento.EventosPermitidos?.ToArray() ?? [];

    public IAutorAlteracao? AutorAlteracao => _autorAlteracao;

    public DbSet<Organizacao> Organizacoes => Set<Organizacao>();

    public DbSet<Usuario> Usuarios => Set<Usuario>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<TokenRedefinicaoSenha> TokensRedefinicaoSenha => Set<TokenRedefinicaoSenha>();

    public DbSet<Evento> Eventos => Set<Evento>();

    public DbSet<Convite> Convites => Set<Convite>();

    public DbSet<Convidado> Convidados => Set<Convidado>();

    public DbSet<AcessoRsvp> AcessosRsvp => Set<AcessoRsvp>();

    public DbSet<DadosSensiveisConvidado> DadosSensiveisConvidados => Set<DadosSensiveisConvidado>();

    public DbSet<AcessoAnfitriao> AcessosAnfitriao => Set<AcessoAnfitriao>();

    public DbSet<TokenAcessoAnfitriao> TokensAcessoAnfitriao => Set<TokenAcessoAnfitriao>();

    public DbSet<RegistroAlteracaoConvite> RegistrosAlteracaoConvites => Set<RegistroAlteracaoConvite>();

    public DbSet<TarefaEvento> TarefasEvento => Set<TarefaEvento>();

    public DbSet<ModeloChecklist> ModelosChecklist => Set<ModeloChecklist>();

    public DbSet<ItemModeloChecklist> ItensModeloChecklist => Set<ItemModeloChecklist>();

    public DbSet<ModeloCronograma> ModelosCronograma => Set<ModeloCronograma>();

    public DbSet<ItemModeloCronograma> ItensModeloCronograma => Set<ItemModeloCronograma>();

    public DbSet<Fornecedor> Fornecedores => Set<Fornecedor>();

    public DbSet<FornecedorEvento> FornecedoresEvento => Set<FornecedorEvento>();

    public DbSet<ParcelaFornecedor> ParcelasFornecedor => Set<ParcelaFornecedor>();

    public DbSet<ItemCronograma> ItensCronograma => Set<ItemCronograma>();

    public DbSet<AcessoCronograma> AcessosCronograma => Set<AcessoCronograma>();

    public DbSet<Mesa> Mesas => Set<Mesa>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        RegistradorAlteracoesConvites.Registrar(this, _relogio.GetUtcNow());
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        RegistradorAlteracoesConvites.Registrar(this, _relogio.GetUtcNow());
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.AddInterceptors(InterceptorIsolamento);
        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CelebriDbContext).Assembly);
        AplicarIsolamentoPorConvencao(modelBuilder);
        base.OnModelCreating(modelBuilder);
    }

    private static MethodInfo ObterMetodo(string nome)
    {
        return typeof(CelebriDbContext).GetMethod(nome, BindingFlags.Instance | BindingFlags.NonPublic)!;
    }

    private void AplicarIsolamentoPorConvencao(ModelBuilder modelBuilder)
    {
        var entidadesIsoladas = modelBuilder.Model.GetEntityTypes()
            .Where(tipo => tipo.BaseType is null && typeof(IPertenceOrganizacao).IsAssignableFrom(tipo.ClrType))
            .ToList();

        foreach (var tipo in entidadesIsoladas)
        {
            if (tipo.GetQueryFilter() is not null)
            {
                throw new InvalidOperationException(
                    $"A entidade '{tipo.ClrType.Name}' já possui query filter próprio. Filtros de entidades isoladas por organização devem ser compostos na convenção de isolamento do CelebriDbContext.");
            }

            var metodo = typeof(IPertenceEvento).IsAssignableFrom(tipo.ClrType)
                ? MetodoAplicarFiltroEvento
                : typeof(IRaizEvento).IsAssignableFrom(tipo.ClrType)
                    ? MetodoAplicarFiltroRaizEvento
                    : MetodoAplicarFiltroOrganizacao;

            metodo.MakeGenericMethod(tipo.ClrType).Invoke(this, [modelBuilder]);
        }
    }

    private void AplicarFiltroOrganizacao<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IPertenceOrganizacao
    {
        var entidade = ConfigurarOrganizacao<TEntidade>(modelBuilder);
        entidade.HasQueryFilter(registro => EF.Property<Guid>(registro, nameof(IPertenceOrganizacao.OrganizacaoId)) == OrganizacaoIdAtual);
    }

    private void AplicarFiltroEvento<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IPertenceEvento
    {
        var entidade = ConfigurarOrganizacao<TEntidade>(modelBuilder);
        entidade.Property<Guid>(PropriedadeEvento).IsRequired();
        entidade.HasQueryFilter(registro =>
            EF.Property<Guid>(registro, nameof(IPertenceOrganizacao.OrganizacaoId)) == OrganizacaoIdAtual
            && (!RestringirPorEvento || EventosPermitidosAtuais.Contains(EF.Property<Guid>(registro, PropriedadeEvento))));
    }

    private void AplicarFiltroRaizEvento<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IRaizEvento
    {
        var entidade = ConfigurarOrganizacao<TEntidade>(modelBuilder);
        entidade.HasQueryFilter(registro =>
            EF.Property<Guid>(registro, nameof(IPertenceOrganizacao.OrganizacaoId)) == OrganizacaoIdAtual
            && (!RestringirPorEvento || EventosPermitidosAtuais.Contains(EF.Property<Guid>(registro, PropriedadeRaizEvento))));
    }

    private static Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntidade> ConfigurarOrganizacao<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IPertenceOrganizacao
    {
        var entidade = modelBuilder.Entity<TEntidade>();
        entidade.Property<Guid>(nameof(IPertenceOrganizacao.OrganizacaoId)).IsRequired().IsConcurrencyToken();
        return entidade;
    }
}
