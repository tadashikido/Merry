using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class CronogramaApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private static readonly DateOnly DataEvento = new(2027, 5, 15);

    private readonly List<HttpClient> _clientesAnfitriao = [];

    public CronogramaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientesAnfitriao)
        {
            cliente.Dispose();
        }
    }

    private async Task<HttpClient> CriarClienteAnfitriaoAsync(Guid eventoId)
    {
        var email = ClienteAcessoAnfitriao.EmailAnfitriaoUnico();
        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, eventoId, email);
        var aceite = await ClienteAcessoAnfitriao.AceitarAsync(ClienteAnonimo, ClienteAcessoAnfitriao.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;
        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesAnfitriao.Add(cliente);
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(evento.Id), ClienteCronograma.Corpo());

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var item = (await resposta.Content.ReadFromJsonAsync<ItemCronogramaDto>())!;
        Assert.Equal(ClienteCronograma.Rota(evento.Id, item.Id), resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("DiaDoEvento", item.Dia);
        Assert.Equal(DataEvento, item.Data);
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Pista de dança", "21:30", 270, responsavel: "DJ"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Saída dos anfitriões", "01:30", null, "DiaSeguinte", responsavel: null));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Montagem", "18:00", 240, "Vespera", responsavel: "Carlos"));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Making of", "13:00", 120, responsavel: "Ana"));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id);

        Assert.Equal(["Montagem", "Making of", "Pista de dança", "Saída dos anfitriões"], cronograma.Itens.Select(item => item.Atividade));
        Assert.Equal(DataEvento.AddDays(-1), cronograma.Itens[0].Data);
        Assert.Equal(DataEvento.AddDays(1), cronograma.Itens[3].Data);
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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var cerimonia = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        var retoque = await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            evento.Id,
            ClienteCronograma.Corpo("Retoque da noiva", "17:00", 20, responsavel: "  fernanda "));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id);

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
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, evento.Id, "Coral Harmonia");
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Passagem de som", "16:00", 30, responsavel: null, fornecedorEventoId: vinculo));
        var cerimonia = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo("Cerimônia", "16:30", 30, responsavel: null, fornecedorEventoId: vinculo));

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id);

        Assert.Equal(0, cronograma.ItensComConflito);
        Assert.Equal("Coral Harmonia", cronograma.Itens.Single(item => item.Id == cerimonia.Id).Fornecedor!.NomeEmpresa);
        Assert.Contains(cronograma.FornecedoresDisponiveis, fornecedor => fornecedor.FornecedorEventoId == vinculo);
    }

    [Theory]
    [InlineData(null, "Cerimônia", "Inicio")]
    [InlineData("25:00", "Cerimônia", "Inicio")]
    [InlineData("16:30", "", "Atividade")]
    public async Task Criar_CamposObrigatoriosInvalidos_DeveRetornar400SemGravar(string? inicio, string atividade, string campo)
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(evento.Id),
            ClienteCronograma.Corpo(atividade, inicio));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var problema = (await resposta.Content.ReadFromJsonAsync<ValidationProblemDetails>())!;
        Assert.Contains(problema.Errors.Keys, chave => chave.Equals(campo, StringComparison.OrdinalIgnoreCase));
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id)).Itens);
    }

    [Fact]
    public async Task Criar_DuracaoForaDaFaixa_DeveRetornar400()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(evento.Id), ClienteCronograma.Corpo(duracaoMinutos: 2));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_FornecedorDeOutroEvento_DeveRetornar422NoCampo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var vinculoDoOutro = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, outro.Id, "Banda Outra");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(evento.Id),
            ClienteCronograma.Corpo(fornecedorEventoId: vinculoDoOutro));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal("fornecedorEventoId", await CampoDoProblemaAsync(resposta));
    }

    [Fact]
    public async Task Criar_FornecedorCancelado_DeveRetornar422()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var cancelado = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, evento.Id, "Banda Cancelada", "Cancelado");

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            ClienteCronograma.Rota(evento.Id),
            ClienteCronograma.Corpo(fornecedorEventoId: cancelado));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.DoesNotContain(
            (await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id)).FornecedoresDisponiveis,
            fornecedor => fornecedor.FornecedorEventoId == cancelado);
    }

    [Fact]
    public async Task RemoverVinculoDoFornecedor_DeveManterItemSemFornecedor()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, evento.Id, "Coral Harmonia");
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteCronograma.Corpo(fornecedorEventoId: vinculo));

        var remocao = await OrganizacaoA.Cliente.DeleteAsync($"/api/eventos/{evento.Id}/fornecedores/{vinculo}");

        Assert.Equal(HttpStatusCode.NoContent, remocao.StatusCode);
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        var mantido = Assert.Single(cronograma.Itens);
        Assert.Equal(item.Id, mantido.Id);
        Assert.Null(mantido.Fornecedor);
        Assert.Equal("Fernanda", mantido.Responsavel);
    }

    [Fact]
    public async Task Atualizar_DeveAlterarCamposEIgnorarStatusDoCorpo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(evento.Id, item.Id), new
        {
            dia = "DiaDoEvento",
            inicio = "17:00",
            duracaoMinutos = (int?)null,
            atividade = "Entrada dos anfitriões",
            local = "Espaço Jardim",
            responsavel = "Ana",
            fornecedorEventoId = (Guid?)null,
            instrucoes = (string?)null,
            notasInternas = (string?)null,
            status = "Concluido",
            eventoId = Guid.NewGuid(),
        });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<ItemCronogramaDto>())!;
        Assert.Equal("Entrada dos anfitriões", atualizado.Atividade);
        Assert.Equal("17:00", atualizado.Inicio);
        Assert.Null(atualizado.Termino);
        Assert.Equal("Previsto", atualizado.Status);
        Assert.Equal(30, atualizado.MinutosDesdeCerimonia);
        await using var contexto = CriarContexto(OrganizacaoA);
        var salvo = await contexto.ItensCronograma.AsNoTracking().SingleAsync(atual => atual.Id == item.Id);
        Assert.Equal(evento.Id, salvo.EventoId);
        Assert.Equal("ana", salvo.ResponsavelChave);
    }

    [Fact]
    public async Task Remover_DeveRetornar204EApagar()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(evento.Id, item.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(ClienteCronograma.Rota(evento.Id, item.Id)));
    }

    [Fact]
    public async Task ItemDeOutroEventoDaMesmaOrganizacao_DeveRetornar404()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);

        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(ClienteCronograma.Rota(outro.Id, item.Id)));
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(outro.Id, item.Id)));
    }

    [Fact]
    public async Task EventoArquivado_DeveRetornar422NasEscritasEPermitirLeitura()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"/api/eventos/{evento.Id}/arquivar", null)).StatusCode);

        var criar = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(evento.Id), ClienteCronograma.Corpo());
        var atualizar = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteCronograma.Rota(evento.Id, item.Id), ClienteCronograma.Corpo());
        var remover = await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(evento.Id, item.Id));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, criar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, atualizar.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, remover.StatusCode);
        Assert.Equal(MensagensEvento.ArquivadoSemEdicao, (await criar.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, evento.Id);
        Assert.True(cronograma.Arquivado);
        Assert.True(cronograma.SomenteLeitura);
        Assert.Single(cronograma.Itens);
    }

    [Fact]
    public async Task Criar_AcimaDoLimite_DeveRetornar422()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var agora = DateTimeOffset.UtcNow;
            contexto.ItensCronograma.AddRange(Enumerable.Range(0, ItemCronograma.LimitePorEvento).Select(indice => ItemCronograma.Criar(
                evento.Id,
                new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(indice % 24, indice % 60), null, $"Item {indice}", null, null, null, null, null),
                null,
                agora)));
            await contexto.SaveChangesAsync();
        }

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteCronograma.Rota(evento.Id), ClienteCronograma.Corpo());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(MensagensCronograma.LimitePorEvento, (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
    }

    [Fact]
    public async Task Anfitriao_DeveVerSemNotasInternasERecebe403NasEscritas()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var item = await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, evento.Id);
        await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, evento.Id, "Coral Harmonia");
        var anfitriao = await CriarClienteAnfitriaoAsync(evento.Id);

        var cronograma = await ClienteCronograma.ListarAsync(anfitriao, evento.Id);
        var unico = await anfitriao.GetFromJsonAsync<ItemCronogramaDto>(ClienteCronograma.Rota(evento.Id, item.Id));
        var criar = await anfitriao.PostAsJsonAsync(ClienteCronograma.Rota(evento.Id), ClienteCronograma.Corpo());
        var atualizar = await anfitriao.PutAsJsonAsync(ClienteCronograma.Rota(evento.Id, item.Id), ClienteCronograma.Corpo());
        var remover = await anfitriao.DeleteAsync(ClienteCronograma.Rota(evento.Id, item.Id));

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
    public async Task Anfitriao_CronogramaDeOutroEvento_DeveRetornar404()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var outro = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, outro.Id);
        var anfitriao = await CriarClienteAnfitriaoAsync(evento.Id);

        await AssertNaoEncontradoAsync(await anfitriao.GetAsync(ClienteCronograma.Rota(outro.Id)));
    }

    [Fact]
    public async Task Anonimo_DeveRetornar401()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await ClienteAnonimo.GetAsync(ClienteCronograma.Rota(evento.Id));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }
}
