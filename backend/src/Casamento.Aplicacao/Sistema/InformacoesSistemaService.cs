using System.Reflection;

namespace Casamento.Aplicacao.Sistema;

public class InformacoesSistemaService : IInformacoesSistemaService
{
    public const string NomeSistema = "Enlace";
    private const string VersaoPadrao = "0.0.0";

    private readonly Assembly? _assemblyAplicacao;

    public InformacoesSistemaService()
        : this(Assembly.GetEntryAssembly())
    {
    }

    public InformacoesSistemaService(Assembly? assemblyAplicacao)
    {
        _assemblyAplicacao = assemblyAplicacao;
    }

    public InformacoesSistemaDto Obter()
    {
        return new InformacoesSistemaDto(NomeSistema, ObterVersao());
    }

    private string ObterVersao()
    {
        var versaoInformativa = _assemblyAplicacao?
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion;

        if (string.IsNullOrWhiteSpace(versaoInformativa))
        {
            return _assemblyAplicacao?.GetName().Version?.ToString(3) ?? VersaoPadrao;
        }

        var indiceMetadados = versaoInformativa.IndexOf('+', StringComparison.Ordinal);
        return indiceMetadados >= 0 ? versaoInformativa[..indiceMetadados] : versaoInformativa;
    }
}
