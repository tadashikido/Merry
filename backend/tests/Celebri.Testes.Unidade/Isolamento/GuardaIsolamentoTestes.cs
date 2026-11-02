namespace Celebri.Testes.Unidade.Isolamento;

public class GuardaIsolamentoTestes
{
    public sealed record ExcecaoIsolamento(string Arquivo, CategoriaBypass Categoria, int Quantidade, string Justificativa);

    private const int TamanhoMinimoJustificativa = 40;

    public static readonly ExcecaoIsolamento[] ListaExcecoes =
    [
        new(
            "Celebri.Infraestrutura/Persistencia/Repositorios/DadosSensiveisRepository.cs",
            CategoriaBypass.AtualizacaoEmMassa,
            2,
            "Retenção LGPD (AnonimizarVencidosAsync) e recifragem (SubstituirCifrasAsync) alteram só ConteudoCifrado/ExcluidoEm; os executores rodam um escopo por organização com EscopoIsolamentoSistema.Assumir e o query filter de organização e evento continua aplicado ao ExecuteUpdate."),
        new(
            "Celebri.Infraestrutura/Persistencia/Repositorios/AcessoCronogramaRepository.cs",
            CategoriaBypass.AtualizacaoEmMassa,
            1,
            "Recifragem (SubstituirCifrasAsync) altera só TokenCifrado; AcessoCronograma fica fora do query filter global, então a consulta parte de DaOrganizacaoAtual (Where explícito por OrganizacaoIdAtual) dentro do escopo de sistema por organização."),
        new(
            "Celebri.Aplicacao/DadosSensiveis/ExecutorRetencaoDadosSensiveis.cs",
            CategoriaBypass.TrocaOrganizacao,
            1,
            "Job de retenção LGPD sem usuário autenticado: lista as organizações e cria um escopo de serviços novo por organização antes de Assumir, então cada escopo enxerga só uma organização e nunca herda um request."),
        new(
            "Celebri.Aplicacao/Recifragem/ExecutorRecifragemDadosSensiveis.cs",
            CategoriaBypass.TrocaOrganizacao,
            1,
            "Comando administrativo de recifragem sem usuário autenticado: cria um escopo de serviços novo por organização antes de Assumir, então cada lote de recifragem fica restrito a uma organização e nunca herda um request."),
    ];

    private static readonly CategoriaBypass[] CategoriasComExcecao =
    [
        CategoriaBypass.IgnorarFiltros,
        CategoriaBypass.SqlCru,
        CategoriaBypass.AtualizacaoEmMassa,
        CategoriaBypass.TrocaOrganizacao,
    ];

    private static readonly Lazy<IReadOnlyList<(string Arquivo, OcorrenciaBypass Ocorrencia)>> OcorrenciasProducao = new(VarrerProducao);

    private static string DiretorioFontes()
    {
        var diretorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (diretorio is not null && !Directory.Exists(Path.Combine(diretorio.FullName, "src", "Celebri.Infraestrutura")))
        {
            diretorio = diretorio.Parent;
        }

        return Path.Combine(diretorio?.FullName ?? throw new DirectoryNotFoundException("Pasta backend/src não encontrada."), "src");
    }

    private static IReadOnlyList<string> ArquivosProducao()
    {
        var raiz = DiretorioFontes();

        return Directory.EnumerateFiles(raiz, "*.cs", SearchOption.AllDirectories)
            .Select(arquivo => Path.GetRelativePath(raiz, arquivo).Replace(Path.DirectorySeparatorChar, '/'))
            .Where(relativo => !relativo.Split('/').Any(parte => parte is "bin" or "obj"))
            .Order(StringComparer.Ordinal)
            .ToList();
    }

    private static IReadOnlyList<(string Arquivo, OcorrenciaBypass Ocorrencia)> VarrerProducao()
    {
        var raiz = DiretorioFontes();

        return ArquivosProducao()
            .SelectMany(relativo => DetectorBypassIsolamento.Detectar(File.ReadAllText(Path.Combine(raiz, relativo)))
                .Select(ocorrencia => (relativo, ocorrencia)))
            .ToList();
    }

    private static string Descrever(IEnumerable<(string Arquivo, OcorrenciaBypass Ocorrencia)> ocorrencias)
    {
        return string.Join(
            Environment.NewLine,
            ocorrencias.Select(item => $"  {item.Arquivo}:{item.Ocorrencia.Linha} [{item.Ocorrencia.Categoria}] {item.Ocorrencia.Trecho}"));
    }

