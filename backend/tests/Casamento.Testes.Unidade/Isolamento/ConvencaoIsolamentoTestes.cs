using System.Reflection;
using Casamento.Aplicacao.Isolamento;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Autenticacao;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Isolamento;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Rsvp;
using Casamento.Dominio.Usuarios;
using Casamento.Infraestrutura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Casamento.Testes.Unidade.Isolamento;

public class ConvencaoIsolamentoTestes
{
    private static readonly Type[] EntidadesDeAutenticacaoForaDoIsolamento =
    [
        typeof(Organizacao),
        typeof(Usuario),
        typeof(RefreshToken),
        typeof(TokenRedefinicaoSenha),
    ];

    private static readonly Type[] EntidadesDeResolucaoPublicaForaDoIsolamento =
    [
        typeof(AcessoRsvp),
        typeof(TokenAcessoCasal),
        typeof(AcessoCronograma),
    ];

    private static readonly Type[] EntidadesForaDoIsolamento =
    [
        .. EntidadesDeAutenticacaoForaDoIsolamento,
        .. EntidadesDeResolucaoPublicaForaDoIsolamento,
    ];

    [Fact]
    public void Modelo_TodaEntidadeForaDaListaDeAutenticacao_DeveImplementarIPertenceOrganizacao()
    {
        using var contexto = new CasamentoDbContextFactory().CreateDbContext([]);

        var semIsolamento = contexto.Model.GetEntityTypes()
            .Where(tipo => !tipo.IsOwned())
            .Select(tipo => tipo.ClrType)
            .Where(tipo => !typeof(IPertenceOrganizacao).IsAssignableFrom(tipo))
            .Where(tipo => !EntidadesForaDoIsolamento.Contains(tipo))
            .Select(tipo => tipo.Name)
            .ToList();

        Assert.True(
            semIsolamento.Count == 0,
            $"Entidades de negócio sem isolamento por organização: {string.Join(", ", semIsolamento)}. Implemente IPertenceOrganizacao.");
    }

    [Fact]
    public void Modelo_TodaEntidadeIsolada_DevePossuirFiltroETokenDeConcorrenciaPorOrganizacao()
    {
        using var contexto = new CasamentoDbContextFactory().CreateDbContext([]);

        foreach (var tipo in contexto.Model.GetEntityTypes().Where(tipo => typeof(IPertenceOrganizacao).IsAssignableFrom(tipo.ClrType)))
        {
            Assert.NotNull(tipo.GetQueryFilter());
            Assert.True(tipo.FindProperty(nameof(IPertenceOrganizacao.OrganizacaoId))!.IsConcurrencyToken);
        }
    }

    [Fact]
    public void Dominio_TodaClasseComOrganizacaoId_DeveImplementarContratoOuSerEntidadeDeAutenticacao()
    {
        var violacoes = typeof(IPertenceOrganizacao).Assembly.GetTypes()
            .Where(tipo => tipo is { IsClass: true, IsAbstract: false })
            .Where(tipo => tipo.GetProperty(nameof(IPertenceOrganizacao.OrganizacaoId), BindingFlags.Public | BindingFlags.Instance) is not null)
            .Where(tipo => !typeof(IPertenceOrganizacao).IsAssignableFrom(tipo))
            .Where(tipo => !EntidadesForaDoIsolamento.Contains(tipo))
            .Select(tipo => tipo.FullName)
            .ToList();

        Assert.True(violacoes.Count == 0, $"Classes de domínio com OrganizacaoId sem IPertenceOrganizacao: {string.Join(", ", violacoes)}.");
    }

