namespace Celebri.Testes.Unidade.Isolamento;

public class DetectorBypassIsolamentoTestes
{
    private const string Arquivo = "Celebri.Infraestrutura/Persistencia/Repositorios/ExemploRepository.cs";

    [Theory]
    [InlineData("_contexto.Eventos.IgnoreQueryFilters().ToListAsync();", CategoriaBypass.IgnorarFiltros)]
    [InlineData("_contexto.Eventos.IgnoreQueryFilters([\"Isolamento\"]).ToListAsync();", CategoriaBypass.IgnorarFiltros)]
    [InlineData("_contexto.Eventos.FromSql($\"select * from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Eventos.FromSqlRaw(\"select * from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Eventos.FromSqlInterpolated($\"select * from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("await _contexto.Database.ExecuteSqlRawAsync(\"delete from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Database.ExecuteSqlInterpolated($\"delete from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Database.ExecuteSql($\"delete from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Database.SqlQueryRaw<Guid>(\"select id from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Database.SqlQuery<Guid>($\"select id from eventos\");", CategoriaBypass.SqlCru)]
    [InlineData("var conexao = _contexto.Database.GetDbConnection();", CategoriaBypass.SqlCru)]
    [InlineData("using var comando = conexao.CreateCommand();", CategoriaBypass.SqlCru)]
    [InlineData("using var comando = new NpgsqlCommand(sql, conexao);", CategoriaBypass.SqlCru)]
    [InlineData("await using var conexao = new NpgsqlConnection(texto);", CategoriaBypass.SqlCru)]
    [InlineData("_contexto.Eventos.ExecuteUpdate(atualizacao => atualizacao.SetProperty(evento => evento.Nome, \"x\"));", CategoriaBypass.AtualizacaoEmMassa)]
    [InlineData("await _contexto.Eventos.ExecuteUpdateAsync(atualizacao => atualizacao.SetProperty(evento => evento.Nome, \"x\"));", CategoriaBypass.AtualizacaoEmMassa)]
    [InlineData("_contexto.Eventos.ExecuteDelete();", CategoriaBypass.AtualizacaoEmMassa)]
    [InlineData("await _contexto.Eventos.ExecuteDeleteAsync();", CategoriaBypass.AtualizacaoEmMassa)]
    [InlineData("atualizacao.SetProperty(evento => evento.OrganizacaoId, outraOrganizacao)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(convite => convite.EventoId, outroEvento)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty<Guid>(x => x.OrganizacaoId, outra)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao\n    .SetProperty(\n        evento =>\n            evento.OrganizacaoId,\n        outra)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x, \"OrganizacaoId\"), outra)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x, nameof(IPertenceOrganizacao.OrganizacaoId)), outra)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x, CelebriDbContext.PropriedadeEvento), outro)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("escopo.ServiceProvider.GetRequiredService<EscopoIsolamentoSistema>().Assumir(organizacaoId);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("_escopoSistema.Assumir(outraOrganizacao);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("_escopoSistema?.Assumir(outraOrganizacao);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("servicos.GetRequiredService<EscopoIsolamentoSistema>()\n    .Assumir(organizacaoId);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("_escopoSistema . Assumir (outraOrganizacao);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("Action<Guid> trocar = _escopoSistema.Assumir;", CategoriaBypass.TrocaOrganizacao)]
    public void Detector_DeveReconhecerPadrao(string trecho, CategoriaBypass categoria)
    {
        var ocorrencias = DetectorBypassIsolamento.Detectar(trecho);

        Assert.Contains(ocorrencias, ocorrencia => ocorrencia.Categoria == categoria);
    }

    [Theory]
    [InlineData("atualizacao.SetProperty(dados => dados.ConteudoCifrado, substituicao.Nova)", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(dados => dados.TokenCifrado, evento.OrganizacaoId.ToString())", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("atualizacao.SetProperty(x => EF.Property<string>(x, \"Nome\"), evento.EventoId.ToString())", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("var conexao = new NpgsqlConnectionStringBuilder(texto);", CategoriaBypass.SqlCru)]
    [InlineData("migrationBuilder.Sql(\"create extension if not exists citext\");", CategoriaBypass.SqlCru)]
    [InlineData("var filtros = registro.IgnoreQueryFiltersPersonalizado;", CategoriaBypass.IgnorarFiltros)]
    [InlineData("_contexto.Eventos.Where(evento => evento.OrganizacaoId == atual).ToListAsync();", CategoriaBypass.AlteracaoChaveIsolamento)]
    [InlineData("public void Assumir(Guid organizacaoId)", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("_responsavel.AssumirResponsabilidade(evento);", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("var assumir = escopoSistema.OrganizacaoId;", CategoriaBypass.TrocaOrganizacao)]
    [InlineData("_escopoRsvp.Estabelecer(organizacaoId, conviteId);", CategoriaBypass.TrocaOrganizacao)]
    public void Detector_NaoDeveMarcarCodigoLegitimo(string trecho, CategoriaBypass categoria)
    {
        var ocorrencias = DetectorBypassIsolamento.Detectar(trecho);

        Assert.DoesNotContain(ocorrencias, ocorrencia => ocorrencia.Categoria == categoria);
    }

    [Fact]
    public void Detector_DeveInformarLinhaDaOcorrencia()
    {
        var conteudo = "namespace Exemplo;\n\npublic class Repositorio\n{\n    void Ler() => _contexto.Eventos.IgnoreQueryFilters();\n}\n";

        var ocorrencia = Assert.Single(DetectorBypassIsolamento.Detectar(conteudo));

        Assert.Equal(5, ocorrencia.Linha);
        Assert.Equal(CategoriaBypass.IgnorarFiltros, ocorrencia.Categoria);
    }

    [Fact]
    public void Detector_ExecuteUpdateSobreOrganizacaoId_DeveGerarAtualizacaoEmMassaEAlteracaoDeChave()
    {
        var conteudo = "await _contexto.Eventos\n    .ExecuteUpdateAsync(atualizacao => atualizacao.SetProperty(evento => evento.OrganizacaoId, outra));";

        var categorias = DetectorBypassIsolamento.Detectar(conteudo).Select(ocorrencia => ocorrencia.Categoria).ToList();

        Assert.Contains(CategoriaBypass.AtualizacaoEmMassa, categorias);
        Assert.Contains(CategoriaBypass.AlteracaoChaveIsolamento, categorias);
    }

    [Theory]
    [InlineData("await a.ExecuteDeleteAsync(); await b.ExecuteDeleteAsync();", CategoriaBypass.AtualizacaoEmMassa)]
    [InlineData("_contexto.Eventos.IgnoreQueryFilters().Concat(_contexto.Convites.IgnoreQueryFilters());", CategoriaBypass.IgnorarFiltros)]
    [InlineData("primeiro.Assumir(a); segundo.Assumir(b);", CategoriaBypass.TrocaOrganizacao)]
    public void Detector_OcorrenciasNaMesmaLinha_DevemSerContadasSeparadamente(string trecho, CategoriaBypass categoria)
    {
        var ocorrencias = DetectorBypassIsolamento.Detectar(trecho);

        Assert.Equal(2, ocorrencias.Count(ocorrencia => ocorrencia.Categoria == categoria));
        Assert.All(ocorrencias, ocorrencia => Assert.Equal(1, ocorrencia.Linha));
    }

    [Theory]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x, \"OrganizacaoId\"), outra)")]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x, nameof(IPertenceOrganizacao.OrganizacaoId)), outra)")]
    [InlineData("atualizacao.SetProperty(x => EF.Property<Guid>(x.OrganizacaoId, CelebriDbContext.PropriedadeEvento), outra)")]
    public void Detector_PadroesSobrepostosDaMesmaCategoria_DevemGerarUmaOcorrencia(string trecho)
    {
        var ocorrencia = Assert.Single(DetectorBypassIsolamento.Detectar(trecho));

        Assert.Equal(CategoriaBypass.AlteracaoChaveIsolamento, ocorrencia.Categoria);
    }

    [Fact]
    public void Detector_DeveOrdenarOcorrenciasPelaPosicao()
    {
        var conteudo = "escopo.Assumir(a); _contexto.Eventos.IgnoreQueryFilters();\nawait b.ExecuteDeleteAsync();";

        var categorias = DetectorBypassIsolamento.Detectar(conteudo).Select(ocorrencia => ocorrencia.Categoria).ToList();

        Assert.Equal([CategoriaBypass.TrocaOrganizacao, CategoriaBypass.IgnorarFiltros, CategoriaBypass.AtualizacaoEmMassa], categorias);
    }

    [Fact]
    public void Detector_CodigoSemBypass_NaoDeveGerarOcorrencias()
    {
        var conteudo = "public Task<Evento?> ObterAsync(Guid id) => _contexto.Eventos.FirstOrDefaultAsync(evento => evento.Id == id);";

        Assert.Empty(DetectorBypassIsolamento.Detectar(conteudo));
    }

    [Fact]
    public void Verificacao_OcorrenciaSemExcecao_DeveSerViolacao()
    {
        var ocorrencias = Ocorrencias("_contexto.Eventos.IgnoreQueryFilters();");

        var violacoes = GuardaIsolamentoTestes.Violacoes(ocorrencias, []);

        var violacao = Assert.Single(violacoes);
        Assert.Equal(Arquivo, violacao.Arquivo);
        Assert.Equal(CategoriaBypass.IgnorarFiltros, violacao.Ocorrencia.Categoria);
    }

    [Fact]
    public void Verificacao_OcorrenciaComExcecaoDaMesmaCategoria_NaoDeveSerViolacao()
    {
        var ocorrencias = Ocorrencias("await _contexto.Eventos.ExecuteDeleteAsync();");

        Assert.Empty(GuardaIsolamentoTestes.Violacoes(ocorrencias, [Excecao(CategoriaBypass.AtualizacaoEmMassa, 1)]));
    }

    [Fact]
    public void Verificacao_ExcecaoDeOutraCategoria_NaoDeveCobrirOcorrencia()
    {
        var ocorrencias = Ocorrencias("_contexto.Eventos.FromSqlRaw(\"select 1\");");

        Assert.NotEmpty(GuardaIsolamentoTestes.Violacoes(ocorrencias, [Excecao(CategoriaBypass.AtualizacaoEmMassa, 1)]));
    }

    [Fact]
    public void Verificacao_NovaOcorrenciaEmArquivoComExcecao_DeveSerViolacaoEDivergencia()
    {
        var ocorrencias = Ocorrencias("await a.ExecuteDeleteAsync();\nawait b.ExecuteDeleteAsync();");
        var excecoes = new[] { Excecao(CategoriaBypass.AtualizacaoEmMassa, 1) };

        Assert.Equal(2, GuardaIsolamentoTestes.Violacoes(ocorrencias, excecoes).Count);
        Assert.Single(GuardaIsolamentoTestes.Divergencias(ocorrencias, excecoes));
    }

    [Fact]
    public void Verificacao_SegundaOcorrenciaNaMesmaLinhaDeUmaExcecao_DeveSerViolacaoEDivergencia()
    {
        var ocorrencias = Ocorrencias("await a.ExecuteDeleteAsync(); await b.ExecuteDeleteAsync();");
        var excecoes = new[] { Excecao(CategoriaBypass.AtualizacaoEmMassa, 1) };

        Assert.Equal(2, GuardaIsolamentoTestes.Violacoes(ocorrencias, excecoes).Count);
        Assert.Contains("encontrado 2", Assert.Single(GuardaIsolamentoTestes.Divergencias(ocorrencias, excecoes)), StringComparison.Ordinal);
    }

    [Fact]
    public void Verificacao_AssumirSemExcecao_DeveSerViolacao()
    {
        var ocorrencias = Ocorrencias("public Task Executar(Guid outra) { _escopoSistema.Assumir(outra); return Task.CompletedTask; }");

        var violacao = Assert.Single(GuardaIsolamentoTestes.Violacoes(ocorrencias, []));

        Assert.Equal(CategoriaBypass.TrocaOrganizacao, violacao.Ocorrencia.Categoria);
    }

    [Fact]
    public void Verificacao_AssumirComExcecaoDaQuantidadeExata_NaoDeveSerViolacao()
    {
        var ocorrencias = Ocorrencias("escopo.ServiceProvider.GetRequiredService<EscopoIsolamentoSistema>().Assumir(organizacaoId);");
        var excecoes = new[] { Excecao(CategoriaBypass.TrocaOrganizacao, 1) };

        Assert.Empty(GuardaIsolamentoTestes.Violacoes(ocorrencias, excecoes));
        Assert.Empty(GuardaIsolamentoTestes.Divergencias(ocorrencias, excecoes));
    }

    [Fact]
    public void Verificacao_AssumirCobertoPorExcecaoDeOutraCategoria_DeveSerViolacao()
    {
        var ocorrencias = Ocorrencias("_escopoSistema.Assumir(outra);");

        Assert.Single(GuardaIsolamentoTestes.Violacoes(ocorrencias, [Excecao(CategoriaBypass.AtualizacaoEmMassa, 1)]));
    }

    [Fact]
    public void ListaDeExcecoes_TrocaDeOrganizacao_DeveCobrirSomenteOsExecutoresDeJobs()
    {
        var arquivos = GuardaIsolamentoTestes.ListaExcecoes
            .Where(excecao => excecao.Categoria == CategoriaBypass.TrocaOrganizacao)
            .Select(excecao => excecao.Arquivo)
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Equal(
            [
                "Celebri.Aplicacao/DadosSensiveis/ExecutorRetencaoDadosSensiveis.cs",
                "Celebri.Aplicacao/Recifragem/ExecutorRecifragemDadosSensiveis.cs",
            ],
            arquivos);
    }

    [Fact]
    public void Verificacao_ExcecaoSemOcorrencia_DeveSerDivergencia()
    {
        var divergencia = Assert.Single(GuardaIsolamentoTestes.Divergencias([], [Excecao(CategoriaBypass.AtualizacaoEmMassa, 1)]));

        Assert.Contains("encontrado 0", divergencia, StringComparison.Ordinal);
    }

    [Fact]
    public void Verificacao_AlteracaoDeChave_NaoPodeSerCobertaPorExcecao()
    {
        var ocorrencias = Ocorrencias("atualizacao.SetProperty(evento => evento.OrganizacaoId, outra)");

        Assert.DoesNotContain(CategoriaBypass.AlteracaoChaveIsolamento, GuardaIsolamentoTestes.ListaExcecoes.Select(excecao => excecao.Categoria));
        Assert.Contains(ocorrencias, item => item.Ocorrencia.Categoria == CategoriaBypass.AlteracaoChaveIsolamento);
    }

    private static List<(string Arquivo, OcorrenciaBypass Ocorrencia)> Ocorrencias(string conteudo)
    {
        return DetectorBypassIsolamento.Detectar(conteudo).Select(ocorrencia => (Arquivo, ocorrencia)).ToList();
    }

    private static GuardaIsolamentoTestes.ExcecaoIsolamento Excecao(CategoriaBypass categoria, int quantidade)
    {
        return new GuardaIsolamentoTestes.ExcecaoIsolamento(Arquivo, categoria, quantidade, "Justificativa sintética usada somente pelo autoteste da guarda.");
    }
}
