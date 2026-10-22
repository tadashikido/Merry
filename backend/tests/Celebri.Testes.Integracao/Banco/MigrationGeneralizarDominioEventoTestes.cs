using Celebri.Infraestrutura.Persistencia;
using Celebri.Infraestrutura.Persistencia.Isolamento;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Celebri.Testes.Integracao.Banco;

[Collection(ColecaoBancoPostgreSql.Nome)]
public class MigrationGeneralizarDominioEventoTestes
{
    private const string MigrationAnterior = "20261014232039_CobrancaRsvp";
    private const string MigrationRenome = "20261022190251_GeneralizarDominioEvento";

    private static readonly Guid Organizacao = Guid.Parse("10000000-0000-0000-0000-000000000001");
    private static readonly Guid EventoId = Guid.Parse("20000000-0000-0000-0000-000000000001");
    private static readonly Guid Dono = Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid Anfitriao = Guid.Parse("30000000-0000-0000-0000-000000000002");
    private static readonly Guid Acesso = Guid.Parse("40000000-0000-0000-0000-000000000001");
    private static readonly Guid Token = Guid.Parse("40000000-0000-0000-0000-000000000002");
    private static readonly Guid Convite = Guid.Parse("50000000-0000-0000-0000-000000000001");
    private static readonly Guid Convidado = Guid.Parse("50000000-0000-0000-0000-000000000002");
    private static readonly Guid Registro = Guid.Parse("50000000-0000-0000-0000-000000000003");
    private static readonly Guid Tarefa = Guid.Parse("60000000-0000-0000-0000-000000000001");
    private static readonly Guid Modelo = Guid.Parse("60000000-0000-0000-0000-000000000002");
    private static readonly Guid ItemModelo = Guid.Parse("60000000-0000-0000-0000-000000000003");
    private static readonly Guid Fornecedor = Guid.Parse("70000000-0000-0000-0000-000000000001");
    private static readonly Guid Vinculo = Guid.Parse("70000000-0000-0000-0000-000000000002");
    private static readonly Guid Parcela = Guid.Parse("70000000-0000-0000-0000-000000000003");
    private static readonly Guid ItemCronograma = Guid.Parse("80000000-0000-0000-0000-000000000001");
    private static readonly Guid Mesa = Guid.Parse("80000000-0000-0000-0000-000000000002");

    private static readonly string[] TabelasAntigas =
    [
        "organizacoes", "casamentos", "usuarios", "acessos_casal", "tokens_acesso_casal", "convites", "convidados",
        "registros_alteracao_convites", "modelos_checklist", "itens_modelo_checklist", "tarefas_casamento", "fornecedores",
        "fornecedores_casamento", "parcelas_fornecedor", "itens_cronograma", "mesas",
    ];

    private static readonly string[] TabelasNovas =
    [
        "organizacoes", "eventos", "usuarios", "acessos_anfitriao", "tokens_acesso_anfitriao", "convites", "convidados",
        "registros_alteracao_convites", "modelos_checklist", "itens_modelo_checklist", "tarefas_evento", "fornecedores",
        "fornecedores_evento", "parcelas_fornecedor", "itens_cronograma", "mesas",
    ];

    private const string ConsultaCatalogo = """
        SELECT 'T|' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '__EFMigrationsHistory'
        UNION ALL
        SELECT 'C|' || table_name || '|' || column_name || '|' || data_type || '|' || is_nullable FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name <> '__EFMigrationsHistory'
        UNION ALL
        SELECT 'K|' || rel.relname || '|' || con.conname || '|' || pg_get_constraintdef(con.oid) FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace n ON n.oid = rel.relnamespace
            WHERE n.nspname = 'public' AND rel.relname <> '__EFMigrationsHistory'
        UNION ALL
        SELECT 'I|' || tablename || '|' || indexname || '|' || regexp_replace(indexdef, '^.* USING ', '') FROM pg_indexes
            WHERE schemaname = 'public' AND tablename <> '__EFMigrationsHistory'
        """;