    [Fact]
    public void EntidadesDeAutenticacao_NaoDevemImplementarIPertenceOrganizacao()
    {
        Assert.All(EntidadesDeAutenticacaoForaDoIsolamento, tipo => Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(tipo)));
    }

    [Fact]
    public void EntidadesDeResolucaoPublica_DevemExporSomenteIdentificadoresEHashes()
    {
        var propriedades = typeof(AcessoRsvp).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(propriedade => propriedade.Name)
            .Order()
            .ToList();

        Assert.Equal(
            ["CasamentoId", "ConviteId", "GeradoEm", "Id", "OrganizacaoId", "TokenCifrado", "TokenHash"],
            propriedades);
        Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(AcessoRsvp)));
    }

    [Fact]
    public void TokenAcessoCasal_DeveExporSomenteIdentificadoresEHash()
    {
        var propriedades = typeof(TokenAcessoCasal).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(propriedade => propriedade.Name)
            .Order()
            .ToList();

        Assert.Equal(["AcessoCasalId", "CasamentoId", "GeradoEm", "Id", "OrganizacaoId", "TokenHash"], propriedades);
        Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(TokenAcessoCasal)));
    }

    [Fact]
    public void Dominio_TodaClasseComCasamentoId_DeveImplementarIPertenceCasamentoOuSerExcecaoConhecida()
    {
        var excecoes = new[] { typeof(Usuario), typeof(AcessoRsvp), typeof(TokenAcessoCasal), typeof(AcessoCronograma) };

        var violacoes = typeof(IPertenceOrganizacao).Assembly.GetTypes()
            .Where(tipo => tipo is { IsClass: true, IsAbstract: false })
            .Where(tipo => tipo.GetProperty(nameof(IPertenceCasamento.CasamentoId), BindingFlags.Public | BindingFlags.Instance) is not null)
            .Where(tipo => !typeof(IPertenceCasamento).IsAssignableFrom(tipo))
            .Where(tipo => !excecoes.Contains(tipo))
            .Select(tipo => tipo.FullName)
            .ToList();

        Assert.True(violacoes.Count == 0, $"Classes de domínio com CasamentoId sem IPertenceCasamento: {string.Join(", ", violacoes)}.");
    }

    [Fact]
    public void Modelo_EntidadesComCasamento_DevemTerFiltroPorCasamento()
    {
        var casamentoId = Guid.NewGuid();
        using var contexto = CriarContexto<ModelCustomizer>(Guid.NewGuid(), [casamentoId]);

        var sqlConvites = contexto.Set<Casamento.Dominio.Convidados.Convite>().ToQueryString();
        var sqlCasamentos = contexto.Set<CasamentoAssessorado>().ToQueryString();

        Assert.Contains("casamento_id", sqlConvites, StringComparison.Ordinal);
        Assert.Contains(casamentoId.ToString(), sqlConvites, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(casamentoId.ToString(), sqlCasamentos, StringComparison.OrdinalIgnoreCase);
        Assert.True(typeof(IRaizCasamento).IsAssignableFrom(typeof(CasamentoAssessorado)));
    }

    [Fact]
    public void Convencao_EntidadeIsoladaNova_DeveReceberFiltroETokenDeConcorrencia()
    {
        using var contexto = CriarContexto<CustomizadorEntidadeFicticia>(Guid.NewGuid());

        var tipo = contexto.Model.FindEntityType(typeof(EntidadeFicticiaIsolada))!;

        Assert.NotNull(tipo.GetQueryFilter());
        Assert.True(tipo.FindProperty(nameof(IPertenceOrganizacao.OrganizacaoId))!.IsConcurrencyToken);
    }

    [Fact]
    public void Convencao_EntidadeIsoladaNova_DeveTraduzirFiltroParaPredicadoSql()
    {
        var organizacaoId = Guid.NewGuid();
        using var contexto = CriarContexto<CustomizadorEntidadeFicticia>(organizacaoId);

        var sql = contexto.Set<EntidadeFicticiaIsolada>().ToQueryString();

        Assert.Contains("organizacao_id", sql, StringComparison.Ordinal);
        Assert.Contains(organizacaoId.ToString(), sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Convencao_EntidadeIsoladaComFiltroProprio_DeveFalharAoConstruirModelo()
    {
        using var contexto = CriarContexto<CustomizadorEntidadeComFiltroProprio>(Guid.NewGuid());

        var excecao = Assert.Throws<InvalidOperationException>(() => contexto.Model);

        Assert.Contains(nameof(EntidadeFicticiaComFiltroProprio), excecao.Message, StringComparison.Ordinal);
    }

    private static CasamentoDbContext CriarContexto<TCustomizador>(Guid? organizacaoId, IReadOnlyCollection<Guid>? casamentosPermitidos = null)
        where TCustomizador : class, IModelCustomizer
    {
        var opcoes = new DbContextOptionsBuilder<CasamentoDbContext>();
        opcoes.ConfigurarPostgreSql("Host=localhost;Database=casamento_convencao");
        opcoes.ReplaceService<IModelCustomizer, TCustomizador>();
        return new CasamentoDbContext(opcoes.Options, new ContextoIsolamentoFixoTeste(organizacaoId, casamentosPermitidos));
    }
}

public sealed class ContextoIsolamentoFixoTeste : IContextoIsolamento
{
    public ContextoIsolamentoFixoTeste(Guid? organizacaoId, IReadOnlyCollection<Guid>? casamentosPermitidos = null)
    {
        OrganizacaoId = organizacaoId;
        CasamentosPermitidos = casamentosPermitidos;
    }

    public Guid? OrganizacaoId { get; }

    public IReadOnlyCollection<Guid>? CasamentosPermitidos { get; }
}

public class EntidadeFicticiaIsolada : IPertenceOrganizacao
{
    public Guid Id { get; set; }

    public Guid OrganizacaoId { get; set; }
}

public class EntidadeFicticiaComFiltroProprio : IPertenceOrganizacao
{
    public Guid Id { get; set; }

    public Guid OrganizacaoId { get; set; }

    public bool Ativo { get; set; }
}

public class CustomizadorEntidadeFicticia : ModelCustomizer
{
    public CustomizadorEntidadeFicticia(ModelCustomizerDependencies dependencias)
        : base(dependencias)
    {
    }

    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        modelBuilder.Entity<EntidadeFicticiaIsolada>().ToTable("entidades_ficticias");
        base.Customize(modelBuilder, context);
    }
}

public class CustomizadorEntidadeComFiltroProprio : ModelCustomizer
{
    public CustomizadorEntidadeComFiltroProprio(ModelCustomizerDependencies dependencias)
        : base(dependencias)
    {
    }

    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        modelBuilder.Entity<EntidadeFicticiaComFiltroProprio>().HasQueryFilter(entidade => entidade.Ativo);
        base.Customize(modelBuilder, context);
    }
}
