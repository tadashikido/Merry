using System.Reflection;
using Casamento.Aplicacao.Auditoria;
using Casamento.Aplicacao.Isolamento;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Autenticacao;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.DadosSensiveis;
using Casamento.Dominio.Financeiro;
using Casamento.Dominio.Fornecedores;
using Casamento.Dominio.Isolamento;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Rsvp;
using Casamento.Dominio.Tarefas;
using Casamento.Dominio.Usuarios;
using Casamento.Infraestrutura.Persistencia.Auditoria;
using Casamento.Infraestrutura.Persistencia.Isolamento;
using Casamento.Dominio.Mesas;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia;

public class CasamentoDbContext : DbContext
{
    public const string PropriedadeCasamento = nameof(IPertenceCasamento.CasamentoId);
    public const string PropriedadeRaizCasamento = nameof(IRaizCasamento.Id);

    private static readonly IsolamentoOrganizacaoInterceptor InterceptorIsolamento = new();

    private static readonly MethodInfo MetodoAplicarFiltroOrganizacao = ObterMetodo(nameof(AplicarFiltroOrganizacao));
    private static readonly MethodInfo MetodoAplicarFiltroCasamento = ObterMetodo(nameof(AplicarFiltroCasamento));
    private static readonly MethodInfo MetodoAplicarFiltroRaizCasamento = ObterMetodo(nameof(AplicarFiltroRaizCasamento));

    private readonly IContextoIsolamento _contextoIsolamento;
    private readonly IAutorAlteracao? _autorAlteracao;
    private readonly TimeProvider _relogio;

    public CasamentoDbContext(
        DbContextOptions<CasamentoDbContext> opcoes,
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

    public IReadOnlyCollection<Guid>? CasamentosPermitidos => _contextoIsolamento.CasamentosPermitidos;

    public bool RestringirPorCasamento => _contextoIsolamento.CasamentosPermitidos is not null;

    public Guid[] CasamentosPermitidosAtuais => _contextoIsolamento.CasamentosPermitidos?.ToArray() ?? [];

    public IAutorAlteracao? AutorAlteracao => _autorAlteracao;

    public DbSet<Organizacao> Organizacoes => Set<Organizacao>();

    public DbSet<Usuario> Usuarios => Set<Usuario>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<TokenRedefinicaoSenha> TokensRedefinicaoSenha => Set<TokenRedefinicaoSenha>();

    public DbSet<CasamentoAssessorado> Casamentos => Set<CasamentoAssessorado>();

    public DbSet<Convite> Convites => Set<Convite>();

    public DbSet<Convidado> Convidados => Set<Convidado>();

    public DbSet<AcessoRsvp> AcessosRsvp => Set<AcessoRsvp>();

    public DbSet<DadosSensiveisConvidado> DadosSensiveisConvidados => Set<DadosSensiveisConvidado>();

    public DbSet<AcessoCasal> AcessosCasal => Set<AcessoCasal>();

    public DbSet<TokenAcessoCasal> TokensAcessoCasal => Set<TokenAcessoCasal>();

    public DbSet<RegistroAlteracaoConvite> RegistrosAlteracaoConvites => Set<RegistroAlteracaoConvite>();

    public DbSet<TarefaCasamento> TarefasCasamento => Set<TarefaCasamento>();

    public DbSet<ModeloChecklist> ModelosChecklist => Set<ModeloChecklist>();

    public DbSet<ItemModeloChecklist> ItensModeloChecklist => Set<ItemModeloChecklist>();

    public DbSet<ModeloCronograma> ModelosCronograma => Set<ModeloCronograma>();

    public DbSet<ItemModeloCronograma> ItensModeloCronograma => Set<ItemModeloCronograma>();

    public DbSet<Fornecedor> Fornecedores => Set<Fornecedor>();

    public DbSet<FornecedorCasamento> FornecedoresCasamento => Set<FornecedorCasamento>();

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
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CasamentoDbContext).Assembly);
        AplicarIsolamentoPorConvencao(modelBuilder);
        base.OnModelCreating(modelBuilder);
    }

    private static MethodInfo ObterMetodo(string nome)
    {
        return typeof(CasamentoDbContext).GetMethod(nome, BindingFlags.Instance | BindingFlags.NonPublic)!;
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
                    $"A entidade '{tipo.ClrType.Name}' já possui query filter próprio. Filtros de entidades isoladas por organização devem ser compostos na convenção de isolamento do CasamentoDbContext.");
            }

            var metodo = typeof(IPertenceCasamento).IsAssignableFrom(tipo.ClrType)
                ? MetodoAplicarFiltroCasamento
                : typeof(IRaizCasamento).IsAssignableFrom(tipo.ClrType)
                    ? MetodoAplicarFiltroRaizCasamento
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

    private void AplicarFiltroCasamento<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IPertenceCasamento
    {
        var entidade = ConfigurarOrganizacao<TEntidade>(modelBuilder);
        entidade.Property<Guid>(PropriedadeCasamento).IsRequired();
        entidade.HasQueryFilter(registro =>
            EF.Property<Guid>(registro, nameof(IPertenceOrganizacao.OrganizacaoId)) == OrganizacaoIdAtual
            && (!RestringirPorCasamento || CasamentosPermitidosAtuais.Contains(EF.Property<Guid>(registro, PropriedadeCasamento))));
    }

    private void AplicarFiltroRaizCasamento<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IRaizCasamento
    {
        var entidade = ConfigurarOrganizacao<TEntidade>(modelBuilder);
        entidade.HasQueryFilter(registro =>
            EF.Property<Guid>(registro, nameof(IPertenceOrganizacao.OrganizacaoId)) == OrganizacaoIdAtual
            && (!RestringirPorCasamento || CasamentosPermitidosAtuais.Contains(EF.Property<Guid>(registro, PropriedadeRaizCasamento))));
    }

    private static Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntidade> ConfigurarOrganizacao<TEntidade>(ModelBuilder modelBuilder)
        where TEntidade : class, IPertenceOrganizacao
    {
        var entidade = modelBuilder.Entity<TEntidade>();
        entidade.Property<Guid>(nameof(IPertenceOrganizacao.OrganizacaoId)).IsRequired().IsConcurrencyToken();
        return entidade;
    }
}
