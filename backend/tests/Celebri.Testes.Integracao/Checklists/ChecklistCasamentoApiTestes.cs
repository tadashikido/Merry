using System.Net;
using System.Net.Http.Json;
using Casamento.Aplicacao.Casamentos;
using Casamento.Aplicacao.Checklists;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Tarefas;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Casamento.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteCasamentos = Casamento.Testes.Integracao.Casamentos.ClienteCasamentos;
using ClienteTarefas = Casamento.Testes.Integracao.Tarefas.ClienteTarefas;

namespace Casamento.Testes.Integracao.Checklists;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ChecklistCasamentoApiTestes : IsolamentoOrganizacaoTestesBase
{
    private static readonly DateOnly DataCasamento = new(2027, 12, 12);

    public ChecklistCasamentoApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static int[] QuarentaPrazos()
    {
        return Enumerable.Range(0, 40).Select(indice => (indice * 28) - 30).ToArray();
    }

    private static Task<CasamentoDto> CriarCasamentoAsync(HttpClient cliente, DateOnly? data = null, string nome = "Ana Beatriz")
    {
        return ClienteCasamentos.CriarAsync(cliente, ClienteCasamentos.CorpoValido(nomePrimeiraPessoa: nome, data: ClienteTarefas.Data(data ?? DataCasamento)));
    }

