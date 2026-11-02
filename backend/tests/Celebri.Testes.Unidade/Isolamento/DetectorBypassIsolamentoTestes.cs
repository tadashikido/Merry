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
