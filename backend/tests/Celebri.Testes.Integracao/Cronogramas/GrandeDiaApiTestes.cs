using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.CronogramaPublico;
using Celebri.Aplicacao.GrandeDia;
using Celebri.Dominio.Cronogramas;
using Celebri.Infraestrutura.Calendario;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoCasal = Celebri.Testes.Integracao.AcessosCasal.ClienteAcessoCasal;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class GrandeDiaApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private const string NotaInterna = "Pagar saldo de R$ 4.000 em espécie";

    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    private readonly List<HttpClient> _clientes = [];

    public GrandeDiaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public void Dispose()
    {
        foreach (var cliente in _clientes)
        {
            cliente.Dispose();
        }
    }

    private static string Rota(Guid casamentoId)
    {
        return $"/api/casamentos/{casamentoId}/grande-dia";
    }

    private static string RotaConclusao(Guid casamentoId, Guid itemId)
    {
        return $"{Rota(casamentoId)}/itens/{itemId}/conclusao";
    }

    private static (string Dia, string Inicio) Posicao(int minutoAbsoluto)
    {
        var (dia, inicio) = ItemCronograma.DePosicao(minutoAbsoluto);
        return (dia.ToString(), inicio.ToString("HH:mm", CultureInfo.InvariantCulture));
    }

    private static int MinutoAgora()
    {
        var agora = new CalendarioSaoPaulo(TimeProvider.System).Agora();
        return (agora.Hour * 60) + agora.Minute;
    }

    private static async Task<GrandeDiaDto> LerAsync(HttpResponseMessage resposta)
    {
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<GrandeDiaDto>(OpcoesJson))!;
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
        _clientes.Add(cliente);
        return cliente;
    }

    private async Task<(Guid CasamentoId, Guid Agora, Guid Proximo, Guid Passado, Guid Buffet)> CriarDiaAsync(OrganizacaoTeste organizacao)
    {
        var hoje = ClienteCasamentos.HojeEmSaoPaulo().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var casamento = await ClienteCasamentos.CriarAsync(organizacao.Cliente, ClienteCasamentos.CorpoValido(data: hoje));
        var buffet = await ClienteCronograma.CriarVinculoAsync(organizacao.Cliente, casamento.Id, $"Buffet Sabor {Guid.NewGuid():N}", "Contratado");
        var minuto = MinutoAgora();

        var (diaAgora, inicioAgora) = Posicao(minuto - 30);
        var agora = await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Cerimônia", inicioAgora, 120, dia: diaAgora, fornecedorCasamentoId: buffet, notasInternas: NotaInterna));
        var (diaProximo, inicioProximo) = Posicao(minuto + 150);
        var proximo = await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Jantar", inicioProximo, 60, dia: diaProximo, notasInternas: NotaInterna));
        var (diaPassado, inicioPassado) = Posicao(minuto - 300);
        var passado = await ClienteCronograma.CriarAsync(organizacao.Cliente, casamento.Id, ClienteCronograma.Corpo(
            "Montagem", inicioPassado, 60, dia: diaPassado, notasInternas: NotaInterna));

        return (casamento.Id, agora.Id, proximo.Id, passado.Id, buffet);
    }

    [Fact]
    public async Task Consultar_NoDia_DeveTrazerAgoraProximoSemMarcarEContatos()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);

        var resposta = await OrganizacaoA.Cliente.GetAsync(Rota(cenario.CasamentoId));
        var dto = await LerAsync(resposta);

        Assert.Contains("no-store", resposta.Headers.CacheControl?.ToString() ?? string.Empty, StringComparison.Ordinal);
        Assert.Equal("NoDia", dto.Momento.Fase);
        Assert.Equal(0, dto.Momento.DiasParaOCasamento);
        Assert.False(dto.SomenteLeitura);
        Assert.Equal(["Montagem", "Cerimônia", "Jantar"], dto.Itens.Select(item => item.Atividade));
        var porId = dto.Itens.ToDictionary(item => item.Id);
        Assert.Equal("Agora", porId[cenario.Agora].Situacao);
        Assert.Equal("Proximo", porId[cenario.Proximo].Situacao);
        Assert.Equal("SemMarcar", porId[cenario.Passado].Situacao);
        Assert.Equal("Marta", porId[cenario.Agora].Fornecedor!.Contato);
        Assert.Equal("11987654321", porId[cenario.Agora].Fornecedor!.Telefone);
        Assert.Equal(NotaInterna, porId[cenario.Agora].NotasInternas);
    }

    [Fact]
    public async Task Concluir_DevePersistirEReabrirDeveDesfazer()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);

        var concluido = await LerAsync(await OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null));
        var item = concluido.Itens.Single(atual => atual.Id == cenario.Agora);
        Assert.Equal("Feito", item.Situacao);
        Assert.Equal("Concluido", item.Status);
        Assert.NotNull(item.ConcluidoEm);

        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var registro = await contexto.ItensCronograma.SingleAsync(atual => atual.Id == cenario.Agora);
            Assert.Equal(StatusItemCronograma.Concluido, registro.Status);
            Assert.NotNull(registro.ConcluidoEm);
        }

        var reaberto = await LerAsync(await OrganizacaoA.Cliente.DeleteAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora)));
        var itemReaberto = reaberto.Itens.Single(atual => atual.Id == cenario.Agora);
        Assert.Equal("Agora", itemReaberto.Situacao);
        Assert.Null(itemReaberto.ConcluidoEm);

        await using var verificacao = CriarContexto(OrganizacaoA);
        var final = await verificacao.ItensCronograma.SingleAsync(atual => atual.Id == cenario.Agora);
        Assert.Equal(StatusItemCronograma.Previsto, final.Status);
        Assert.Null(final.ConcluidoEm);
    }

    [Fact]
    public async Task Concluir_DuasVezesEmParalelo_DeveSerIdempotente()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        using var segundoAparelho = Fabrica.CriarClienteHttps();
        segundoAparelho.DefaultRequestHeaders.Authorization = OrganizacaoA.Cliente.DefaultRequestHeaders.Authorization;

        var respostas = await Task.WhenAll(
            OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null),
            segundoAparelho.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null));
        var repetida = await OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null);

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.OK, resposta.StatusCode));
        var dto = await LerAsync(repetida);
        Assert.Equal("Feito", dto.Itens.Single(atual => atual.Id == cenario.Agora).Situacao);
    }

    [Fact]
    public async Task Casal_DeveLerSemNotasESemPoderMarcar()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        var casal = await CriarClienteCasalAsync(cenario.CasamentoId);

        var dto = await LerAsync(await casal.GetAsync(Rota(cenario.CasamentoId)));
        var marcar = await casal.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null);
        var reabrir = await casal.DeleteAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora));

        Assert.True(dto.SomenteLeitura);
        Assert.All(dto.Itens, item => Assert.Null(item.NotasInternas));
        Assert.Equal("11987654321", dto.Itens.Single(item => item.Id == cenario.Agora).Fornecedor!.Telefone);
        Assert.Equal(HttpStatusCode.Forbidden, marcar.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, reabrir.StatusCode);
    }

    [Fact]
    public async Task Anonimo_DeveReceber401()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota(cenario.CasamentoId))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null)).StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404SemAlterarOItem()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        var outro = await CriarDiaAsync(OrganizacaoB);

        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoB.Cliente.GetAsync(Rota(cenario.CasamentoId))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoB.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await OrganizacaoB.Cliente.PutAsync(RotaConclusao(outro.CasamentoId, cenario.Agora), null)).StatusCode);

        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(StatusItemCronograma.Previsto, (await contexto.ItensCronograma.SingleAsync(item => item.Id == cenario.Agora)).Status);
    }

    [Fact]
    public async Task CasamentoArquivado_DeveRecusarMarcacaoCom422ESerSomenteLeitura()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{cenario.CasamentoId}/arquivar", null);

        var marcar = await OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Agora), null);
        var dto = await LerAsync(await OrganizacaoA.Cliente.GetAsync(Rota(cenario.CasamentoId)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, marcar.StatusCode);
        Assert.True(dto.Arquivado);
        Assert.True(dto.SomenteLeitura);
    }

    [Fact]
    public async Task Consultar_AntesDoDia_DeveInformarFaseEDiasRestantes()
    {
        var data = ClienteCasamentos.HojeEmSaoPaulo().AddDays(12).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(data: data));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);

        var dto = await LerAsync(await OrganizacaoA.Cliente.GetAsync(Rota(casamento.Id)));

        Assert.Equal("AntesDoDia", dto.Momento.Fase);
        Assert.Equal(12, dto.Momento.DiasParaOCasamento);
        Assert.Equal("Depois", dto.Itens.Single().Situacao);
    }

    [Fact]
    public async Task ConsultaPublica_NoDia_DeveTrazerMomentoESituacoesSemContatosNemIds()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Passado), null);
        var link = await OrganizacaoA.Cliente.PostAsJsonAsync($"/api/casamentos/{cenario.CasamentoId}/cronograma/links", new { tipo = "Fornecedor", fornecedorCasamentoId = cenario.Buffet });
        Assert.Equal(HttpStatusCode.OK, link.StatusCode);
        var token = (await link.Content.ReadFromJsonAsync<LinkCronogramaDto>())!.Token!;

        var resposta = await ClienteAnonimo.PostAsJsonAsync("/api/cronograma-publico/consulta", new { token });
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        foreach (var proibido in new[]
        {
            NotaInterna, "98765", "11987654321", "Marta", "telefone", "contato", "notasInternas",
            cenario.CasamentoId.ToString(), cenario.Agora.ToString(), cenario.Buffet.ToString(),
        })
        {
            Assert.DoesNotContain(proibido, corpo, StringComparison.OrdinalIgnoreCase);
        }

        var dto = JsonSerializer.Deserialize<CronogramaPublicoDto>(corpo, OpcoesJson)!;
        Assert.Equal("NoDia", dto.Momento.Fase);
        Assert.Equal(["Cerimônia"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal("Agora", dto.Itens.Single().Situacao);
        Assert.Null(dto.Itens.Single().ConcluidoEm);
    }

    [Fact]
    public async Task ConsultaPublica_LinkGeral_DeveRefletirFeitosComInstante()
    {
        var cenario = await CriarDiaAsync(OrganizacaoA);
        await OrganizacaoA.Cliente.PutAsync(RotaConclusao(cenario.CasamentoId, cenario.Passado), null);
        var link = await OrganizacaoA.Cliente.PostAsJsonAsync($"/api/casamentos/{cenario.CasamentoId}/cronograma/links", new { tipo = "Geral" });
        var token = (await link.Content.ReadFromJsonAsync<LinkCronogramaDto>())!.Token!;

        var resposta = await ClienteAnonimo.PostAsJsonAsync("/api/cronograma-publico/consulta", new { token });
        var dto = (await resposta.Content.ReadFromJsonAsync<CronogramaPublicoDto>(OpcoesJson))!;

        Assert.Equal(["Feito", "Agora", "Proximo"], dto.Itens.Select(item => item.Situacao));
        Assert.NotNull(dto.Itens[0].ConcluidoEm);
        Assert.Equal("Concluido", dto.Itens[0].Status);
    }
}
