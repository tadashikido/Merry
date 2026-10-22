using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Eventos;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using static Celebri.Testes.Integracao.Eventos.ClienteEventos;
using ClienteChecklist = Celebri.Testes.Integracao.Checklists.ClienteChecklist;
using ClienteConvites = Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteRsvp = Celebri.Testes.Integracao.Rsvp.ClienteRsvp;

namespace Celebri.Testes.Integracao.Eventos;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class TipoEventoApiTestes : IsolamentoOrganizacaoTestesBase
{
    public TipoEventoApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    public static TheoryData<string, string?> TiposValidos => new()
    {
        { nameof(TipoEvento.Casamento), "Bruno" },
        { nameof(TipoEvento.QuinzeAnos), null },
        { nameof(TipoEvento.Aniversario), null },
        { nameof(TipoEvento.Comemoracao), null },
        { nameof(TipoEvento.Comemoracao), "Família Souza" },
    };

    [Theory]
    [MemberData(nameof(TiposValidos))]
    public async Task Criar_CadaTipo_DeveGravarTipoENomesCoerentes(string tipo, string? segundoNome)
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomePrimeiraPessoa: "Helena", nomeSegundaPessoa: segundoNome, tipo: tipo));

        Assert.Equal(tipo, criado.Tipo);
        Assert.Equal(segundoNome, criado.NomeSegundaPessoa);
        var obtido = (await OrganizacaoA.Cliente.GetFromJsonAsync<EventoDto>($"{Rota}/{criado.Id}"))!;
        Assert.Equal(tipo, obtido.Tipo);
        var resumo = Assert.Single(await ListarAsync(OrganizacaoA.Cliente));
        Assert.Equal(tipo, resumo.Tipo);
    }

    [Theory]
    [InlineData(nameof(TipoEvento.QuinzeAnos))]
    [InlineData(nameof(TipoEvento.Aniversario))]
    public async Task Criar_TipoDeUmHomenageadoComSegundoNome_DeveRetornar400(string tipo)
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(nomeSegundaPessoa: "Bruno", tipo: tipo));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal(MensagensEvento.UmHomenageado, await PrimeiroErroAsync(resposta, "NomeSegundaPessoa"));
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
    }

    [Fact]
    public async Task Criar_CasamentoSemSegundoNome_DeveRetornar400()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(nomeSegundaPessoa: null));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal(MensagensEvento.SegundoNomeObrigatorio, await PrimeiroErroAsync(resposta, "NomeSegundaPessoa"));
    }

    [Fact]
    public async Task Criar_SemTipo_DeveRetornar400ComMensagem()
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(tipo: null));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal(MensagensEvento.TipoObrigatorio, await PrimeiroErroAsync(resposta, "Tipo"));
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
    }

    [Theory]
    [InlineData("Corporativo")]
    [InlineData("Formatura")]
    [InlineData("<script>")]
    public async Task Criar_TipoDesconhecido_DeveRetornar400(string tipo)
    {
        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, CorpoValido(tipo: tipo));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
    }

    [Fact]
    public async Task Criar_TipoInteiroForaDaLista_DeveRetornar400()
    {
        var corpo = new
        {
            tipo = 99,
            nomePrimeiraPessoa = "Ana",
            nomeSegundaPessoa = "Bruno",
            data = "2027-05-15",
        };

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(Rota, corpo);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal(MensagensEvento.TipoInvalido, await PrimeiroErroAsync(resposta, "Tipo"));
        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
    }

    [Fact]
    public async Task Atualizar_DeCasamentoParaAniversario_DeveTrocarTipoEDescartarSegundoNome()
    {
        var criado = await CriarAsync(OrganizacaoA.Cliente);

        var resposta = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{Rota}/{criado.Id}",
            CorpoValido(nomePrimeiraPessoa: "Helena", nomeSegundaPessoa: null, tipo: nameof(TipoEvento.Aniversario)));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizado = (await resposta.Content.ReadFromJsonAsync<EventoDto>())!;
        Assert.Equal(nameof(TipoEvento.Aniversario), atualizado.Tipo);
        Assert.Null(atualizado.NomeSegundaPessoa);
        Assert.Equal(criado.LocalCerimonia, atualizado.LocalCerimonia);
    }

    [Fact]
    public async Task Duplicar_DeveHerdarOTipoDaOrigemEAplicarARegraDeHomenageados()
    {
        var origem = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomePrimeiraPessoa: "Júlia", nomeSegundaPessoa: null, tipo: nameof(TipoEvento.QuinzeAnos)));
        var rota = $"{Rota}/{origem.Id}/duplicacao";

        var comSegundo = await OrganizacaoA.Cliente.PostAsJsonAsync(rota, new { nomePrimeiraPessoa = "Laura", nomeSegundaPessoa = "Pedro", data = "2028-03-04" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, comSegundo.StatusCode);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(rota, new { nomePrimeiraPessoa = "Laura", data = "2028-03-04" });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var lista = await ListarAsync(OrganizacaoA.Cliente);
        var copia = Assert.Single(lista, evento => evento.NomePrimeiraPessoa == "Laura");
        Assert.Equal(nameof(TipoEvento.QuinzeAnos), copia.Tipo);
        Assert.Null(copia.NomeSegundaPessoa);
    }

    [Fact]
    public async Task RsvpPublico_DeveExporOTipoSemDadosInternos()
    {
        var evento = await CriarAsync(OrganizacaoA.Cliente, CorpoValido(nomePrimeiraPessoa: "Helena", nomeSegundaPessoa: null, tipo: nameof(TipoEvento.Aniversario)));
        var convite = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, evento.Id, ClienteConvites.CorpoValido("Família Souza", "Amigos", 0));
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, evento.Id, convite.Id);

        var resposta = await ClienteRsvp.ConsultarAsync(ClienteAnonimo, link.Token);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var eventoJson = json.RootElement.GetProperty("evento");
        Assert.Equal(nameof(TipoEvento.Aniversario), eventoJson.GetProperty("tipo").GetString());
        Assert.Equal(JsonValueKind.Null, eventoJson.GetProperty("nomeSegundaPessoa").ValueKind);
        Assert.False(eventoJson.TryGetProperty("observacoes", out _));
        Assert.False(eventoJson.TryGetProperty("convidadosEstimados", out _));
        Assert.False(eventoJson.TryGetProperty("id", out _));
    }

    [Fact]
    public async Task ModelosSugeridos_DevemSerUmPorTipoComConteudosDiferentes()
    {
        var modelos = await ClienteChecklist.ListarModelosAsync(OrganizacaoA.Cliente);

        Assert.Equal(
            RegrasTipoEvento.Disponiveis.Select(tipo => tipo.ToString()).Order(),
            modelos.Where(modelo => modelo.Sugerido).Select(modelo => modelo.TipoEvento!).Order());
        var detalhes = new List<ModeloChecklistDto>();
        foreach (var modelo in modelos)
        {
            detalhes.Add((await OrganizacaoA.Cliente.GetFromJsonAsync<ModeloChecklistDto>($"{ClienteChecklist.RotaModelos}/{modelo.Id}"))!);
        }

        var titulosPorTipo = detalhes.ToDictionary(modelo => modelo.TipoEvento!, modelo => modelo.Itens.Select(item => item.Titulo).ToHashSet());
        Assert.Contains("Definir padrinhos e madrinhas", titulosPorTipo[nameof(TipoEvento.Casamento)]);
        Assert.Contains("Escolher o vestido da debutante", titulosPorTipo[nameof(TipoEvento.QuinzeAnos)]);
        foreach (var tipo in new[] { TipoEvento.QuinzeAnos, TipoEvento.Aniversario, TipoEvento.Comemoracao })
        {
            Assert.DoesNotContain(
                titulosPorTipo[tipo.ToString()],
                titulo => titulo.Contains("padrinho", StringComparison.OrdinalIgnoreCase)
                    || titulo.Contains("casamento", StringComparison.OrdinalIgnoreCase)
                    || titulo.Contains("noiv", StringComparison.OrdinalIgnoreCase));
        }

        var listaB = await ClienteChecklist.ListarModelosAsync(OrganizacaoB.Cliente);
        Assert.DoesNotContain(listaB, modelo => detalhes.Any(detalhe => detalhe.Id == modelo.Id));
    }

    private static async Task<string?> PrimeiroErroAsync(HttpResponseMessage resposta, string campo)
    {
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("errors").GetProperty(campo)[0].GetString();
    }
}
