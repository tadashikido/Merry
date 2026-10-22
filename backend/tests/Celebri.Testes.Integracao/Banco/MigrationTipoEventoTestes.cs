using Celebri.Infraestrutura.Persistencia;
using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Celebri.Testes.Integracao.Banco;

[Collection(ColecaoBancoPostgreSql.Nome)]
public class MigrationTipoEventoTestes
{
    private const string MigrationAnterior = "20261022190251_GeneralizarDominioEvento";
    private const string MigrationTipoEvento = "20261022214124_TipoEvento";

    private static readonly Guid Organizacao = Guid.Parse("11000000-0000-0000-0000-000000000001");
    private static readonly Guid EventoExistente = Guid.Parse("21000000-0000-0000-0000-000000000001");
    private static readonly Guid EventoNovo = Guid.Parse("21000000-0000-0000-0000-000000000002");
    private static readonly Guid ChecklistSugerido = Guid.Parse("61000000-0000-0000-0000-000000000001");
    private static readonly Guid ChecklistProprio = Guid.Parse("61000000-0000-0000-0000-000000000002");
    private static readonly Guid CronogramaSugerido = Guid.Parse("61000000-0000-0000-0000-000000000003");

    private readonly BancoPostgreSqlFixture _banco;

    public MigrationTipoEventoTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task TipoEvento_ComDadosAnteriores_DeveMarcarCasamentoPreservarDadosEReverterNoDown()
    {
        var stringConexao = _banco.CriarStringConexaoBancoNovo();
        await using var contexto = CriarContexto(stringConexao);
        var migrador = contexto.GetService<IMigrator>();
        await migrador.MigrateAsync(MigrationAnterior);
        await ExecutarAsync(stringConexao, SqlDadosAnteriores());

        await migrador.MigrateAsync(MigrationTipoEvento);

        Assert.Equal(
            "Casamento|Ana|João|2027-05-20|Capela|Villa",
            await EscalarAsync(stringConexao, $"SELECT tipo || '|' || nome_primeira_pessoa || '|' || nome_segunda_pessoa || '|' || data::text || '|' || local_cerimonia || '|' || local_recepcao FROM eventos WHERE id = '{EventoExistente}'"));
        Assert.Equal("Casamento", await EscalarAsync(stringConexao, $"SELECT tipo_evento FROM modelos_checklist WHERE id = '{ChecklistSugerido}'"));
        Assert.Equal("nulo", await EscalarAsync(stringConexao, $"SELECT coalesce(tipo_evento, 'nulo') FROM modelos_checklist WHERE id = '{ChecklistProprio}'"));
        Assert.Equal("Casamento", await EscalarAsync(stringConexao, $"SELECT tipo_evento FROM modelos_cronograma WHERE id = '{CronogramaSugerido}'"));
        Assert.Equal(
            "nulo|nulo",
            await EscalarAsync(stringConexao, $"SELECT coalesce(modelos_checklist_por_tipo_em::text, 'nulo') || '|' || coalesce(modelos_cronograma_por_tipo_em::text, 'nulo') FROM organizacoes WHERE id = '{Organizacao}'"));

        await ExecutarAsync(stringConexao, $"""
            INSERT INTO eventos (id, organizacao_id, tipo, nome_primeira_pessoa, nome_segunda_pessoa, data, criado_em, atualizado_em)
                VALUES ('{EventoNovo}', '{Organizacao}', 'Aniversario', 'Helena', NULL, '2027-08-01', now(), now());
            """);

        await migrador.MigrateAsync(MigrationAnterior);

        Assert.Equal("2", await EscalarAsync(stringConexao, "SELECT count(*)::text FROM eventos"));
        Assert.Equal("Ana|João", await EscalarAsync(stringConexao, $"SELECT nome_primeira_pessoa || '|' || nome_segunda_pessoa FROM eventos WHERE id = '{EventoExistente}'"));
        Assert.Equal("Helena|", await EscalarAsync(stringConexao, $"SELECT nome_primeira_pessoa || '|' || nome_segunda_pessoa FROM eventos WHERE id = '{EventoNovo}'"));
        Assert.Equal("0", await EscalarAsync(stringConexao, "SELECT count(*)::text FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'tipo'"));
        Assert.Equal("3", await EscalarAsync(stringConexao, "SELECT ((SELECT count(*) FROM modelos_checklist) + (SELECT count(*) FROM modelos_cronograma))::text"));

        await migrador.MigrateAsync();

        Assert.Equal("Casamento|Casamento", await EscalarAsync(stringConexao, "SELECT string_agg(tipo, '|' ORDER BY id) FROM eventos"));
        Assert.Empty(await contexto.Database.GetPendingMigrationsAsync());
    }

    private static CelebriDbContext CriarContexto(string stringConexao)
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();
        opcoes.ConfigurarPostgreSql(stringConexao);
        return new CelebriDbContext(opcoes.Options, new ContextoIsolamentoSemOrganizacao());
    }

    private static string SqlDadosAnteriores()
    {
        const string agora = "'2026-10-01T12:00:00Z'";
        return $"""
            INSERT INTO organizacoes (id, nome, criada_em, modelo_checklist_sugerido_em, modelo_cronograma_sugerido_em)
                VALUES ('{Organizacao}', 'Assessoria Teste', {agora}, {agora}, {agora});
            INSERT INTO eventos (id, organizacao_id, nome_primeira_pessoa, nome_segunda_pessoa, data, local_cerimonia, local_recepcao, criado_em, atualizado_em)
                VALUES ('{EventoExistente}', '{Organizacao}', 'Ana', 'João', '2027-05-20', 'Capela', 'Villa', {agora}, {agora});
            INSERT INTO modelos_checklist (id, organizacao_id, nome, sugerido, criado_em, atualizado_em)
                VALUES ('{ChecklistSugerido}', '{Organizacao}', 'Checklist essencial', true, {agora}, {agora}),
                       ('{ChecklistProprio}', '{Organizacao}', 'Checklist da Renata', false, {agora}, {agora});
            INSERT INTO modelos_cronograma (id, organizacao_id, nome, horario_referencia, sugerido, criado_em, atualizado_em)
                VALUES ('{CronogramaSugerido}', '{Organizacao}', 'Roteiro clássico', '16:00', true, {agora}, {agora});
            """;
    }

    private static async Task<string> EscalarAsync(string stringConexao, string sql)
    {
        await using var conexao = new NpgsqlConnection(stringConexao);
        await conexao.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexao);
        return (string)(await comando.ExecuteScalarAsync())!;
    }

    private static async Task ExecutarAsync(string stringConexao, string sql)
    {
        await using var conexao = new NpgsqlConnection(stringConexao);
        await conexao.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexao);
        await comando.ExecuteNonQueryAsync();
    }
}