    private readonly BancoPostgreSqlFixture _banco;

    public MigrationGeneralizarDominioEventoTestes(BancoPostgreSqlFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Renome_ComDadosDoEsquemaAnterior_DevePreservarRegistrosVinculosEValoresERetornarNoDown()
    {
        var stringConexao = _banco.CriarStringConexaoBancoNovo();
        await using var contexto = CriarContexto(stringConexao);
        var migrador = contexto.GetService<IMigrator>();
        await migrador.MigrateAsync(MigrationAnterior);
        await ExecutarAsync(stringConexao, SqlDadosEsquemaAnterior());
        var contagensAntes = await ContarAsync(stringConexao, TabelasAntigas);

        await migrador.MigrateAsync(MigrationRenome);

        Assert.Equal(contagensAntes, await ContarAsync(stringConexao, TabelasNovas));
        Assert.Equal("Anfitriao", await EscalarAsync(stringConexao, $"SELECT papel FROM usuarios WHERE id = '{Anfitriao}'"));
        Assert.Equal("Dono", await EscalarAsync(stringConexao, $"SELECT papel FROM usuarios WHERE id = '{Dono}'"));
        Assert.Equal(EventoId.ToString(), await EscalarAsync(stringConexao, $"SELECT evento_id::text FROM usuarios WHERE id = '{Anfitriao}'"));
        Assert.Equal("Anfitriao|Anfitriao", await EscalarAsync(stringConexao, $"SELECT responsavel || '|' || concluida_por FROM tarefas_evento WHERE id = '{Tarefa}'"));
        Assert.Equal("Anfitriao", await EscalarAsync(stringConexao, $"SELECT responsavel FROM itens_modelo_checklist WHERE id = '{ItemModelo}'"));
        Assert.Equal("120", await EscalarAsync(stringConexao, $"SELECT dias_antes_do_evento::text FROM itens_modelo_checklist WHERE id = '{ItemModelo}'"));
        Assert.Equal("DiaDoEvento", await EscalarAsync(stringConexao, $"SELECT dia FROM itens_cronograma WHERE id = '{ItemCronograma}'"));
        Assert.Equal("Anfitriao", await EscalarAsync(stringConexao, $"SELECT papel_usuario FROM registros_alteracao_convites WHERE id = '{Registro}'"));
        Assert.Equal("Ana", await EscalarAsync(stringConexao, $"""
            SELECT e.nome_primeira_pessoa FROM tokens_acesso_anfitriao t
                JOIN acessos_anfitriao a ON a.id = t.acesso_anfitriao_id
                JOIN eventos e ON e.id = a.evento_id AND e.id = t.evento_id
                WHERE t.id = '{Token}'
            """));
        Assert.Equal(Vinculo.ToString(), await EscalarAsync(stringConexao, $"""
            SELECT p.fornecedor_evento_id::text FROM parcelas_fornecedor p
                JOIN fornecedores_evento f ON f.id = p.fornecedor_evento_id
                JOIN itens_cronograma i ON i.fornecedor_evento_id = f.id
                WHERE p.id = '{Parcela}' AND i.id = '{ItemCronograma}'
            """));
        await Assert.ThrowsAsync<PostgresException>(() => ExecutarAsync(stringConexao, $"UPDATE usuarios SET papel = 'Casal' WHERE id = '{Anfitriao}'"));

        await migrador.MigrateAsync(MigrationAnterior);

        Assert.Equal(contagensAntes, await ContarAsync(stringConexao, TabelasAntigas));
        Assert.Equal("Casal", await EscalarAsync(stringConexao, $"SELECT papel FROM usuarios WHERE id = '{Anfitriao}'"));
        Assert.Equal("Casal|Casal", await EscalarAsync(stringConexao, $"SELECT responsavel || '|' || concluida_por FROM tarefas_casamento WHERE id = '{Tarefa}'"));
        Assert.Equal("DiaDoCasamento", await EscalarAsync(stringConexao, $"SELECT dia FROM itens_cronograma WHERE id = '{ItemCronograma}'"));
        Assert.Equal("Casal", await EscalarAsync(stringConexao, $"SELECT papel_usuario FROM registros_alteracao_convites WHERE id = '{Registro}'"));

        await migrador.MigrateAsync();

        Assert.Equal(contagensAntes, await ContarAsync(stringConexao, TabelasNovas));
        Assert.Empty(await contexto.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Migrations_DevemProduzirOMesmoEsquemaQueOModeloAtual()
    {
        var conexaoMigrations = _banco.CriarStringConexaoBancoNovo();
        await using (var contexto = CriarContexto(conexaoMigrations))
        {
            await contexto.Database.MigrateAsync();
        }

        var conexaoModelo = _banco.CriarStringConexaoBancoNovo();
        await using (var contexto = CriarContexto(conexaoModelo))
        {
            await contexto.Database.EnsureCreatedAsync();
        }

        var esperado = await LerCatalogoAsync(conexaoModelo);
        var obtido = await LerCatalogoAsync(conexaoMigrations);
        Assert.Equal(esperado, obtido);
        Assert.DoesNotContain(obtido, linha => linha.Contains("casamento", StringComparison.Ordinal) || linha.Contains("casal", StringComparison.Ordinal));
    }

    private static CelebriDbContext CriarContexto(string stringConexao)
    {
        var opcoes = new DbContextOptionsBuilder<CelebriDbContext>();
        opcoes.ConfigurarPostgreSql(stringConexao);
        return new CelebriDbContext(opcoes.Options, new ContextoIsolamentoSemOrganizacao());
    }

    private static string SqlDadosEsquemaAnterior()
    {
        const string agora = "'2026-10-01T12:00:00Z'";
        return $"""
            INSERT INTO organizacoes (id, nome, criada_em) VALUES ('{Organizacao}', 'Assessoria Teste', {agora});
            INSERT INTO casamentos (id, organizacao_id, nome_primeira_pessoa, nome_segunda_pessoa, data, criado_em, atualizado_em)
                VALUES ('{EventoId}', '{Organizacao}', 'Ana', 'João', '2027-05-20', {agora}, {agora});
            INSERT INTO usuarios (id, organizacao_id, nome, email, senha_hash, papel, ativo, falhas_login_consecutivas, criado_em, casamento_id)
                VALUES ('{Dono}', '{Organizacao}', 'Dona', 'dona@teste.com', 'hash', 'Dono', true, 0, {agora}, NULL),
                       ('{Anfitriao}', '{Organizacao}', 'Ana', 'ana@teste.com', 'hash', 'Casal', true, 0, {agora}, '{EventoId}');
            INSERT INTO acessos_casal (id, organizacao_id, casamento_id, nome, email, convidado_em, convidado_por_usuario_id, convite_expira_em, usuario_id, aceito_em)
                VALUES ('{Acesso}', '{Organizacao}', '{EventoId}', 'Ana', 'ana@teste.com', {agora}, '{Dono}', '2026-10-08T12:00:00Z', '{Anfitriao}', {agora});
            INSERT INTO tokens_acesso_casal (id, organizacao_id, casamento_id, acesso_casal_id, token_hash, gerado_em)
                VALUES ('{Token}', '{Organizacao}', '{EventoId}', '{Acesso}', repeat('a', 64), {agora});
            INSERT INTO convites (id, organizacao_id, casamento_id, nome, limite_acompanhantes, quantidade_cobrancas, status_envio, criado_em, atualizado_em)
                VALUES ('{Convite}', '{Organizacao}', '{EventoId}', 'Família Souza', 1, 0, 'NaoEnviado', {agora}, {agora});
            INSERT INTO convidados (id, organizacao_id, casamento_id, convite_id, nome, faixa_etaria, resposta, acompanhante, ordem, criado_em, atualizado_em)
                VALUES ('{Convidado}', '{Organizacao}', '{EventoId}', '{Convite}', 'Carla Souza', 'Adulto', 'Pendente', false, 0, {agora}, {agora});
            INSERT INTO registros_alteracao_convites (id, organizacao_id, casamento_id, convite_id, acao, papel_usuario, ocorrido_em)
                VALUES ('{Registro}', '{Organizacao}', '{EventoId}', '{Convite}', 'Criacao', 'Casal', {agora});
            INSERT INTO modelos_checklist (id, organizacao_id, nome, sugerido, criado_em, atualizado_em)
                VALUES ('{Modelo}', '{Organizacao}', 'Modelo', false, {agora}, {agora});
            INSERT INTO itens_modelo_checklist (id, organizacao_id, modelo_id, titulo, responsavel, categoria, dias_antes_do_casamento, criado_em, atualizado_em)
                VALUES ('{ItemModelo}', '{Organizacao}', '{Modelo}', 'Provar os trajes', 'Casal', 'Geral', 120, {agora}, {agora});
            INSERT INTO tarefas_casamento (id, organizacao_id, casamento_id, titulo, responsavel, categoria, status, concluida_em, concluida_por, origem_modelo_item_id, criado_em, atualizado_em)
                VALUES ('{Tarefa}', '{Organizacao}', '{EventoId}', 'Provar os trajes', 'Casal', 'Geral', 'Concluida', {agora}, 'Casal', '{ItemModelo}', {agora}, {agora});
            INSERT INTO fornecedores (id, organizacao_id, nome_empresa, nome_normalizado, categoria, criado_em, atualizado_em)
                VALUES ('{Fornecedor}', '{Organizacao}', 'Buffet Teste', 'buffet teste', 'Buffet', {agora}, {agora});
            INSERT INTO fornecedores_casamento (id, organizacao_id, casamento_id, fornecedor_id, status, criado_em, atualizado_em)
                VALUES ('{Vinculo}', '{Organizacao}', '{EventoId}', '{Fornecedor}', 'Cotacao', {agora}, {agora});
            INSERT INTO parcelas_fornecedor (id, organizacao_id, casamento_id, fornecedor_casamento_id, valor, vencimento, status, criado_em, atualizado_em)
                VALUES ('{Parcela}', '{Organizacao}', '{EventoId}', '{Vinculo}', 1500.00, '2027-01-10', 'Pendente', {agora}, {agora});
            INSERT INTO itens_cronograma (id, organizacao_id, casamento_id, dia, inicio, atividade, status, fornecedor_casamento_id, criado_em, atualizado_em)
                VALUES ('{ItemCronograma}', '{Organizacao}', '{EventoId}', 'DiaDoCasamento', '18:00', 'Cerimônia', 'Previsto', '{Vinculo}', {agora}, {agora});
            INSERT INTO mesas (id, organizacao_id, casamento_id, numero, capacidade, especial, criado_em, atualizado_em)
                VALUES ('{Mesa}', '{Organizacao}', '{EventoId}', 1, 10, true, {agora}, {agora});
            """;
    }

    private static async Task<List<long>> ContarAsync(string stringConexao, IEnumerable<string> tabelas)
    {
        var contagens = new List<long>();
        foreach (var tabela in tabelas)
        {
            contagens.Add(long.Parse(await EscalarAsync(stringConexao, $"SELECT count(*)::text FROM {tabela}")));
        }

        return contagens;
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

    private static async Task<List<string>> LerCatalogoAsync(string stringConexao)
    {
        var linhas = new List<string>();
        await using var conexao = new NpgsqlConnection(stringConexao);
        await conexao.OpenAsync();
        await using var comando = new NpgsqlCommand(ConsultaCatalogo, conexao);
        await using var leitor = await comando.ExecuteReaderAsync();
        while (await leitor.ReadAsync())
        {
            linhas.Add(leitor.GetString(0));
        }

        linhas.Sort(StringComparer.Ordinal);
        return linhas;
    }
}
