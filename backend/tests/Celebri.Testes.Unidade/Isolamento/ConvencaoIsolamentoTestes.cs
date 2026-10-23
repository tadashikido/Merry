using System.Reflection;
using Celebri.Aplicacao.Isolamento;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Autenticacao;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Rsvp;
using Celebri.Dominio.Usuarios;
using Celebri.Infraestrutura.Persistencia;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Celebri.Testes.Unidade.Isolamento;

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
        typeof(TokenAcessoAnfitriao),
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
        using var contexto = new CelebriDbContextFactory().CreateDbContext([]);

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
        using var contexto = new CelebriDbContextFactory().CreateDbContext([]);

        foreach (var tipo in contexto.Model.GetEntityTypes().Where(tipo => typeof(IPertenceOrganizacao).IsAssignableFrom(tipo.ClrType)))
        {
            Assert.NotEmpty(tipo.GetDeclaredQueryFilters());
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
            ["ConviteId", "EventoId", "GeradoEm", "Id", "OrganizacaoId", "TokenCifrado", "TokenHash"],
            propriedades);
        Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(AcessoRsvp)));
    }

    [Fact]
    public void TokenAcessoAnfitriao_DeveExporSomenteIdentificadoresEHash()
    {
        var propriedades = typeof(TokenAcessoAnfitriao).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(propriedade => propriedade.Name)
            .Order()
            .ToList();

        Assert.Equal(["AcessoAnfitriaoId", "EventoId", "GeradoEm", "Id", "OrganizacaoId", "TokenHash"], propriedades);
        Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(TokenAcessoAnfitriao)));
    }

    [Fact]
    public void Dominio_TodaClasseComEventoId_DeveImplementarIPertenceEventoOuSerExcecaoConhecida()
    {
        var excecoes = new[] { typeof(Usuario), typeof(AcessoRsvp), typeof(TokenAcessoAnfitriao), typeof(AcessoCronograma) };

        var violacoes = typeof(IPertenceOrganizacao).Assembly.GetTypes()
            .Where(tipo => tipo is { IsClass: true, IsAbstract: false })
            .Where(tipo => tipo.GetProperty(nameof(IPertenceEvento.EventoId), BindingFlags.Public | BindingFlags.Instance) is not null)
            .Where(tipo => !typeof(IPertenceEvento).IsAssignableFrom(tipo))
            .Where(tipo => !excecoes.Contains(tipo))
            .Select(tipo => tipo.FullName)
            .ToList();

        Assert.True(violacoes.Count == 0, $"Classes de domínio com EventoId sem IPertenceEvento: {string.Join(", ", violacoes)}.");
    }

    [Fact]
    public void Modelo_EntidadesComEvento_DevemTerFiltroPorEvento()
    {
        var eventoId = Guid.NewGuid();
        using var contexto = CriarContexto<ModelCustomizer>(Guid.NewGuid(), [eventoId]);

        var sqlConvites = contexto.Set<Celebri.Dominio.Convidados.Convite>().ToQueryString();
        var sqlEventos = contexto.Set<Evento>().ToQueryString();

        Assert.Contains("evento_id", sqlConvites, StringComparison.Ordinal);
        Assert.Contains(eventoId.ToString(), sqlConvites, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(eventoId.ToString(), sqlEventos, StringComparison.OrdinalIgnoreCase);
        Assert.True(typeof(IRaizEvento).IsAssignableFrom(typeof(Evento)));
    }

    [Fact]
    public void Convencao_EntidadeIsoladaNova_DeveReceberFiltroETokenDeConcorrencia()
    {
        using var contexto = CriarContexto<CustomizadorEntidadeFicticia>(Guid.NewGuid());

        var tipo = contexto.Model.FindEntityType(typeof(EntidadeFicticiaIsolada))!;

        Assert.NotEmpty(tipo.GetDeclaredQueryFilters());
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

    [Fact]
    public void Convencao_EntidadeIsoladaComFiltroNomeadoProprio_DeveFalharAoConstruirModelo()
    {
        using var contexto = CriarContexto<CustomizadorEntidadeComFiltroNomeado>(Guid.NewGuid());

        var excecao = Assert.Throws<InvalidOperationException>(() => contexto.Model);

        Assert.Contains(nameof(EntidadeFicticiaComFiltroProprio), excecao.Message, StringComparison.Ordinal);
    }

    private static CelebriDbContext CriarContexto<TCustomizador>(Guid? organizacaoId, IReadOnlyCollection<Guid>? eventosPermitidos = null)
        where TCustomizador : class, IModelCustomizer
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();
        opcoes.ConfigurarPostgreSql("Host=localhost;Database=evento_convencao");
        opcoes.ReplaceService<IModelCustomizer, TCustomizador>();
        return new CelebriDbContext(opcoes.Options, new ContextoIsolamentoFixoTeste(organizacaoId, eventosPermitidos));
    }
}

public sealed class ContextoIsolamentoFixoTeste : IContextoIsolamento
{
    public ContextoIsolamentoFixoTeste(Guid? organizacaoId, IReadOnlyCollection<Guid>? eventosPermitidos = null)
    {
        OrganizacaoId = organizacaoId;
        EventosPermitidos = eventosPermitidos;
    }

    public Guid? OrganizacaoId { get; }

    public IReadOnlyCollection<Guid>? EventosPermitidos { get; }
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

public class CustomizadorEntidadeComFiltroNomeado : ModelCustomizer
{
    public CustomizadorEntidadeComFiltroNomeado(ModelCustomizerDependencies dependencias)
        : base(dependencias)
    {
    }

    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        modelBuilder.Entity<EntidadeFicticiaComFiltroProprio>().HasQueryFilter("somenteAtivos", entidade => entidade.Ativo);
        base.Customize(modelBuilder, context);
    }
}
