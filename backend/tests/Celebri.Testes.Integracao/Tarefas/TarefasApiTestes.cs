using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Tarefas;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Tarefas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Tarefas.ClienteTarefas;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Tarefas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class TarefasApiTestes : IsolamentoOrganizacaoTestesBase
{
    public TarefasApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static DateOnly Hoje => ClienteCasamentos.HojeEmSaoPaulo();

    [Fact]
    public async Task Criar_DeveRetornar201SemOrganizacaoEAparecerNaLista()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamento.Id), Corpo(prazo: new DateOnly(2027, 1, 10)));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("origemModelo", corpo, StringComparison.OrdinalIgnoreCase);
        var tarefa = (await resposta.Content.ReadFromJsonAsync<TarefaDto>())!;
        Assert.Equal($"/api/casamentos/{casamento.Id}/tarefas/{tarefa.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("AFazer", tarefa.Status);
        Assert.Equal("Fornecedores", tarefa.Categoria);
        Assert.Equal(new DateOnly(2027, 1, 10), tarefa.Prazo);
        Assert.False(tarefa.Atrasada);

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(tarefa.Id, Assert.Single(lista.Tarefas).Id);
        Assert.False(lista.SomenteDoCasal);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravada = await contexto.TarefasCasamento.SingleAsync();
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravada.OrganizacaoId);
        Assert.Equal(OrganizacaoA.UsuarioId, gravada.CriadoPorUsuarioId);
    }

    [Fact]
    public async Task Atrasada_DeveSerCalculadaComOCalendarioDeSaoPaulo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var atrasada = await CriarAsync(OrganizacaoA.Cliente, casamento.Id, Corpo("Assinar contrato", prazo: Hoje.AddDays(-1)));
        var hoje = await CriarAsync(OrganizacaoA.Cliente, casamento.Id, Corpo("Pagar parcela", prazo: Hoje));

        Assert.True(atrasada.Atrasada);
        Assert.Equal(-1, atrasada.DiasParaPrazo);
        Assert.False(hoje.Atrasada);
        Assert.True(hoje.VenceNaSemana);

        var concluida = await AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, atrasada.Id, "Concluida");
        Assert.Equal(HttpStatusCode.OK, concluida.StatusCode);
        var dto = (await concluida.Content.ReadFromJsonAsync<TarefaDto>())!;
        Assert.False(dto.Atrasada);
        Assert.Equal("Assessoria", dto.ConcluidaPor);
        Assert.NotNull(dto.ConcluidaEm);

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(new ResumoTarefasDto(1, 0, 1, 1, 0, 2), lista.Resumo);
    }

    [Fact]
    public async Task AtualizarEObter_DevemRefletirOsNovosDados()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            Rota(casamento.Id, tarefa.Id),
            Corpo("Enviar lista de padrinhos", "Casal", null, "Cerimonia", null));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var obtida = await OrganizacaoA.Cliente.GetFromJsonAsync<TarefaDto>(Rota(casamento.Id, tarefa.Id));
        Assert.Equal("Enviar lista de padrinhos", obtida!.Titulo);
        Assert.Equal("Casal", obtida.Responsavel);
        Assert.Equal("Cerimonia", obtida.Categoria);
        Assert.Null(obtida.Descricao);
        Assert.Null(obtida.Prazo);
    }

    [Fact]
    public async Task Remover_DeveExcluirDefinitivamente()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(Rota(casamento.Id, tarefa.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(Rota(casamento.Id, tarefa.Id)));
    }

    [Theory]
    [InlineData("""{"titulo":"A"}""")]
    [InlineData("""{"titulo":""}""")]
    [InlineData("""{"descricao":"sem título"}""")]
    [InlineData("""{"titulo":"Tarefa","responsavel":"Equipe"}""")]
    [InlineData("""{"titulo":"Tarefa","categoria":"Viagem"}""")]
    [InlineData("""{"titulo":"Tarefa","prazo":"1999-12-31"}""")]
    [InlineData("""{"titulo":"Tarefa","prazo":"31/12/2027"}""")]
    public async Task Criar_Invalido_DeveRetornar400ENaoGravar(string json)
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        using var conteudo = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var resposta = await OrganizacaoA.Cliente.PostAsync(Rota(casamento.Id), conteudo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasCasamento.AnyAsync());
    }

    [Fact]
    public async Task Criar_TituloLongoDemais_DeveRetornar400()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamento.Id), Corpo(new string('t', 161)));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task AlterarStatus_Invalido_DeveRetornar400()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Equal(HttpStatusCode.BadRequest, (await AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, tarefa.Id, "Pausada")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await OrganizacaoA.Cliente.PatchAsJsonAsync(RotaStatus(casamento.Id, tarefa.Id), new { })).StatusCode);
    }

    [Fact]
    public async Task CasamentoArquivado_DeveBloquearEscritasCom422EPermitirLeitura()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var tarefa = await CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamento.Id}/arquivar", null)).StatusCode);

        var respostas = new[]
        {
            await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamento.Id), Corpo()),
            await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(casamento.Id, tarefa.Id), Corpo("Outro título")),
            await AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, tarefa.Id, "Concluida"),
            await OrganizacaoA.Cliente.DeleteAsync(Rota(casamento.Id, tarefa.Id)),
        };

        foreach (var resposta in respostas)
        {
            Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
            var problema = await resposta.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
            Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, problema!.Detail);
        }

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(lista.CasamentoArquivado);
        Assert.Equal("Contratar fotógrafo", Assert.Single(lista.Tarefas).Titulo);
    }

    [Fact]
    public async Task Criar_AlemDoLimiteDoCasamento_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var agora = DateTimeOffset.UtcNow;
            contexto.TarefasCasamento.AddRange(Enumerable.Range(1, TarefaCasamento.LimitePorCasamento).Select(numero =>
                TarefaCasamento.Criar(casamento.Id, new DadosTarefa($"Tarefa {numero}", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, null), null, agora)));
            await contexto.SaveChangesAsync();
        }

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(casamento.Id), Corpo("Tarefa 501"));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = await resposta.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(MensagensTarefas.LimitePorCasamento, problema!.Detail);
    }

    [Fact]
    public async Task Pendencias_DeveConsolidarSoAbertasDeCasamentosAtivosDaOrganizacao()
    {
        var ana = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: "Ana"));
        var luisa = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: "Luísa"));
        var arquivado = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: "Arquivada"));
        var deB = await ClienteCasamentos.CriarAsync(OrganizacaoB.Cliente);

        var maisAntiga = await CriarAsync(OrganizacaoA.Cliente, luisa.Id, Corpo("Confirmar DJ", prazo: Hoje.AddDays(-5)));
        var atrasada = await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Assinar decoração", "Casal", Hoje.AddDays(-1)));
        var emAndamento = await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Pagar fotografia", prazo: Hoje.AddDays(6)));
        await AlterarStatusAsync(OrganizacaoA.Cliente, ana.Id, emAndamento.Id, "EmAndamento");
        var hoje = await CriarAsync(OrganizacaoA.Cliente, luisa.Id, Corpo("Enviar mapa de mesas", prazo: Hoje));
        await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Muito adiante", prazo: Hoje.AddDays(7)));
        await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Sem prazo"));
        var concluida = await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Já feita", prazo: Hoje.AddDays(-3)));
        await AlterarStatusAsync(OrganizacaoA.Cliente, ana.Id, concluida.Id, "Concluida");
        var cancelada = await CriarAsync(OrganizacaoA.Cliente, ana.Id, Corpo("Cancelada", prazo: Hoje.AddDays(-3)));
        await AlterarStatusAsync(OrganizacaoA.Cliente, ana.Id, cancelada.Id, "Cancelada");
        await CriarAsync(OrganizacaoA.Cliente, arquivado.Id, Corpo("De arquivado", prazo: Hoje.AddDays(-2)));
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{arquivado.Id}/arquivar", null);
        await CriarAsync(OrganizacaoB.Cliente, deB.Id, Corpo("Da outra assessoria", prazo: Hoje.AddDays(-1)));

        var pendencias = await OrganizacaoA.Cliente.GetFromJsonAsync<PendenciasTarefasDto>(RotaPendencias);

        Assert.Equal(2, pendencias!.TotalAtrasadas);
        Assert.Equal(2, pendencias.TotalEstaSemana);
        Assert.Equal(2, pendencias.CasamentosComAtraso);
        Assert.Equal([maisAntiga.Id, atrasada.Id], pendencias.Atrasadas.Select(item => item.Id));
        Assert.Equal([hoje.Id, emAndamento.Id], pendencias.EstaSemana.Select(item => item.Id));
        Assert.Equal("Luísa", pendencias.Atrasadas[0].NomePrimeiraPessoa);
        Assert.Equal(luisa.Id, pendencias.Atrasadas[0].CasamentoId);
        Assert.Equal(-5, pendencias.Atrasadas[0].DiasParaPrazo);
        Assert.Equal("Casal", pendencias.Atrasadas[1].Responsavel);

        var deOutra = await OrganizacaoB.Cliente.GetFromJsonAsync<PendenciasTarefasDto>(RotaPendencias);
        Assert.Equal(1, deOutra!.TotalAtrasadas);
        Assert.Equal("Da outra assessoria", Assert.Single(deOutra.Atrasadas).Titulo);
    }

    [Fact]
    public async Task SemToken_DeveRetornar401()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota(casamento.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(RotaPendencias)).StatusCode);
    }
}
