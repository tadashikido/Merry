using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class DuplicacaoCronogramaApiTestes : IsolamentoOrganizacaoTestesBase
{
    public DuplicacaoCronogramaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static object CorpoDuplicacao(string? horario, bool copiarFornecedores, bool copiarCronograma = true)
    {
        return new
        {
            nomePrimeiraPessoa = "Carla",
            nomeSegundaPessoa = "Diego",
            data = "2028-05-13",
            horario,
            localCerimonia = "Igreja Nossa Senhora",
            localRecepcao = "Casa Verde",
            copiarTarefas = false,
            copiarFornecedores,
            copiarCronograma,
        };
    }

    private async Task<(Guid OrigemId, Guid VinculoId)> MontarOrigemAsync()
    {
        var origem = await ClienteEventos.CriarAsync(
            OrganizacaoA.Cliente,
            ClienteEventos.CorpoValido(horario: "16:00", localCerimonia: "Capela São José", localRecepcao: "Espaço Jardim"));
        var vinculo = await ClienteCronograma.CriarVinculoAsync(OrganizacaoA.Cliente, origem.Id, "Coral Harmonia");
        await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            origem.Id,
            ClienteCronograma.Corpo("Making of", "15:00", 60, local: "Hotel Fasano", responsavel: "Ana", notasInternas: "Pagamento em dinheiro."));
        await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            origem.Id,
            ClienteCronograma.Corpo("Cortejo", "16:30", 15, local: "capela são josé", fornecedorEventoId: vinculo));
        await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            origem.Id,
            ClienteCronograma.Corpo("Pista", "23:30", 120, local: "Espaço Jardim", responsavel: "DJ"));
        return (origem.Id, vinculo);
    }

    [Fact]
    public async Task Previa_DeveContarItensDoCronograma()
    {
        var (origemId, _) = await MontarOrigemAsync();

        var previa = await OrganizacaoA.Cliente.GetFromJsonAsync<PreviaDuplicacaoDto>($"/api/eventos/{origemId}/duplicacao/previa");

        Assert.Equal(3, previa!.ItensCronograma);
    }

    [Fact]
    public async Task Duplicar_ComHorarios_DeveManterDistanciaDaCerimoniaSemNotasEComFornecedorCopiado()
    {
        var (origemId, vinculoOrigem) = await MontarOrigemAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync($"/api/eventos/{origemId}/duplicacao", CorpoDuplicacao("17:00", copiarFornecedores: true));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.Equal(3, resultado.ItensCronogramaCopiados);
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, resultado.Evento.Id);
        Assert.Equal(["Making of", "Cortejo", "Pista"], cronograma.Itens.Select(item => item.Atividade));
        Assert.Equal(["16:00", "17:30", "00:30"], cronograma.Itens.Select(item => item.Inicio));
        Assert.Equal("DiaSeguinte", cronograma.Itens[2].Dia);
        Assert.Equal(new DateOnly(2028, 5, 14), cronograma.Itens[2].Data);
        Assert.Equal(["Hotel Fasano", "Igreja Nossa Senhora", "Casa Verde"], cronograma.Itens.Select(item => item.Local));
        Assert.All(cronograma.Itens, item => Assert.Null(item.NotasInternas));
        Assert.All(cronograma.Itens, item => Assert.Equal("Previsto", item.Status));
        var fornecedor = cronograma.Itens[1].Fornecedor;
        Assert.NotNull(fornecedor);
        Assert.NotEqual(vinculoOrigem, fornecedor!.FornecedorEventoId);
        Assert.Equal("Coral Harmonia", fornecedor.NomeEmpresa);

        var origem = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, origemId);
        Assert.Equal("Pagamento em dinheiro.", origem.Itens[0].NotasInternas);
        Assert.Equal(vinculoOrigem, origem.Itens[1].Fornecedor!.FornecedorEventoId);
    }

    [Fact]
    public async Task Duplicar_SemHorarioNoNovoESemFornecedores_DeveManterHorariosESemVinculo()
    {
        var (origemId, _) = await MontarOrigemAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync($"/api/eventos/{origemId}/duplicacao", CorpoDuplicacao(null, copiarFornecedores: false));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, resultado.Evento.Id);
        Assert.Equal(["15:00", "16:30", "23:30"], cronograma.Itens.Select(item => item.Inicio));
        Assert.All(cronograma.Itens, item => Assert.Null(item.Fornecedor));
        Assert.Null(cronograma.HorarioCerimonia);
    }

    [Fact]
    public async Task Duplicar_SemOpcaoCronograma_NaoDeveCopiarItens()
    {
        var (origemId, _) = await MontarOrigemAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            $"/api/eventos/{origemId}/duplicacao",
            CorpoDuplicacao("17:00", copiarFornecedores: true, copiarCronograma: false));

        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.Equal(0, resultado.ItensCronogramaCopiados);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(0, await contexto.ItensCronograma.CountAsync(item => item.EventoId == resultado.Evento.Id));
        Assert.Equal(StatusItemCronograma.Previsto, (await contexto.ItensCronograma.FirstAsync(item => item.EventoId == origemId)).Status);
    }
}
