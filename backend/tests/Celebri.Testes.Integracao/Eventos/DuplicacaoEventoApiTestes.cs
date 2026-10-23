using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Checklists;
using Celebri.Testes.Integracao.Convidados;
using Celebri.Testes.Integracao.Isolamento;
using Celebri.Testes.Integracao.Rsvp;
using Celebri.Testes.Integracao.Tarefas;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;

namespace Celebri.Testes.Integracao.Eventos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class DuplicacaoEventoApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private const string ObservacoesOrigem = "Mãe da noiva: (11) 99999-0000. Noiva alérgica a lírios.";
    private const string NomeConvidado = "Carla Souza";
    private const string EmailConvidado = "carla.souza@exemplo.com";
    private static readonly DateOnly DataOrigem = new(2027, 5, 15);
    private static readonly DateOnly NovaData = new(2028, 5, 13);
    private static readonly byte[] PdfValido = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF");

    private readonly List<HttpClient> _clientesAnfitriao = [];

    public DuplicacaoEventoApiTestes(BancoPostgreSqlFixture banco)
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

    private static string RotaDuplicacao(Guid origemId) => $"/api/eventos/{origemId}/duplicacao";

    private static string RotaPrevia(Guid origemId, DateOnly? data = null) =>
        data is { } valor ? $"{RotaDuplicacao(origemId)}/previa?data={ClienteTarefas.Data(valor)}" : $"{RotaDuplicacao(origemId)}/previa";

    private static object Corpo(
        string nomePrimeiraPessoa = "Carla",
        string nomeSegundaPessoa = "Diego",
        string? data = "2028-05-13",
        string? horario = "17:00",
        bool copiarTarefas = true,
        bool copiarFornecedores = true)
    {
        return new
        {
            nomePrimeiraPessoa,
            nomeSegundaPessoa,
            data,
            horario,
            localCerimonia = "Igreja Nossa Senhora",
            localRecepcao = "Casa Verde",
            copiarTarefas,
            copiarFornecedores,
            observacoes = "Não deve ser gravado",
            organizacaoId = OrganizacaoIdInvasor,
        };
    }

    private static readonly Guid OrganizacaoIdInvasor = Guid.NewGuid();

    private sealed record Origem(Guid Id, Guid VinculoContratadoId, Guid FornecedorContratadoId, Guid FornecedorCotacaoId);

    private async Task<Guid> CriarFornecedorAsync(HttpClient cliente, string nome, string categoria = "Buffet")
    {
        var resposta = await cliente.PostAsJsonAsync("/api/fornecedores", new
        {
            categoria,
            nomeEmpresa = nome,
            responsavel = "Marta",
            telefone = "(11) 98765-4321",
            email = (string?)null,
            site = (string?)null,
            instagram = (string?)null,
            observacoes = "Observação da base",
        });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<FornecedorDto>())!.Id;
    }

    private static async Task<Guid> VincularAsync(
        HttpClient cliente,
        Guid eventoId,
        Guid fornecedorId,
        string status,
        decimal orcado,
        decimal? contratado = null)
    {
        var resposta = await cliente.PostAsJsonAsync($"/api/eventos/{eventoId}/fornecedores", new
        {
            fornecedorId,
            servico = "Jantar para 200",
            valorOrcado = orcado,
            valorContratado = contratado,
            status,
            notasInternas = "Comissão de 10% combinada com os anfitriões",
        });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<FornecedorEventoDto>())!.Id;
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

    private async Task<Origem> MontarOrigemCompletaAsync()
    {
        var cliente = OrganizacaoA.Cliente;
        var evento = await ClienteEventos.CriarAsync(
            cliente,
            ClienteEventos.CorpoValido(data: ClienteTarefas.Data(DataOrigem), observacoes: ObservacoesOrigem));

        var convite = await ClienteConvites.CriarAsync(
            cliente,
            evento.Id,
            ClienteConvites.CorpoValido(
                "Família Souza",
                "Família da noiva",
                1,
                ClienteConvites.Pessoa(NomeConvidado, "(11) 98765-4321", EmailConvidado)));
        var restricao = await cliente.PutAsJsonAsync(
            $"{ClienteConvites.Rota(evento.Id, convite.Id)}/convidados/{convite.Convidados[0].Id}/restricao-alimentar",
            new { tipos = new[] { "Vegana" }, consentimentoObtido = true });
        Assert.Equal(HttpStatusCode.OK, restricao.StatusCode);
        await ClienteRsvp.GerarLinkAsync(cliente, evento.Id, convite.Id);
        await CriarClienteAnfitriaoAsync(evento.Id);

        var modelo = await ClienteChecklist.CriarModeloComItensAsync(cliente, [180, 30], "Modelo da duplicação");
        var aplicacao = await ClienteChecklist.AplicarAsync(cliente, evento.Id, modelo.Id);
        Assert.Equal(HttpStatusCode.OK, aplicacao.StatusCode);

        await ClienteTarefas.CriarAsync(cliente, evento.Id, ClienteTarefas.Corpo("Reservar hotel dos padrinhos", prazo: DataOrigem.AddDays(-10)));
        await ClienteTarefas.CriarAsync(cliente, evento.Id, ClienteTarefas.Corpo("Separar playlist", responsavel: "Anfitriao", prazo: null));
        var concluida = await ClienteTarefas.CriarAsync(cliente, evento.Id, ClienteTarefas.Corpo("Degustação do bolo", prazo: DataOrigem.AddDays(-60)));
        Assert.Equal(HttpStatusCode.OK, (await ClienteTarefas.AlterarStatusAsync(cliente, evento.Id, concluida.Id, "Concluida")).StatusCode);
        var cancelada = await ClienteTarefas.CriarAsync(cliente, evento.Id, ClienteTarefas.Corpo("Tarefa descartada"));
        Assert.Equal(HttpStatusCode.OK, (await ClienteTarefas.AlterarStatusAsync(cliente, evento.Id, cancelada.Id, "Cancelada")).StatusCode);

        var buffet = await CriarFornecedorAsync(cliente, "Buffet São João");
        var vinculoBuffet = await VincularAsync(cliente, evento.Id, buffet, "Contratado", 18_000m, 18_500m);
        using (var formulario = new MultipartFormDataContent())
        {
            var arquivo = new ByteArrayContent(PdfValido);
            arquivo.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            formulario.Add(arquivo, "arquivo", "contrato.pdf");
            var envio = await cliente.PutAsync($"/api/eventos/{evento.Id}/fornecedores/{vinculoBuffet}/contrato", formulario);
            Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        }

        var parcela = await cliente.PostAsJsonAsync(
            $"/api/eventos/{evento.Id}/fornecedores/{vinculoBuffet}/parcelas",
            new { valor = 5_000m, vencimento = ClienteTarefas.Data(DataOrigem.AddDays(-90)), observacao = "Sinal" });
        Assert.Equal(HttpStatusCode.Created, parcela.StatusCode);

        var florista = await CriarFornecedorAsync(cliente, "Florista Jardim", "Decoracao");
        await VincularAsync(cliente, evento.Id, florista, "Cotacao", 4_000m);

        var fotografo = await CriarFornecedorAsync(cliente, "Foto Arte", "Fotografia");
        await VincularAsync(cliente, evento.Id, fotografo, "Cancelado", 6_000m);

        var dj = await CriarFornecedorAsync(cliente, "DJ Noite", "Musica");
        await VincularAsync(cliente, evento.Id, dj, "Cotacao", 3_000m);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsync($"/api/fornecedores/{dj}/arquivar", null)).StatusCode);

        return new Origem(evento.Id, vinculoBuffet, buffet, florista);
    }

    [Fact]
    public async Task Previa_DeveContarSemGravarNada()
    {
        var origem = await MontarOrigemCompletaAsync();
        await using var antes = CriarContexto(OrganizacaoA);
        var eventosAntes = await antes.Eventos.CountAsync();

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaPrevia(origem.Id, NovaData));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var previa = (await resposta.Content.ReadFromJsonAsync<PreviaDuplicacaoDto>())!;
        Assert.Equal(origem.Id, previa.Origem.Id);
        Assert.Equal(5, previa.Tarefas);
        Assert.Equal(2, previa.TarefasDoChecklist);
        Assert.Equal(1, previa.TarefasCanceladasIgnoradas);
        Assert.Equal(0, previa.TarefasNascemAtrasadas);
        Assert.Equal(2, previa.Fornecedores);
        Assert.Equal(2, previa.FornecedoresIgnorados);
        await using var depois = CriarContexto(OrganizacaoA);
        Assert.Equal(eventosAntes, await depois.Eventos.CountAsync());
    }

    [Fact]
    public async Task Previa_DataNoPassado_DeveContarTarefasQueNascemAtrasadas()
    {
        var origem = await MontarOrigemCompletaAsync();

        var previa = await OrganizacaoA.Cliente.GetFromJsonAsync<PreviaDuplicacaoDto>(RotaPrevia(origem.Id, new DateOnly(2020, 1, 1)));

        Assert.Equal(4, previa!.TarefasNascemAtrasadas);
    }

    [Fact]
    public async Task Previa_DataForaDaFaixa_DeveRetornar422ComCampoData()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.GetAsync(RotaPrevia(origem.Id, new DateOnly(1999, 12, 31)));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        var problema = (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
        Assert.Equal("data", problema.Extensions["campo"]?.ToString());
    }

    [Fact]
    public async Task Duplicar_DeveCriarEventoComTarefasEFornecedoresRecalculados()
    {
        var origem = await MontarOrigemCompletaAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo());

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.Equal($"/api/eventos/{resultado.Evento.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal(5, resultado.TarefasCopiadas);
        Assert.Equal(2, resultado.FornecedoresCopiados);
        Assert.Equal("Carla", resultado.Evento.NomePrimeiraPessoa);
        Assert.Equal("Diego", resultado.Evento.NomeSegundaPessoa);
        Assert.Equal(NovaData, resultado.Evento.Data);
        Assert.Equal("17:00", resultado.Evento.Horario);
        Assert.Equal(0, resultado.Evento.PercentualChecklist);
        Assert.False(resultado.Evento.Arquivado);

        await using var contexto = CriarContexto(OrganizacaoA);
        var tarefas = await contexto.TarefasEvento.AsNoTracking().Where(t => t.EventoId == resultado.Evento.Id).ToListAsync();
        Assert.Equal(5, tarefas.Count);
        Assert.All(tarefas, tarefa =>
        {
            Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
            Assert.Null(tarefa.ConcluidaEm);
            Assert.Null(tarefa.ConcluidaPor);
            Assert.Null(tarefa.ConcluidaPorUsuarioId);
            Assert.Equal(OrganizacaoA.UsuarioId, tarefa.CriadoPorUsuarioId);
        });
        Assert.DoesNotContain(tarefas, tarefa => tarefa.Titulo == "Tarefa descartada");

        var itens = await contexto.ItensModeloChecklist.AsNoTracking().ToDictionaryAsync(item => item.Id);
        var doChecklist = tarefas.Where(tarefa => tarefa.OrigemModeloItemId is not null).ToList();
        Assert.Equal(2, doChecklist.Count);
        Assert.All(doChecklist, tarefa =>
            Assert.Equal(ItemModeloChecklist.CalcularPrazo(NovaData, itens[tarefa.OrigemModeloItemId!.Value].DiasAntesDoEvento), tarefa.Prazo));
        Assert.Equal(NovaData.AddDays(-10), tarefas.Single(t => t.Titulo == "Reservar hotel dos padrinhos").Prazo);
        Assert.Equal(NovaData.AddDays(-60), tarefas.Single(t => t.Titulo == "Degustação do bolo").Prazo);
        Assert.Null(tarefas.Single(t => t.Titulo == "Separar playlist").Prazo);
        Assert.Equal(ResponsavelTarefa.Anfitriao, tarefas.Single(t => t.Titulo == "Separar playlist").Responsavel);

        var vinculos = await contexto.FornecedoresEvento.AsNoTracking().Where(v => v.EventoId == resultado.Evento.Id).ToListAsync();
        Assert.Equal(
            new[] { origem.FornecedorContratadoId, origem.FornecedorCotacaoId }.Order(),
            vinculos.Select(v => v.FornecedorId).Order());
        Assert.All(vinculos, vinculo =>
        {
            Assert.Equal(StatusFornecedorEvento.Cotacao, vinculo.Status);
            Assert.Null(vinculo.ValorContratado);
            Assert.Null(vinculo.NotasInternas);
            Assert.Null(vinculo.ContratoArquivoId);
            Assert.Equal("Jantar para 200", vinculo.Servico);
        });
        Assert.Equal(18_000m, vinculos.Single(v => v.FornecedorId == origem.FornecedorContratadoId).ValorOrcado);
    }

    [Fact]
    public async Task Duplicar_NaoDeveCopiarDadosPessoaisNemFinanceiros()
    {
        var origem = await MontarOrigemCompletaAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo());
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        var novoId = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!.Evento.Id;

        Assert.DoesNotContain(NomeConvidado, corpo, StringComparison.Ordinal);
        Assert.DoesNotContain(EmailConvidado, corpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("lírios", corpo, StringComparison.Ordinal);

        await using var contexto = CriarContexto(OrganizacaoA);
        var novo = await contexto.Eventos.AsNoTracking().SingleAsync(c => c.Id == novoId);
        Assert.Null(novo.Observacoes);
        Assert.Null(novo.ConvidadosEstimados);
        Assert.Null(novo.DataLimiteRsvp);
        Assert.Equal(OrganizacaoA.OrganizacaoId, novo.OrganizacaoId);
        Assert.Equal(0, await contexto.Convites.CountAsync(c => c.EventoId == novoId));
        Assert.Equal(0, await contexto.Convidados.CountAsync(c => c.EventoId == novoId));
        Assert.Equal(0, await contexto.DadosSensiveisConvidados.CountAsync(d => d.EventoId == novoId));
        Assert.Equal(0, await contexto.AcessosRsvp.CountAsync(a => a.EventoId == novoId));
        Assert.Equal(0, await contexto.AcessosAnfitriao.CountAsync(a => a.EventoId == novoId));
        Assert.Equal(0, await contexto.RegistrosAlteracaoConvites.CountAsync(r => r.EventoId == novoId));
        Assert.Equal(0, await contexto.ParcelasFornecedor.CountAsync(p => p.EventoId == novoId));
        Assert.Equal(0, await contexto.Usuarios.CountAsync(u => u.EventoId == novoId));

        Assert.Equal(1, await contexto.Convites.CountAsync(c => c.EventoId == origem.Id));
        Assert.Equal(1, await contexto.ParcelasFornecedor.CountAsync(p => p.EventoId == origem.Id));
        var vinculoOrigem = await contexto.FornecedoresEvento.AsNoTracking().SingleAsync(v => v.Id == origem.VinculoContratadoId);
        Assert.Equal(StatusFornecedorEvento.Contratado, vinculoOrigem.Status);
        Assert.NotNull(vinculoOrigem.ContratoArquivoId);
    }

    [Fact]
    public async Task Duplicar_OpcoesDesmarcadas_DeveCriarSoOEvento()
    {
        var origem = await MontarOrigemCompletaAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            RotaDuplicacao(origem.Id),
            Corpo(copiarTarefas: false, copiarFornecedores: false));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.Equal(0, resultado.TarefasCopiadas);
        Assert.Equal(0, resultado.FornecedoresCopiados);
        Assert.Null(resultado.Evento.PercentualChecklist);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(0, await contexto.TarefasEvento.CountAsync(t => t.EventoId == resultado.Evento.Id));
        Assert.Equal(0, await contexto.FornecedoresEvento.CountAsync(v => v.EventoId == resultado.Evento.Id));
    }

    [Fact]
    public async Task Duplicar_SoFornecedores_DeveIgnorarTarefas()
    {
        var origem = await MontarOrigemCompletaAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo(copiarTarefas: false));

        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.Equal(0, resultado.TarefasCopiadas);
        Assert.Equal(2, resultado.FornecedoresCopiados);
    }

    [Fact]
    public async Task Duplicar_OrigemArquivada_DeveCriarEventoAtivo()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteTarefas.CriarAsync(OrganizacaoA.Cliente, origem.Id, ClienteTarefas.Corpo(prazo: new DateOnly(2027, 4, 15)));
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{origem.Id}/arquivar", null)).StatusCode);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo());

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<DuplicacaoEventoDto>())!;
        Assert.False(resultado.Evento.Arquivado);
        Assert.Equal(1, resultado.TarefasCopiadas);
        var ativos = await ClienteEventos.ListarAsync(OrganizacaoA.Cliente, "Ativos");
        Assert.Contains(ativos, evento => evento.Id == resultado.Evento.Id);
    }

    [Fact]
    public async Task Duplicar_DadosInvalidos_DeveRetornar400ENaoCriar()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(
            RotaDuplicacao(origem.Id),
            Corpo(nomePrimeiraPessoa: " ", horario: "25:00"));
        var dataForaDaFaixa = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo(data: "1999-01-01"));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var problema = (await resposta.Content.ReadFromJsonAsync<ValidationProblemDetails>())!;
        Assert.Contains(problema.Errors.Keys, chave => chave.Contains("NomePrimeiraPessoa", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(problema.Errors.Keys, chave => chave.Contains("Horario", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.BadRequest, dataForaDaFaixa.StatusCode);
        var problemaData = (await dataForaDaFaixa.Content.ReadFromJsonAsync<ValidationProblemDetails>())!;
        Assert.Contains(problemaData.Errors.Keys, chave => chave.Contains("Data", StringComparison.OrdinalIgnoreCase));
        var eventos = await ClienteEventos.ListarAsync(OrganizacaoA.Cliente, "Ativos");
        Assert.Single(eventos);
    }

    [Fact]
    public async Task Duplicar_OrigemDeOutraOrganizacao_DeveRetornar404ENaoCriar()
    {
        var origem = await MontarOrigemCompletaAsync();

        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo()));
        await AssertNaoEncontradoAsync(await OrganizacaoB.Cliente.GetAsync(RotaPrevia(origem.Id, NovaData)));

        Assert.Empty(await ClienteEventos.ListarAsync(OrganizacaoB.Cliente, "Ativos"));
        await using var contexto = CriarContexto(OrganizacaoB);
        Assert.Equal(0, await contexto.TarefasEvento.CountAsync());
        Assert.Equal(0, await contexto.FornecedoresEvento.CountAsync());
    }

    [Fact]
    public async Task Duplicar_OrigemInexistente_DeveRetornar404()
    {
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(Guid.NewGuid()), Corpo()));
    }

    [Fact]
    public async Task Duplicar_Anfitriao_DeveRetornar403()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var anfitriao = await CriarClienteAnfitriaoAsync(origem.Id);

        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.GetAsync(RotaPrevia(origem.Id))).StatusCode);
    }

    [Fact]
    public async Task Duplicar_Anonimo_DeveRetornar401()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);

        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo())).StatusCode);
    }

    [Fact]
    public async Task Duplicar_FalhaNaGravacao_NaoDeveDeixarEventoParcial()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteTarefas.CriarAsync(OrganizacaoA.Cliente, origem.Id);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente, "Buffet Removido");
        await VincularAsync(OrganizacaoA.Cliente, origem.Id, fornecedor, "Cotacao", 1_000m);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            var restricaoQueBloqueiaCopia = $"ALTER TABLE fornecedores_evento ADD CONSTRAINT ck_teste_bloqueia_copia CHECK (evento_id = '{origem.Id:D}')";
            await contexto.Database.ExecuteSqlRawAsync(restricaoQueBloqueiaCopia);
        }

        try
        {
            var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaDuplicacao(origem.Id), Corpo());

            Assert.False(resposta.IsSuccessStatusCode);
            var eventos = await ClienteEventos.ListarAsync(OrganizacaoA.Cliente, "Ativos");
            Assert.Single(eventos);
            await using var verificacao = CriarContexto(OrganizacaoA);
            Assert.Equal(1, await verificacao.TarefasEvento.CountAsync());
        }
        finally
        {
            await using var contexto = CriarContexto(OrganizacaoA);
            await contexto.Database.ExecuteSqlRawAsync("ALTER TABLE fornecedores_evento DROP CONSTRAINT ck_teste_bloqueia_copia");
        }
    }
}