    public static IReadOnlyList<(string Arquivo, OcorrenciaBypass Ocorrencia)> Violacoes(
        IEnumerable<(string Arquivo, OcorrenciaBypass Ocorrencia)> ocorrencias,
        IEnumerable<ExcecaoIsolamento> excecoes)
    {
        var permitidas = excecoes.ToDictionary(excecao => (excecao.Arquivo, excecao.Categoria), excecao => excecao.Quantidade);

        return ocorrencias
            .Where(item => CategoriasComExcecao.Contains(item.Ocorrencia.Categoria))
            .GroupBy(item => (item.Arquivo, item.Ocorrencia.Categoria))
            .Where(grupo => grupo.Count() > permitidas.GetValueOrDefault(grupo.Key))
            .SelectMany(grupo => grupo)
            .ToList();
    }

    public static IReadOnlyList<string> Divergencias(
        IEnumerable<(string Arquivo, OcorrenciaBypass Ocorrencia)> ocorrencias,
        IEnumerable<ExcecaoIsolamento> excecoes)
    {
        var encontradas = ocorrencias
            .Where(item => CategoriasComExcecao.Contains(item.Ocorrencia.Categoria))
            .GroupBy(item => (item.Arquivo, item.Ocorrencia.Categoria))
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Count());

        return excecoes
            .Where(excecao => encontradas.GetValueOrDefault((excecao.Arquivo, excecao.Categoria)) != excecao.Quantidade)
            .Select(excecao => $"  {excecao.Arquivo} [{excecao.Categoria}] declarado {excecao.Quantidade}, encontrado {encontradas.GetValueOrDefault((excecao.Arquivo, excecao.Categoria))}")
            .ToList();
    }

    [Fact]
    public void Varredura_DeveEncontrarFontesDeProducao()
    {
        var arquivos = ArquivosProducao();

        Assert.Contains("Celebri.Infraestrutura/Persistencia/CelebriDbContext.cs", arquivos);
        Assert.DoesNotContain(arquivos, arquivo => arquivo.Contains("/obj/", StringComparison.Ordinal) || arquivo.Contains("/bin/", StringComparison.Ordinal));
    }

    [Fact]
    public void CodigoDeProducao_NaoDeveContornarIsolamentoForaDaListaDeExcecoes()
    {
        var violacoes = Violacoes(OcorrenciasProducao.Value, ListaExcecoes);

        Assert.True(
            violacoes.Count == 0,
            $"Bypass do isolamento por organização fora da lista de exceções (IgnoreQueryFilters, SQL cru, ExecuteUpdate/ExecuteDelete ou troca de organização por EscopoIsolamentoSistema.Assumir). Use o DbContext com query filter, mantenha Assumir restrito aos jobs de sistema ou registre a exceção justificada em {nameof(GuardaIsolamentoTestes)}.{nameof(ListaExcecoes)}:{Environment.NewLine}{Descrever(violacoes)}");
    }

    [Fact]
    public void ListaDeExcecoes_DeveCorresponderExatamenteAoCodigo()
    {
        var divergentes = Divergencias(OcorrenciasProducao.Value, ListaExcecoes);

        Assert.True(
            divergentes.Count == 0,
            $"Lista de exceções do isolamento desatualizada; revise a justificativa e ajuste a quantidade:{Environment.NewLine}{string.Join(Environment.NewLine, divergentes)}");
    }

    [Fact]
    public void CodigoDeProducao_NuncaDeveAlterarChaveDeIsolamentoEmMassa()
    {
        var violacoes = OcorrenciasProducao.Value
            .Where(item => item.Ocorrencia.Categoria == CategoriaBypass.AlteracaoChaveIsolamento)
            .ToList();

        Assert.True(
            violacoes.Count == 0,
            $"SetProperty sobre OrganizacaoId/EventoId move registros entre organizações ou eventos sem passar pelo interceptor de isolamento e é proibido sem exceção:{Environment.NewLine}{Descrever(violacoes)}");
    }

    [Fact]
    public void ListaDeExcecoes_DeveSerJustificadaESemDuplicidade()
    {
        Assert.All(ListaExcecoes, excecao =>
        {
            Assert.True(excecao.Quantidade > 0, $"{excecao.Arquivo}: quantidade deve ser positiva.");
            Assert.Contains(excecao.Categoria, CategoriasComExcecao);
            Assert.True(
                excecao.Justificativa.Trim().Length >= TamanhoMinimoJustificativa,
                $"{excecao.Arquivo}: justificativa deve explicar por que o isolamento continua garantido.");
            Assert.False(excecao.Arquivo.Contains('\\', StringComparison.Ordinal), $"{excecao.Arquivo}: use '/' como separador.");
        });

        Assert.Equal(
            ListaExcecoes.Length,
            ListaExcecoes.Select(excecao => (excecao.Arquivo, excecao.Categoria)).Distinct().Count());
    }
}
