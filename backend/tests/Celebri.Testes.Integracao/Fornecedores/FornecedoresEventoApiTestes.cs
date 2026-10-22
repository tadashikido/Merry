using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;
using ClienteEventos = Celebri.Testes.Integracao.Eventos.ClienteEventos;

namespace Celebri.Testes.Integracao.Fornecedores;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class FornecedoresEventoApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private static readonly byte[] PdfValido = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj << >> endobj\ntrailer\n%%EOF");

    private readonly List<HttpClient> _clientesAnfitriao = [];

    public FornecedoresEventoApiTestes(BancoPostgreSqlFixture banco)
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

    private static string Rota(Guid eventoId)
    {
        return $"/api/eventos/{eventoId}/fornecedores";
    }

    private static string Rota(Guid eventoId, Guid vinculoId, string? acao = null)
    {
        return acao is null ? $"{Rota(eventoId)}/{vinculoId}" : $"{Rota(eventoId)}/{vinculoId}/{acao}";
    }

    private static object CorpoVinculo(
        Guid fornecedorId,
        string? status = null,
        decimal? orcado = 18000m,
        decimal? contratado = null,
        string? notas = "Comissão de 10%")
    {
        return new { fornecedorId, servico = "Jantar para 200", valorOrcado = orcado, valorContratado = contratado, status, notasInternas = notas };
    }

    private static async Task<FornecedorDto> CriarFornecedorAsync(
        HttpClient cliente,
        string nome = "Buffet São João",
        string categoria = "Buffet",
        string? observacoes = "Pede sinal de 30%.")
    {
        var resposta = await cliente.PostAsJsonAsync("/api/fornecedores", new
        {
            categoria,
            nomeEmpresa = nome,
            responsavel = "Marta Souza",
            telefone = "(11) 98765-4321",
            email = "contato@saojoao.com.br",
            site = (string?)null,
            instagram = (string?)null,
            observacoes,
        });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<FornecedorDto>())!;
    }

    private static async Task<FornecedorEventoDto> VincularAsync(HttpClient cliente, Guid eventoId, object corpo)
    {
        var resposta = await cliente.PostAsJsonAsync(Rota(eventoId), corpo);
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<FornecedorEventoDto>())!;
    }

    private static Task<HttpResponseMessage> EnviarContratoAsync(HttpClient cliente, Guid eventoId, Guid vinculoId, byte[] conteudo, string nome = "contrato.pdf")
    {
        var formulario = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(conteudo);
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        formulario.Add(arquivo, "arquivo", nome);
        return cliente.PutAsync(Rota(eventoId, vinculoId, "contrato"), formulario);
    }

    private static async Task<ProblemDetails> ProblemaAsync(HttpResponseMessage resposta)
    {
        return (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
    }

    private string[] ArquivosNoDisco()
    {
        return Directory.Exists(Fabrica.DiretorioArquivos)
            ? Directory.GetFiles(Fabrica.DiretorioArquivos, "*", SearchOption.AllDirectories)
            : [];
    }

    private async Task<(Guid EventoId, HttpClient Cliente)> CriarAnfitriaoAsync(Guid? eventoExistente = null)
    {
        var eventoId = eventoExistente ?? (await ClienteEventos.CriarAsync(OrganizacaoA.Cliente)).Id;
        var email = ClienteAcessoAnfitriao.EmailAnfitriaoUnico();
        await ClienteAcessoAnfitriao.ConvidarComSucessoAsync(OrganizacaoA.Cliente, eventoId, email);
        var aceite = await ClienteAcessoAnfitriao.AceitarAsync(ClienteAnonimo, ClienteAcessoAnfitriao.UltimoToken(Fabrica.Email, email));
        Assert.Equal(HttpStatusCode.OK, aceite.StatusCode);
        var sessao = (await aceite.Content.ReadFromJsonAsync<SessaoDto>())!;

        var cliente = Fabrica.CriarClienteHttps();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.TokenAcesso);
        _clientesAnfitriao.Add(cliente);
        return (eventoId, cliente);
    }

    [Fact]
    public async Task Vincular_DeveGravarEmCotacaoEAparecerNaListaENoResumo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), CorpoVinculo(fornecedor.Id));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var vinculo = (await resposta.Content.ReadFromJsonAsync<FornecedorEventoDto>())!;
        Assert.Equal($"/api/eventos/{evento.Id}/fornecedores/{vinculo.Id}", resposta.Headers.Location!.AbsolutePath);
        Assert.Equal("Cotacao", vinculo.Status);
        Assert.Equal(18000m, vinculo.ValorOrcado);
        Assert.Equal("Comissão de 10%", vinculo.NotasInternas);
        Assert.Null(vinculo.Contrato);

        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<ListaFornecedoresEventoDto>(Rota(evento.Id)))!;
        Assert.Equal(vinculo.Id, Assert.Single(lista.Vinculos).Id);
        var buffet = Assert.Single(lista.Resumo.Categorias);
        Assert.Equal("Buffet", buffet.Categoria);
        Assert.Equal(18000m, buffet.Orcado);
        Assert.Equal(0m, buffet.Contratado);
        Assert.False(lista.SomenteLeitura);
        var json = await (await OrganizacaoA.Cliente.GetAsync(Rota(evento.Id))).Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacaoId", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Pede sinal", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Contratado_SemValor_DeveSerRecusadoEComValorEntrarNoResumo()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));

        var semValor = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { servico = "Jantar", valorOrcado = 18000m, valorContratado = (decimal?)null, status = "Contratado", notasInternas = (string?)null });
        var tresCasas = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { servico = "Jantar", valorOrcado = 10.123m, status = "Cotacao" });
        var semStatus = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { servico = "Jantar" });
        var comValor = await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { servico = "Jantar", valorOrcado = 18000m, valorContratado = 18500m, status = "Contratado" });

        Assert.Equal(HttpStatusCode.BadRequest, semValor.StatusCode);
        Assert.Contains(MensagensFornecedoresEvento.ContratadoSemValor, await semValor.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.BadRequest, tresCasas.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, semStatus.StatusCode);
        Assert.Equal(HttpStatusCode.OK, comValor.StatusCode);
        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<ListaFornecedoresEventoDto>(Rota(evento.Id)))!;
        Assert.Equal(18500m, lista.Resumo.TotalContratado);
        Assert.Equal(1, lista.Resumo.QuantidadeContratados);
    }

    [Fact]
    public async Task Vincular_DuplicadoArquivadoOuDeOutraOrganizacao_DeveSerRecusado()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var arquivado = await CriarFornecedorAsync(OrganizacaoA.Cliente, "Florista Jardim", "Decoracao");
        await OrganizacaoA.Cliente.PostAsync($"/api/fornecedores/{arquivado.Id}/arquivar", null);
        var deB = await CriarFornecedorAsync(OrganizacaoB.Cliente, "Buffet da B");
        await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));

        var duplicado = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), CorpoVinculo(fornecedor.Id));
        var deArquivado = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), CorpoVinculo(arquivado.Id));
        var alheio = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), CorpoVinculo(deB.Id));
        var semFornecedor = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), new { servico = "x" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, duplicado.StatusCode);
        var problema = await duplicado.Content.ReadAsStringAsync();
        Assert.Contains(MensagensFornecedoresEvento.JaVinculado, problema, StringComparison.Ordinal);
        Assert.Contains("\"campo\":\"fornecedorId\"", problema, StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, deArquivado.StatusCode);
        Assert.Equal(MensagensFornecedoresEvento.FornecedorArquivado, (await ProblemaAsync(deArquivado)).Detail);
        await AssertNaoEncontradoAsync(alheio);
        Assert.Equal(HttpStatusCode.BadRequest, semFornecedor.StatusCode);
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(1, await contexto.FornecedoresEvento.CountAsync());
    }

    [Fact]
    public async Task Contrato_UploadValidoDownloadSubstituicaoERemocao_DevemControlarOArquivoNoDisco()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));

        var envio = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, PdfValido, "../Contrato Buffet*.pdf");

        Assert.Equal(HttpStatusCode.OK, envio.StatusCode);
        var comContrato = (await envio.Content.ReadFromJsonAsync<FornecedorEventoDto>())!;
        Assert.Equal("Contrato Buffet_.pdf", comContrato.Contrato!.NomeArquivo);
        Assert.Equal(PdfValido.Length, comContrato.Contrato.TamanhoBytes);
        var primeiroArquivo = Assert.Single(ArquivosNoDisco());
        Assert.Matches("^[0-9a-f]{32}$", Path.GetFileName(primeiroArquivo));
        Assert.Contains(OrganizacaoA.OrganizacaoId.ToString("N"), primeiroArquivo, StringComparison.Ordinal);
        Assert.Contains(evento.Id.ToString("N"), primeiroArquivo, StringComparison.Ordinal);
        Assert.DoesNotContain("Contrato", primeiroArquivo, StringComparison.Ordinal);

        var download = await OrganizacaoA.Cliente.GetAsync(Rota(evento.Id, vinculo.Id, "contrato"));
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("application/pdf", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("Contrato Buffet_.pdf", download.Content.Headers.ContentDisposition.FileNameStar);
        Assert.Equal("nosniff", download.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(download.Headers.CacheControl!.NoStore);
        Assert.Equal(PdfValido, await download.Content.ReadAsByteArrayAsync());

        var substituicao = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, Encoding.ASCII.GetBytes("%PDF-1.4 novo"), "novo.pdf");
        Assert.Equal(HttpStatusCode.OK, substituicao.StatusCode);
        var segundoArquivo = Assert.Single(ArquivosNoDisco());
        Assert.NotEqual(primeiroArquivo, segundoArquivo);
        Assert.False(File.Exists(primeiroArquivo));

        var remocao = await OrganizacaoA.Cliente.DeleteAsync(Rota(evento.Id, vinculo.Id, "contrato"));
        Assert.Equal(HttpStatusCode.OK, remocao.StatusCode);
        Assert.Null((await remocao.Content.ReadFromJsonAsync<FornecedorEventoDto>())!.Contrato);
        Assert.Empty(ArquivosNoDisco());
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.GetAsync(Rota(evento.Id, vinculo.Id, "contrato")));
    }

    [Fact]
    public async Task Contrato_QueNaoEPdfVazioOuGrandeDemais_DeveSerRecusadoSemGravar()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var grandeDemais = new byte[(10 * 1024 * 1024) + 1];
        PdfValido.CopyTo(grandeDemais, 0);
        var muitoMaior = new byte[11 * 1024 * 1024];

        var imagem = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, png, "foto.pdf");
        var texto = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, Encoding.UTF8.GetBytes("contrato em texto"), "contrato.pdf");
        var vazio = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, [], "vazio.pdf");
        var grande = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, grandeDemais);
        var enorme = await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, muitoMaior);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, imagem.StatusCode);
        Assert.Equal(MensagensFornecedoresEvento.ContratoFormatoInvalido, (await ProblemaAsync(imagem)).Detail);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, texto.StatusCode);
        Assert.True(vazio.StatusCode is HttpStatusCode.UnprocessableEntity or HttpStatusCode.BadRequest);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, grande.StatusCode);
        Assert.Equal(MensagensFornecedoresEvento.ContratoGrandeDemais, (await ProblemaAsync(grande)).Detail);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, enorme.StatusCode);
        Assert.Empty(ArquivosNoDisco());
        var atual = (await OrganizacaoA.Cliente.GetFromJsonAsync<FornecedorEventoDto>(Rota(evento.Id, vinculo.Id)))!;
        Assert.Null(atual.Contrato);
    }

    [Fact]
    public async Task Anfitriao_DeveVerFornecedoresContatosEResumoSemCamposInternosEBaixarContrato()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente, observacoes: "Pede sinal de 30%.");
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, eventoId, CorpoVinculo(fornecedor.Id, "Contratado", contratado: 18500m, notas: "Comissão de 10%"));
        await EnviarContratoAsync(OrganizacaoA.Cliente, eventoId, vinculo.Id, PdfValido);

        var lista = await anfitriao.GetAsync(Rota(eventoId));
        var detalhe = await anfitriao.GetAsync(Rota(eventoId, vinculo.Id));
        var download = await anfitriao.GetAsync(Rota(eventoId, vinculo.Id, "contrato"));

        Assert.Equal(HttpStatusCode.OK, lista.StatusCode);
        var jsonLista = await lista.Content.ReadAsStringAsync();
        var jsonDetalhe = await detalhe.Content.ReadAsStringAsync();
        foreach (var json in new[] { jsonLista, jsonDetalhe })
        {
            Assert.DoesNotContain("Comissão", json, StringComparison.Ordinal);
            Assert.DoesNotContain("Pede sinal", json, StringComparison.Ordinal);
            Assert.DoesNotContain("observacoes", json, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("11987654321", json, StringComparison.Ordinal);
            Assert.Contains("Buffet São João", json, StringComparison.Ordinal);
        }

        var dto = (await lista.Content.ReadFromJsonAsync<ListaFornecedoresEventoDto>())!;
        Assert.True(dto.SomenteLeitura);
        Assert.Null(dto.Vinculos[0].NotasInternas);
        Assert.Equal(18500m, dto.Resumo.TotalContratado);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(PdfValido, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Anfitriao_NaoPodeEscreverNemVerOutroEventoNemAHistoriaDaBase()
    {
        var (eventoId, anfitriao) = await CriarAnfitriaoAsync();
        var outroEvento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, eventoId, CorpoVinculo(fornecedor.Id));
        var outro = await VincularAsync(OrganizacaoA.Cliente, outroEvento.Id, CorpoVinculo(fornecedor.Id));
        await EnviarContratoAsync(OrganizacaoA.Cliente, outroEvento.Id, outro.Id, PdfValido);

        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PostAsJsonAsync(Rota(eventoId), CorpoVinculo(fornecedor.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PutAsJsonAsync(Rota(eventoId, vinculo.Id), new { status = "Cancelado" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.DeleteAsync(Rota(eventoId, vinculo.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await EnviarContratoAsync(anfitriao, eventoId, vinculo.Id, PdfValido)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.DeleteAsync(Rota(eventoId, vinculo.Id, "contrato"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.PostAsJsonAsync($"{Rota(eventoId)}/importacao", new { eventoOrigemId = outroEvento.Id })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await anfitriao.GetAsync($"/api/fornecedores/{fornecedor.Id}/eventos")).StatusCode);

        await AssertNaoEncontradoAsync(await anfitriao.GetAsync(Rota(outroEvento.Id)));
        await AssertNaoEncontradoAsync(await anfitriao.GetAsync(Rota(outroEvento.Id, outro.Id, "contrato")));
        await AssertNaoEncontradoAsync(await anfitriao.GetAsync(Rota(eventoId, outro.Id)));

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravado = await contexto.FornecedoresEvento.SingleAsync(item => item.Id == vinculo.Id);
        Assert.Equal(StatusFornecedorEvento.Cotacao, gravado.Status);
        Assert.Null(gravado.ContratoArquivoId);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveReceber404EmTudoEDadosDeAFicamIntactos()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));
        await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, PdfValido);
        var eventoB = await ClienteEventos.CriarAsync(OrganizacaoB.Cliente);
        var clienteB = OrganizacaoB.Cliente;

        await AssertNaoEncontradoAsync(await clienteB.GetAsync(Rota(evento.Id)));
        await AssertNaoEncontradoAsync(await clienteB.GetAsync(Rota(evento.Id, vinculo.Id)));
        await AssertNaoEncontradoAsync(await clienteB.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { status = "Cancelado" }));
        await AssertNaoEncontradoAsync(await clienteB.DeleteAsync(Rota(evento.Id, vinculo.Id)));
        await AssertNaoEncontradoAsync(await clienteB.GetAsync(Rota(evento.Id, vinculo.Id, "contrato")));
        await AssertNaoEncontradoAsync(await EnviarContratoAsync(clienteB, evento.Id, vinculo.Id, PdfValido));
        await AssertNaoEncontradoAsync(await clienteB.DeleteAsync(Rota(evento.Id, vinculo.Id, "contrato")));
        await AssertNaoEncontradoAsync(await clienteB.PostAsJsonAsync($"{Rota(eventoB.Id)}/importacao", new { eventoOrigemId = evento.Id }));
        await AssertNaoEncontradoAsync(await clienteB.GetAsync($"/api/fornecedores/{fornecedor.Id}/eventos"));
        Assert.Empty((await clienteB.GetFromJsonAsync<ListaFornecedoresEventoDto>(Rota(eventoB.Id)))!.Vinculos);

        var intacto = (await OrganizacaoA.Cliente.GetFromJsonAsync<FornecedorEventoDto>(Rota(evento.Id, vinculo.Id)))!;
        Assert.Equal("Cotacao", intacto.Status);
        Assert.NotNull(intacto.Contrato);
        Assert.Single(ArquivosNoDisco());
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClienteAnonimo.GetAsync(Rota(evento.Id, vinculo.Id, "contrato"))).StatusCode);
    }

    [Fact]
    public async Task EventoArquivado_DeveRecusarEscritasEManterLeituraEDownload()
    {
        var evento = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var outro = await CriarFornecedorAsync(OrganizacaoA.Cliente, "DJ Noite", "Musica");
        var vinculo = await VincularAsync(OrganizacaoA.Cliente, evento.Id, CorpoVinculo(fornecedor.Id));
        await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, PdfValido);
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"/api/eventos/{evento.Id}/arquivar", null)).StatusCode);

        var respostas = new[]
        {
            await OrganizacaoA.Cliente.PostAsJsonAsync(Rota(evento.Id), CorpoVinculo(outro.Id)),
            await OrganizacaoA.Cliente.PutAsJsonAsync(Rota(evento.Id, vinculo.Id), new { status = "Cancelado" }),
            await OrganizacaoA.Cliente.DeleteAsync(Rota(evento.Id, vinculo.Id)),
            await EnviarContratoAsync(OrganizacaoA.Cliente, evento.Id, vinculo.Id, PdfValido),
            await OrganizacaoA.Cliente.DeleteAsync(Rota(evento.Id, vinculo.Id, "contrato")),
            await OrganizacaoA.Cliente.PostAsJsonAsync($"{Rota(evento.Id)}/importacao", new { eventoOrigemId = origem.Id }),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode));
        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<ListaFornecedoresEventoDto>(Rota(evento.Id)))!;
        Assert.True(lista.EventoArquivado);
        Assert.True(lista.SomenteLeitura);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.GetAsync(Rota(evento.Id, vinculo.Id, "contrato"))).StatusCode);
    }

    [Fact]
    public async Task Importar_DeveCopiarSoOsElegiveisEmCotacaoSemValoresFechadosNotasNemContrato()
    {
        var origem = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var destino = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente);
        var buffet = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var florista = await CriarFornecedorAsync(OrganizacaoA.Cliente, "Florista Jardim", "Decoracao");
        var dj = await CriarFornecedorAsync(OrganizacaoA.Cliente, "DJ Noite", "Musica");
        var foto = await CriarFornecedorAsync(OrganizacaoA.Cliente, "Luz & Afeto", "Fotografia");
        var contratado = await VincularAsync(OrganizacaoA.Cliente, origem.Id, CorpoVinculo(buffet.Id, "Contratado", contratado: 18500m));
        await EnviarContratoAsync(OrganizacaoA.Cliente, origem.Id, contratado.Id, PdfValido);
        await VincularAsync(OrganizacaoA.Cliente, origem.Id, CorpoVinculo(florista.Id, "Cancelado"));
        await VincularAsync(OrganizacaoA.Cliente, origem.Id, CorpoVinculo(dj.Id));
        await VincularAsync(OrganizacaoA.Cliente, origem.Id, CorpoVinculo(foto.Id));
        await OrganizacaoA.Cliente.PostAsync($"/api/fornecedores/{dj.Id}/arquivar", null);
        await VincularAsync(OrganizacaoA.Cliente, destino.Id, CorpoVinculo(foto.Id));

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync($"{Rota(destino.Id)}/importacao", new { eventoOrigemId = origem.Id });
        var mesmo = await OrganizacaoA.Cliente.PostAsJsonAsync($"{Rota(destino.Id)}/importacao", new { eventoOrigemId = destino.Id });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var resultado = (await resposta.Content.ReadFromJsonAsync<ResultadoImportacaoFornecedoresDto>())!;
        Assert.Equal(1, resultado.Importados);
        Assert.Equal(3, resultado.Ignorados);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, mesmo.StatusCode);
        var lista = (await OrganizacaoA.Cliente.GetFromJsonAsync<ListaFornecedoresEventoDto>(Rota(destino.Id)))!;
        var importado = Assert.Single(lista.Vinculos, item => item.Fornecedor.Id == buffet.Id);
        Assert.Equal("Cotacao", importado.Status);
        Assert.Equal(18000m, importado.ValorOrcado);
        Assert.Null(importado.ValorContratado);
        Assert.Null(importado.NotasInternas);
        Assert.Null(importado.Contrato);
        Assert.Single(ArquivosNoDisco());
    }

    [Fact]
    public async Task FornecedorComParticipacao_NaoPodeSerExcluidoEHistoricoListaOsEventos()
    {
        var antigo = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente, ClienteEventos.CorpoValido(nomePrimeiraPessoa: "Clara", data: "2027-01-10"));
        var recente = await ClienteEventos.CriarAsync(OrganizacaoA.Cliente, ClienteEventos.CorpoValido(nomePrimeiraPessoa: "Beatriz", data: "2027-08-20"));
        var fornecedor = await CriarFornecedorAsync(OrganizacaoA.Cliente);
        var vinculoAntigo = await VincularAsync(OrganizacaoA.Cliente, antigo.Id, CorpoVinculo(fornecedor.Id, "Cancelado"));
        var vinculoRecente = await VincularAsync(OrganizacaoA.Cliente, recente.Id, CorpoVinculo(fornecedor.Id, "Contratado", contratado: 1000m));
        await EnviarContratoAsync(OrganizacaoA.Cliente, recente.Id, vinculoRecente.Id, PdfValido);
        await OrganizacaoA.Cliente.PostAsync($"/api/eventos/{antigo.Id}/arquivar", null);

        var historico = (await OrganizacaoA.Cliente.GetFromJsonAsync<List<ParticipacaoFornecedorDto>>($"/api/fornecedores/{fornecedor.Id}/eventos"))!;
        var exclusao = await OrganizacaoA.Cliente.DeleteAsync($"/api/fornecedores/{fornecedor.Id}");

        Assert.Equal([recente.Id, antigo.Id], historico.Select(item => item.EventoId));
        Assert.Equal("Contratado", historico[0].Status);
        Assert.Equal("Beatriz", historico[0].NomePrimeiraPessoa);
        Assert.True(historico[1].EventoArquivado);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, exclusao.StatusCode);
        Assert.Equal(MensagensFornecedores.ParticipouDeEventos, (await ProblemaAsync(exclusao)).Detail);

        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"/api/eventos/{antigo.Id}/restaurar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(Rota(antigo.Id, vinculoAntigo.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(Rota(recente.Id, vinculoRecente.Id))).StatusCode);
        Assert.Empty(ArquivosNoDisco());
        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync($"/api/fornecedores/{fornecedor.Id}")).StatusCode);
    }
}
