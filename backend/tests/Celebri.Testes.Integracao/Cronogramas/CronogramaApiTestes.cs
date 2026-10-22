using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Cronogramas;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Testes.Integracao.Banco;
using Casamento.Testes.Integracao.Casamentos;
using Casamento.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoCasal = Casamento.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;

namespace Casamento.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class CronogramaApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private static readonly DateOnly DataCasamento = new(2027, 5, 15);

    private readonly List<HttpClient> _clientesCasal = [];

    public CronogramaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesCasal)
        {
            cliente.Dispose();
        }
    }

    private async Task<HttpClient> CriarClienteCasalAsync(Guid casamentoId)
    {
        var email = ClienteAcessoCasal.EmailCasalUnico();
        await ClienteAcessoCasal.ConvidarComSucessoAsync(OrganizacaoA.Cliente, casamentoId, email);
        var aceite = await ClienteAcessoCasal.AceitarAsync(ClienteAnonimo, ClienteAcessoCasal.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesCasal.Add(cliente);
        return cliente;
    }

    private static async Task<string?> CampoDoProblemaAsync(HttpResponseMessage resposta)
    {
        var problema = (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
        return problema.Extensions.TryGetValue("campo", out var campo) ? campo?.ToString() : null;
    }

    [Fact]
    public async Task Criar_DeveRetornar201ComDataTerminoELocation()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(casamento.Id), ClienteCronograma.Corpo());

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var item = (await resposta.Content.ReadFromJsonAsync<ItemCronogramaDto>())!;
        Assert.Equal(ClienteCronograma.Rota(casamento.Id, item.Id), resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("DiaDoCasamento", item.Dia);
        Assert.Equal(DataCasamento, item.Data);
        Assert.Equal("16:30", item.Inicio);
        Assert.Equal("17:15", item.Termino);
        Assert.False(item.TerminaEmOutroDia);
        Assert.Equal("Previsto", item.Status);
        Assert.Equal(0, item.MinutosDesdeCerimonia);
        Assert.Equal("Celebrante cobra hora extra.", item.NotasInternas);
        Assert.Empty(item.Conflitos);
    }

    [Fact]
    public async Task Listar_DeveOrdenarPorDiaEHorarioComVesperaEDiaSeguinte()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Pista de dança", "21:30", 270, responsavel: "DJ"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Saída dos noivos", "01:30", null, "DiaSeguinte", responsavel: null));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Montagem", "18:00", 240, "Vespera", responsavel: "Carlos"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Making of", "13:00", 120, responsavel: "Ana"));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Equal(["Montagem", "Making of", "Pista de dança", "Saída dos noivos"], cronograma.Itens.Select(item => item.Atividade));
        Assert.Equal(DataCasamento.AddDays(-1), cronograma.Itens[0].Data);
        Assert.Equal(DataCasamento.AddDays(1), cronograma.Itens[3].Data);
        Assert.True(cronograma.Itens[2].TerminaEmOutroDia);
        Assert.Equal("02:00", cronograma.Itens[2].Termino);
        Assert.Equal(-210, cronograma.Itens[1].MinutosDesdeCerimonia);
        Assert.Equal("16:30", cronograma.HorarioCerimonia);
        Assert.Equal("Capela São José", cronograma.LocalCerimonia);
        Assert.False(cronograma.SomenteLeitura);
        Assert.Equal(0, cronograma.ItensComConflito);
    }

    [Fact]
    public async Task Listar_MesmoResponsavelSobreposto_DeveSinalizarConflitoSemBloquear()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var cerimonia = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var retoque = await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            casamento.Id,
            ClienteCronograma.Corpo("Retoque da noiva", "17:00", 20, responsavel: "  fernanda "));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Equal(2, cronograma.ItensComConflito);
        var conflitoCerimonia = Assert.Single(cronograma.Itens.Single(item => item.Id == cerimonia.Id).Conflitos);
        Assert.Equal(retoque.Id, conflitoCerimonia.ItemId);
        Assert.Equal("Responsavel", conflitoCerimonia.Motivo);
        Assert.Equal("Retoque da noiva", conflitoCerimonia.Atividade);
        Assert.Equal(cerimonia.Id, Assert.Single(cronograma.Itens.Single(item => item.Id == retoque.Id).Conflitos).ItemId);
    }

    [Fact]
    public async Task Listar_MesmoFornecedorEmHorariosEncostados_NaoDeveSinalizarConflito()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, casamento.Id, "Coral Harmonia");
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Passagem de som", "16:00", 30, responsavel: null, fornecedorCasamentoId: vinculo));
        var cerimonia = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo("Cerimônia", "16:30", 30, responsavel: null, fornecedorCasamentoId: vinculo));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);

        Assert.Equal(0, cronograma.ItensComConflito);
        Assert.Equal("Coral Harmonia", cronograma.Itens.Single(item => item.Id == cerimonia.Id).Fornecedor!.NomeEmpresa);
        Assert.Contains(cronograma.FornecedoresDisponiveis, fornecedor => fornecedor.FornecedorCasamentoId == vinculo);
    }

    [Theory]
    [InlineData(null, "Cerimônia", "Inicio")]
    [InlineData("25:00", "Cerimônia", "Inicio")]
    [InlineData("16:30", "", "Atividade")]
    public async Task Criar_CamposObrigatoriosInvalidos_DeveRetornar400SemGravar(string? inicio, string atividade, string campo)
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id),
            ClienteCronograma.Corpo(atividade, inicio));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var problema = (await resposta.Content.ReadFromJsonAsync<ValidationProblemDetails>())!;
        Assert.Contains(problema.Errors.Keys, chave => chave.Equals(campo, StringComparison.OrdinalIgnoreCase));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens);
    }

    [Fact]
    public async Task Criar_DuracaoForaDaFaixa_DeveRetornar400()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(casamento.Id), ClienteCronograma.Corpo(duracaoMinutos: 2));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_FornecedorDeOutroCasamento_DeveRetornar422NoCampo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculoDoOutro = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, outro.Id, "Banda Outra");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id),
            ClienteCronograma.Corpo(fornecedorCasamentoId: vinculoDoOutro));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal("fornecedorCasamentoId", await CampoDoProblemaAsync(resposta));
    }

    [Fact]
    public async Task Criar_FornecedorCancelado_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var cancelado = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, casamento.Id, "Banda Cancelada", "Cancelado");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id),
            ClienteCronograma.Corpo(fornecedorCasamentoId: cancelado));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.DoesNotContain(
            (await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).FornecedoresDisponiveis,
            fornecedor => fornecedor.FornecedorCasamentoId == cancelado);
    }

    [Fact]
    public async Task RemoverVinculoDoFornecedor_DeveManterItemSemFornecedor()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, casamento.Id, "Coral Harmonia");
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id, ClienteCronograma.Corpo(fornecedorCasamentoId: vinculo));

        var remocao = await OrganizacaoA.Cliente.DeleteAsync($"/api/casamentos/{casamento.Id}/fornecedores/{vinculo}");

        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        var mantido = Assert.Single(cronograma.Itens);
        Assert.Equal(item.Id, mantido.Id);
        Assert.Null(mantido.Fornecedor);
        Assert.Equal("Fernanda", mantido.Responsavel);
    }

    [Fact]
    public async Task Atualizar_DeveAlterarCamposEIgnorarStatusDoCorpo()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(casamento.Id, item.Id), new
        {
            dia = "DiaDoCasamento",
            inicio = "17:00",
            duracaoMinutos = (int?)null,
            atividade = "Entrada dos noivos",
            local = "Espaço Jardim",
            responsavel = "Ana",
            fornecedorCasamentoId = (Guid?)null,
            instrucoes = (string?)null,
            notasInternas = (string?)null,
            status = "Concluido",
            casamentoId = Guid.NewGuid(),
        });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<ItemCronogramaDto>())!;
        Assert.Equal("Entrada dos noivos", atualizado.Atividade);
        Assert.Equal("17:00", atualizado.Inicio);
        Assert.Null(atualizado.Termino);
        Assert.Equal("Previsto", atualizado.Status);
        Assert.Equal(30, atualizado.MinutosDesdeCerimonia);
        await using var contexto = CriarContexto(OrganizacaoA);
        var salvo = await contexto.ItensCronograma.AsNoTracking().SingleAsync(atual => atual.Id == item.Id);
        Assert.Equal(casamento.Id, salvo.CasamentoId);
        Assert.Equal("ana", salvo.ResponsavelChave);
    }

    [Fact]
    public async Task Remover_DeveRetornar204EApagar()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(casamento.Id, item.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(ClienteCronograma.Rota(casamento.Id, item.Id)));
    }

    [Fact]
    public async Task ItemDeOutroCasamentoDaMesmaOrganizacao_DeveRetornar404()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(ClienteCronograma.Rota(outro.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(outro.Id, item.Id)));
    }

    [Fact]
    public async Task CasamentoArquivado_DeveRetornar422NasEscritasEPermitirLeitura()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"/api/casamentos/{casamento.Id}/arquivar", null)).StatusCode);

        var criar = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(casamento.Id), ClienteCronograma.Corpo());
        var atualizar = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(casamento.Id, item.Id), ClienteCronograma.Corpo());
        var remover = await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(casamento.Id, item.Id));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, criar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, atualizar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, remover.StatusCode);
        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, (await criar.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.True(cronograma.Arquivado);
        Assert.True(cronograma.SomenteLeitura);
        Assert.Single(cronograma.Itens);
    }

    [Fact]
    public async Task Criar_AcimaDoLimite_DeveRetornar422()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var agora = DateTimeOffset.UtcNow;
            contexto.ItensCronograma.AddRange(Enumerable.Range(0, ItemCronograma.LimitePorCasamento).Select(indice => ItemCronograma.Criar(
                casamento.Id,
                new DadosItemCronograma(DiaCronograma.DiaDoCasamento, new TimeOnly(indice % 24, indice % 60), null, $"Item {indice}", null, null, null, null, null),
                null,
                agora)));
            await contexto.SaveChangesAsync();
        }

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(casamento.Id), ClienteCronograma.Corpo());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensCronograma.LimitePorCasamento, (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
    }

    [Fact]
    public async Task Casal_DeveVerSemNotasInternasERecebe403NasEscritas()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, casamento.Id, "Coral Harmonia");
        var casal = await CriarClienteCasalAsync(casamento.Id);

        var cronograma = await ClienteCronograma.ListarAsync(casal, casamento.Id);
        var unico = await casal.GetFromJsonAsync<ItemCronogramaDto>(ClienteCronograma.Rota(casamento.Id, item.Id));
        var criar = await casal.PostAsJsonAsync(ClienteCronograma.Rota(casamento.Id), ClienteCronograma.Corpo());
        var atualizar = await casal.PutAsJsonAsync(ClienteCronograma.Rota(casamento.Id, item.Id), ClienteCronograma.Corpo());
        var remover = await casal.DeleteAsync(ClienteCronograma.Rota(casamento.Id, item.Id));

        Assert.True(cronograma.SomenteLeitura);
        Assert.Null(Assert.Single(cronograma.Itens).NotasInternas);
        Assert.Equal("Chegar 15 minutos antes.", cronograma.Itens[0].Instrucoes);
        Assert.Empty(cronograma.FornecedoresDisponiveis);
        Assert.Null(unico!.NotasInternas);
        Assert.Equal(HttpStatusCode.Forbidden, criar.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, atualizar.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, remover.StatusCode);
    }

    [Fact]
    public async Task Casal_CronogramaDeOutroCasamento_DeveRetornar404()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, outro.Id);
        var casal = await CriarClienteCasalAsync(casamento.Id);

        await AssertNaoEncontradoAsync(await casal.GetAsync(ClienteCronograma.Rota(outro.Id)));
    }

    [Fact]
    public async Task Anonimo_DeveRetornar401()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ClienteAnonimo.GetAsync(ClienteCronograma.Rota(casamento.Id));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }
}