    [Fact]
    public async Task Aplicar_ModeloDe40Itens_DeveGerar40TarefasComPrazosCorretos()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, QuarentaPrazos());
        Assert.Equal(40, modelo.Itens.Count);

        var resultado = await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);

        Assert.Equal(40, resultado.ItensNoModelo);
        Assert.Equal(40, resultado.TarefasCriadas);
        Assert.Equal(0, resultado.JaAplicadas);
        Assert.Equal(0, resultado.TarefasNoCasamento);
        Assert.False(resultado.ExcedeLimite);
        Assert.Equal(new ProgressoChecklistDto(0, 0, 40, 0, 40), resultado.Progresso);

        await using var contexto = CriarContexto(OrganizacaoA);
        var tarefas = await contexto.TarefasCasamento.Where(tarefa => tarefa.CasamentoId == casamento.Id).ToListAsync();
        Assert.Equal(40, tarefas.Count);
        foreach (var item in modelo.Itens)
        {
            var tarefa = Assert.Single(tarefas, atual => atual.OrigemModeloItemId == item.Id);
            Assert.Equal(DataCasamento.AddDays(-item.DiasAntesDoCasamento), tarefa.Prazo);
            Assert.Equal(item.Titulo, tarefa.Titulo);
            Assert.Equal(item.Responsavel, tarefa.Responsavel.ToString());
            Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
            Assert.Equal(OrganizacaoA.OrganizacaoId, tarefa.OrganizacaoId);
            Assert.Equal(OrganizacaoA.UsuarioId, tarefa.CriadoPorUsuarioId);
        }

        var lista = await ClienteTarefas.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.All(lista.Tarefas, tarefa => Assert.True(tarefa.GeradaDeModelo));
    }

    [Fact]
    public async Task Reaplicar_NaoDeveDuplicarEDeveCriarSoItensNovos()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, QuarentaPrazos());
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);

        var segunda = await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);

        Assert.Equal(0, segunda.TarefasCriadas);
        Assert.Equal(40, segunda.JaAplicadas);
        Assert.Equal(40, segunda.TarefasNoCasamento);

        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem("Item novo", 10));
        var previa = (await OrganizacaoA.Cliente.GetFromJsonAsync<AplicacaoModeloChecklistDto>(RotaPrevia(casamento.Id, modelo.Id)))!;
        Assert.Equal(1, previa.TarefasCriadas);
        Assert.Equal(40, previa.JaAplicadas);

        var terceira = await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);
        Assert.Equal(1, terceira.TarefasCriadas);

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(41, await contexto.TarefasCasamento.CountAsync(tarefa => tarefa.CasamentoId == casamento.Id));
    }

    [Fact]
    public async Task Aplicar_Concorrente_NaoDeveDuplicar()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 180, 90, 30]);

        var respostas = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => AplicarAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id)));

        Assert.All(respostas, resposta => Assert.Contains(resposta.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(4, await contexto.TarefasCasamento.CountAsync(tarefa => tarefa.CasamentoId == casamento.Id));
    }

    [Fact]
    public async Task Previa_NaoDeveGravar()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);

        var previa = (await OrganizacaoA.Cliente.GetFromJsonAsync<AplicacaoModeloChecklistDto>(RotaPrevia(casamento.Id, modelo.Id)))!;

        Assert.Equal(2, previa.TarefasCriadas);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.False(await contexto.TarefasCasamento.AnyAsync());
    }

    [Fact]
    public async Task Aplicar_AlemDoLimite_DeveRetornar422SemCriarNada()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var agora = DateTimeOffset.UtcNow;
            contexto.TarefasCasamento.AddRange(Enumerable.Range(1, 480).Select(numero =>
                TarefaCasamento.Criar(casamento.Id, new DadosTarefa($"Tarefa {numero}", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, null), null, agora)));
            await contexto.SaveChangesAsync();
        }

        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, Enumerable.Range(1, 30).Select(dias => dias * 10));
        var previa = (await OrganizacaoA.Cliente.GetFromJsonAsync<AplicacaoModeloChecklistDto>(RotaPrevia(casamento.Id, modelo.Id)))!;
        Assert.True(previa.ExcedeLimite);
        Assert.Equal(480, previa.TarefasNoCasamento);

        var resposta = await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = await resposta.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(MensagensChecklist.LimiteTarefas(480, 30), problema!.Detail);
        await using var verificacao = CriarContexto(OrganizacaoA);
        Assert.Equal(480, await verificacao.TarefasCasamento.CountAsync(tarefa => tarefa.CasamentoId == casamento.Id));
    }

    [Fact]
    public async Task CasamentoArquivado_DeveBloquearAplicacaoERecalculoCom422()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365]);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamento.Id}/arquivar", null)).StatusCode);

        var respostas = new[]
        {
            await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id),
            await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null),
        };

        foreach (var resposta in respostas)
        {
            Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
            var problema = await resposta.Content.ReadFromJsonAsync<ProblemDetails>();
            Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, problema!.Detail);
        }

        var checklist = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(checklist.CasamentoArquivado);
    }

    [Fact]
    public async Task Aplicar_CasamentoEmCimaDaHora_DeveGerarTarefasAtrasadas()
    {
        var hoje = ClienteCasamentos.HojeEmSaoPaulo();
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente, hoje.AddDays(20));
        var sugerido = Assert.Single(await ListarModelosAsync(OrganizacaoA.Cliente));

        var resultado = await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);

        Assert.Equal(ModeloChecklistSugerido.Itens.Count, resultado.TarefasCriadas);
        Assert.Equal(ModeloChecklistSugerido.Itens.Count, resultado.NascemAtrasadas);
        var checklist = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.All(checklist.Tarefas, tarefa => Assert.True(tarefa.Atrasada));
        Assert.Equal(0, checklist.PrazosDesatualizados);
    }

    [Fact]
    public async Task Percentual_DeveConsiderarConcluidasSobreNaoCanceladasDoChecklist()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, Enumerable.Range(1, 10).Select(dias => dias * 20));
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);
        await ClienteTarefas.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var tarefas = (await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id)).Tarefas;

        foreach (var tarefa in tarefas.Take(4))
        {
            Assert.Equal(HttpStatusCode.OK, (await ClienteTarefas.AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, tarefa.Id, "Concluida")).StatusCode);
        }

        foreach (var tarefa in tarefas.Skip(4).Take(2))
        {
            Assert.Equal(HttpStatusCode.OK, (await ClienteTarefas.AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, tarefa.Id, "Cancelada")).StatusCode);
        }

        var checklist = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(new ProgressoChecklistDto(50, 4, 8, 2, 10), checklist.Progresso);
        Assert.Equal(10, checklist.Tarefas.Count);
        Assert.Equal(DataCasamento, checklist.DataCasamento);

        var dto = (await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casamento.Id}"))!;
        Assert.Equal(50, dto.PercentualChecklist);
    }

    [Fact]
    public async Task CasamentoSemChecklist_DeveTerPercentualNulo()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);

        var dto = (await OrganizacaoA.Cliente.GetFromJsonAsync<CasamentoDto>($"{ClienteCasamentos.Rota}/{casamento.Id}"))!;
        var checklist = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Null(dto.PercentualChecklist);
        Assert.Null(checklist.Progresso.Percentual);
        Assert.Empty(checklist.Tarefas);
    }

    [Fact]
    public async Task MudarData_DeveOferecerERecalcularSoAbertasAposConfirmacao()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 180, 90, 30]);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);
        var tarefas = (await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id)).Tarefas;
        var concluida = tarefas[0];
        await ClienteTarefas.AlterarStatusAsync(OrganizacaoA.Cliente, casamento.Id, concluida.Id, "Concluida");
        Assert.Equal(0, (await OrganizacaoA.Cliente.GetFromJsonAsync<RecalculoPrazosDto>(RotaRecalculo(casamento.Id)))!.Tarefas);

        var novaData = DataCasamento.AddDays(45);
        var atualizacao = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{ClienteCasamentos.Rota}/{casamento.Id}",
            ClienteCasamentos.CorpoValido(data: ClienteTarefas.Data(novaData)));
        Assert.Equal(HttpStatusCode.OK, atualizacao.StatusCode);

        var semRecalculo = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(3, semRecalculo.PrazosDesatualizados);
        Assert.Equal(tarefas.Select(tarefa => tarefa.Prazo), semRecalculo.Tarefas.Select(tarefa => tarefa.Prazo));

        var consulta = (await OrganizacaoA.Cliente.GetFromJsonAsync<RecalculoPrazosDto>(RotaRecalculo(casamento.Id)))!;
        Assert.Equal(3, consulta.Tarefas);

        var recalculo = await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null);
        Assert.Equal(HttpStatusCode.OK, recalculo.StatusCode);
        Assert.Equal(3, (await recalculo.Content.ReadFromJsonAsync<RecalculoPrazosDto>())!.Tarefas);

        var itens = modelo.Itens.ToDictionary(item => item.Titulo, item => item.DiasAntesDoCasamento);
        var depois = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(0, depois.PrazosDesatualizados);
        foreach (var tarefa in depois.Tarefas)
        {
            var esperado = tarefa.Id == concluida.Id ? concluida.Prazo : novaData.AddDays(-itens[tarefa.Titulo]);
            Assert.Equal(esperado, tarefa.Prazo);
        }

        Assert.Equal(0, (await (await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null)).Content.ReadFromJsonAsync<RecalculoPrazosDto>())!.Tarefas);
    }

    [Fact]
    public async Task ExcluirItemDoModelo_DeveManterATarefaSemVinculo()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);
        var removido = modelo.Itens[0];

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaItem(modelo.Id, removido.Id))).StatusCode);

        var lista = await ClienteTarefas.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(2, lista.Tarefas.Count);
        Assert.False(Assert.Single(lista.Tarefas, tarefa => tarefa.Titulo == removido.Titulo).GeradaDeModelo);
        var checklist = await ObterChecklistAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(1, checklist.Progresso.Total);
    }

    [Fact]
    public async Task ExcluirModelo_DeveManterAsTarefasGeradas()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modelo = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, modelo.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaModelo(modelo.Id))).StatusCode);

        var lista = await ClienteTarefas.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(2, lista.Tarefas.Count);
        Assert.All(lista.Tarefas, tarefa => Assert.False(tarefa.GeradaDeModelo));
    }

    [Fact]
    public async Task ModeloOuCasamentoInexistente_DeveRetornar404()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);

        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, Guid.NewGuid()));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(RotaChecklist(Guid.NewGuid())));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(RotaPrevia(casamento.Id, Guid.NewGuid())));
    }

    [Fact]
    public async Task Aplicar_SemModelo_DeveRetornar400()
    {
        var casamento = await CriarCasamentoAsync(OrganizacaoA.Cliente);

        var semCorpo = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaAplicacoes(casamento.Id), new { });
        var vazio = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaAplicacoes(casamento.Id), new { modeloId = Guid.Empty });

        Assert.Equal(HttpStatusCode.BadRequest, semCorpo.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, vazio.StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_NaoDeveAplicarNemVerChecklistAlheio()
    {
        var casamentoA = await CriarCasamentoAsync(OrganizacaoA.Cliente);
        var modeloA = await CriarModeloComItensAsync(OrganizacaoA.Cliente, [365, 30]);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamentoA.Id, modeloA.Id);
        var casamentoB = await CriarCasamentoAsync(OrganizacaoB.Cliente, nome: "Beatriz");
        var modeloB = await CriarModeloComItensAsync(OrganizacaoB.Cliente, [90]);

        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, casamentoB.Id, modeloA.Id));
        await AssertNaoEncontradoAsync(await AplicarAsync(OrganizacaoB.Cliente, casamentoA.Id, modeloB.Id));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaChecklist(casamentoA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(casamentoB.Id, modeloA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaRecalculo(casamentoA.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsync(RotaRecalculo(casamentoA.Id), null));

        await using var contexto = CriarContexto(OrganizacaoB);
        Assert.False(await contexto.TarefasCasamento.AnyAsync());
        var checklistA = await ObterChecklistAsync(OrganizacaoA.Cliente, casamentoA.Id);
        Assert.Equal(2, checklistA.Tarefas.Count);
    }
}
