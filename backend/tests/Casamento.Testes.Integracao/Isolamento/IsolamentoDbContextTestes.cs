using Casamento.Aplicacao.Excecoes;
using Casamento.Testes.Integracao.Banco;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Testes.Integracao.Isolamento;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class IsolamentoDbContextTestes : IsolamentoOrganizacaoTestesBase
{
    public IsolamentoDbContextTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    protected override bool IncluirEntidadeTeste => true;

    [Fact]
    public async Task Adicionar_SemOrganizacaoId_DevePreencherComOrganizacaoCorrente()
    {
        var registro = RegistroIsolado.Criar("Novo");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Add(registro);
            await contexto.SaveChangesAsync();
        }

        Assert.Equal(OrganizacaoA.OrganizacaoId, registro.OrganizacaoId);
        await using var contextoSemFiltro = CriarContextoSemOrganizacao();
        var persistido = await contextoSemFiltro.Set<RegistroIsolado>().IgnoreQueryFilters().SingleAsync(item => item.Id == registro.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, persistido.OrganizacaoId);
    }

    [Fact]
    public async Task Consultas_DeOutraOrganizacao_NaoDevemEnxergarRegistro()
    {
        var idDeB = await PersistirAsync(OrganizacaoB, "Registro de B");

        await using var contexto = CriarContexto(OrganizacaoA);

        Assert.Null(await contexto.Set<RegistroIsolado>().FindAsync(idDeB));
        Assert.Null(await contexto.Set<RegistroIsolado>().FirstOrDefaultAsync(item => item.Id == idDeB));
        Assert.Equal(0, await contexto.Set<RegistroIsolado>().CountAsync());
        Assert.True(await contexto.Set<RegistroIsolado>().IgnoreQueryFilters().AnyAsync(item => item.Id == idDeB));
    }

    [Fact]
    public async Task Consulta_DeveGerarPredicadoParametrizadoPorOrganizacao()
    {
        await using var contexto = CriarContexto(OrganizacaoA);

        var sql = contexto.Set<RegistroIsolado>().ToQueryString();

        Assert.Contains("organizacao_id", sql, StringComparison.Ordinal);
        Assert.Contains(OrganizacaoA.OrganizacaoId.ToString(), sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Consulta_ComContextosDeOrganizacoesDiferentes_DeveUsarOrganizacaoDeCadaInstancia()
    {
        await PersistirAsync(OrganizacaoA, "A");
        await PersistirAsync(OrganizacaoB, "B");

        await using var contextoA = CriarContexto(OrganizacaoA);
        await using var contextoB = CriarContexto(OrganizacaoB);

        Assert.Equal(["A"], await contextoA.Set<RegistroIsolado>().Select(item => item.Descricao).ToListAsync());
        Assert.Equal(["B"], await contextoB.Set<RegistroIsolado>().Select(item => item.Descricao).ToListAsync());
    }

    [Fact]
    public async Task Adicionar_ComOrganizacaoDeOutraOrganizacao_DeveLancarViolacaoSemPersistir()
    {
        var registro = RegistroIsolado.CriarComOrganizacao(OrganizacaoB.OrganizacaoId, "Intruso");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Add(registro);
            var excecao = await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
            Assert.Equal(nameof(RegistroIsolado), excecao.Entidade);
        }

        await AssertNaoPersistidoAsync(registro.Id);
    }

    [Fact]
    public async Task Adicionar_ComSaveChangesSincrono_DeveAplicarMesmaProtecao()
    {
        var registro = RegistroIsolado.CriarComOrganizacao(OrganizacaoB.OrganizacaoId, "Intruso");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Add(registro);
            Assert.Throws<ViolacaoIsolamentoException>(() => contexto.SaveChanges());
        }

        await AssertNaoPersistidoAsync(registro.Id);
    }

    [Fact]
    public async Task Alterar_OrganizacaoIdDeRegistroPersistido_DeveLancarViolacao()
    {
        var id = await PersistirAsync(OrganizacaoA, "Registro de A");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var registro = await contexto.Set<RegistroIsolado>().SingleAsync(item => item.Id == id);
            registro.AlterarOrganizacao(OrganizacaoB.OrganizacaoId);
            await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
        }

        await using var contextoA = CriarContexto(OrganizacaoA);
        Assert.True(await contextoA.Set<RegistroIsolado>().AnyAsync(item => item.Id == id));
    }

    [Fact]
    public async Task Atualizar_EntidadeDeOutraOrganizacaoAnexadaManualmente_DeveLancarViolacao()
    {
        var idDeB = await PersistirAsync(OrganizacaoB, "Original de B");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Update(RegistroIsolado.Reconstituir(idDeB, OrganizacaoB.OrganizacaoId, "Invadido"));
            await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
        }

        await AssertDescricaoAsync(OrganizacaoB, idDeB, "Original de B");
    }

    [Fact]
    public async Task Atualizar_EntidadeDeOutraOrganizacaoDisfarcadaComOrganizacaoCorrente_NaoDeveAlterarDadosDeB()
    {
        var idDeB = await PersistirAsync(OrganizacaoB, "Original de B");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Update(RegistroIsolado.Reconstituir(idDeB, OrganizacaoA.OrganizacaoId, "Invadido"));
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => contexto.SaveChangesAsync());
        }

        await AssertDescricaoAsync(OrganizacaoB, idDeB, "Original de B");
    }

    [Fact]
    public async Task Remover_EntidadeDeOutraOrganizacaoAnexadaManualmente_DeveLancarViolacao()
    {
        var idDeB = await PersistirAsync(OrganizacaoB, "Registro de B");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.Remove(RegistroIsolado.Reconstituir(idDeB, OrganizacaoB.OrganizacaoId, "Registro de B"));
            await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
        }

        await AssertDescricaoAsync(OrganizacaoB, idDeB, "Registro de B");
    }

    [Fact]
    public async Task ExecuteUpdate_DeveAfetarSomenteRegistrosDaOrganizacaoCorrente()
    {
        var idDeA = await PersistirAsync(OrganizacaoA, "A");
        var idDeB = await PersistirAsync(OrganizacaoB, "B");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var afetados = await contexto.Set<RegistroIsolado>()
                .ExecuteUpdateAsync(atualizacao => atualizacao.SetProperty(item => item.Descricao, "Atualizado"));
            Assert.Equal(1, afetados);
        }

        await AssertDescricaoAsync(OrganizacaoA, idDeA, "Atualizado");
        await AssertDescricaoAsync(OrganizacaoB, idDeB, "B");
    }

    [Fact]
    public async Task ExecuteDelete_DeveAfetarSomenteRegistrosDaOrganizacaoCorrente()
    {
        await PersistirAsync(OrganizacaoA, "A");
        var idDeB = await PersistirAsync(OrganizacaoB, "B");

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            Assert.Equal(1, await contexto.Set<RegistroIsolado>().ExecuteDeleteAsync());
        }

        await AssertDescricaoAsync(OrganizacaoB, idDeB, "B");
    }

    [Fact]
    public async Task ContextoSemOrganizacao_NaoDeveLerNemGravar()
    {
        await PersistirAsync(OrganizacaoA, "A");

        await using var contexto = CriarContextoSemOrganizacao();

        Assert.Empty(await contexto.Set<RegistroIsolado>().ToListAsync());
        contexto.Add(RegistroIsolado.Criar("Sem organização"));
        await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task ContextoComOrganizacaoVazia_DeveRejeitarGravacao()
    {
        await using var contexto = CriarContexto(Guid.Empty);

        contexto.Add(RegistroIsolado.Criar("Organização vazia"));

        await Assert.ThrowsAsync<ViolacaoIsolamentoException>(() => contexto.SaveChangesAsync());
    }

    [Fact]
    public async Task EntidadesDeAutenticacao_NaoDevemSerFiltradasPorOrganizacao()
    {
        await using var contexto = CriarContexto(OrganizacaoA);

        Assert.True(await contexto.Usuarios.AnyAsync(usuario => usuario.Id == OrganizacaoB.UsuarioId));
        Assert.True(await contexto.Organizacoes.AnyAsync(organizacao => organizacao.Id == OrganizacaoB.OrganizacaoId));
    }

    private async Task<Guid> PersistirAsync(OrganizacaoTeste organizacao, string descricao)
    {
        await using var contexto = CriarContexto(organizacao);
        var registro = RegistroIsolado.Criar(descricao);
        contexto.Add(registro);
        await contexto.SaveChangesAsync();
        return registro.Id;
    }

    private async Task AssertDescricaoAsync(OrganizacaoTeste organizacao, Guid id, string descricaoEsperada)
    {
        await using var contexto = CriarContexto(organizacao);
        var registro = await contexto.Set<RegistroIsolado>().SingleAsync(item => item.Id == id);
        Assert.Equal(descricaoEsperada, registro.Descricao);
    }

    private async Task AssertNaoPersistidoAsync(Guid id)
    {
        await using var contexto = CriarContextoSemOrganizacao();
        Assert.False(await contexto.Set<RegistroIsolado>().IgnoreQueryFilters().AnyAsync(item => item.Id == id));
    }
}
