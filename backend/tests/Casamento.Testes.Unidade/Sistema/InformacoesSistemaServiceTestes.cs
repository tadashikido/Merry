using System.Reflection;
using System.Reflection.Emit;
using Casamento.Aplicacao.Sistema;

namespace Casamento.Testes.Unidade.Sistema;

public class InformacoesSistemaServiceTestes
{
    [Fact]
    public void Obter_DeveRetornarNomeDoSistema()
    {
        var service = new InformacoesSistemaService(typeof(InformacoesSistemaServiceTestes).Assembly);

        var informacoes = service.Obter();

        Assert.Equal("Celebri", informacoes.Nome);
    }

    [Fact]
    public void Obter_DeveRemoverMetadadosDeBuildDaVersaoInformativa()
    {
        var assembly = CriarAssemblyComVersaoInformativa("1.2.3+abc123def");
        var service = new InformacoesSistemaService(assembly);

        var informacoes = service.Obter();

        Assert.Equal("1.2.3", informacoes.Versao);
    }

    [Fact]
    public void Obter_DeveManterVersaoInformativaSemMetadados()
    {
        var assembly = CriarAssemblyComVersaoInformativa("2.0.0-beta.1");
        var service = new InformacoesSistemaService(assembly);

        var informacoes = service.Obter();

        Assert.Equal("2.0.0-beta.1", informacoes.Versao);
    }

    [Fact]
    public void Obter_DeveUsarVersaoDoAssemblyQuandoNaoHaVersaoInformativa()
    {
        var nome = new AssemblyName("AssemblySemVersaoInformativa") { Version = new Version(3, 4, 5, 6) };
        var assembly = AssemblyBuilder.DefineDynamicAssembly(nome, AssemblyBuilderAccess.Run);
        var service = new InformacoesSistemaService(assembly);

        var informacoes = service.Obter();

        Assert.Equal("3.4.5", informacoes.Versao);
    }

    [Fact]
    public void Obter_DeveRetornarVersaoPadraoQuandoAssemblyEhNulo()
    {
        var service = new InformacoesSistemaService(null);

        var informacoes = service.Obter();

        Assert.Equal("0.0.0", informacoes.Versao);
    }

    private static AssemblyBuilder CriarAssemblyComVersaoInformativa(string versao)
    {
        var construtor = typeof(AssemblyInformationalVersionAttribute).GetConstructor([typeof(string)])!;
        var atributo = new CustomAttributeBuilder(construtor, [versao]);
        return AssemblyBuilder.DefineDynamicAssembly(
            new AssemblyName($"AssemblyTeste{Guid.NewGuid():N}"),
            AssemblyBuilderAccess.Run,
            [atributo]);
    }
}
