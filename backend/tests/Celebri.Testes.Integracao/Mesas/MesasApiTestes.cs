using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Mesas;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Infraestrutura.Persistencia.Repositorios;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Eventos;
using Celebri.Testes.Integracao.Convidados;
using Celebri.Testes.Integracao.Isolamento;
using Celebri.Testes.Integracao.Rsvp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClienteAcessoAnfitriao = Celebri.Testes.Integracao.AcessosAnfitriao.ClienteAcessoAnfitriao;

namespace Celebri.Testes.Integracao.Mesas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class MesasApiTestes : IsolamentoOrganizacaoTestesBase, IDisposable
{
    private readonly List<HttpClient> _clientesAnfitriao = [];

    public MesasApiTestes(BancoPostgreSqlFixture banco)
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

    private async Task<Guid> CriarEventoAsync()
    {
        return (await ClienteEventos.CriarAsync(OrganizacaoA.Cliente)).Id;
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

    private static async Task<ProblemDetails> ProblemaAsync(HttpResponseMessage resposta)
    {
        return (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!;
    }

    private static async Task<string?> CampoAsync(HttpResponseMessage resposta)
    {
        var problema = await ProblemaAsync(resposta);
        return problema.Extensions.TryGetValue("campo", out var campo) ? campo?.ToString() : null;
    }

    [Fact]
    public async Task Criar_DadosValidos_DeveRetornar201ComLocationOcupacaoZeroESemOrganizacao()
    {
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoId), ClienteMesas.Corpo(3, "  Amigos   da faculdade ", 10));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var json = await resposta.Content.ReadAsStringAsync();
        Assert.DoesNotContain("organizacao", json, StringComparison.OrdinalIgnoreCase);
        var mesa = (await resposta.Content.ReadFromJsonAsync<MesaDto>())!;
        Assert.Equal(ClienteMesas.Rota(eventoId, mesa.Id), resposta.Headers.Location!.OriginalString);
        Assert.Equal(3, mesa.Numero);
        Assert.Equal("Amigos da faculdade", mesa.Nome);
        Assert.Equal(10, mesa.Capacidade);
        Assert.Equal(0, mesa.Ocupacao);

        await using var contexto = CriarContexto(OrganizacaoA);
        var gravada = await contexto.Mesas.SingleAsync(item => item.Id == mesa.Id);
        Assert.Equal(OrganizacaoA.OrganizacaoId, gravada.OrganizacaoId);
        Assert.Equal(eventoId, gravada.EventoId);
    }

    [Theory]
    [InlineData(null, 8, "Numero")]
    [InlineData(0, 8, "Numero")]
    [InlineData(1000, 8, "Numero")]
    [InlineData(1, null, "Capacidade")]
    [InlineData(1, 0, "Capacidade")]
    [InlineData(1, 31, "Capacidade")]
    public async Task Criar_CamposInvalidos_DeveRetornar400NoCampo(int? numero, int? capacidade, string campo)
    {
        var eventoId = await CriarEventoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoId), ClienteMesas.Corpo(numero, null, capacidade));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        var problema = (await resposta.Content.ReadFromJsonAsync<ValidationProblemDetails>())!;
        Assert.Contains(campo, problema.Errors.Keys);
    }

    [Fact]
    public async Task Criar_NumeroRepetidoOuSegundaMesaEspecial_DeveRetornar422NoCampo()
    {
        var eventoId = await CriarEventoAsync();
        await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 1, especial: true);

        var repetida = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoId), ClienteMesas.Corpo(1));
        var especial = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoId), ClienteMesas.Corpo(2, "Anfitriões 2", 8, true));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, repetida.StatusCode);
        Assert.Equal("numero", await CampoAsync(repetida));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, especial.StatusCode);
        Assert.Equal("especial", await CampoAsync(especial));
    }

    [Fact]
    public async Task Sentar_ConviteInteiroQueCabe_DeveSentarTodosEAparecerNaListaDeConvidados()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 2, 4, "Família da noiva");
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza", "Ana Souza");

        var mapa = await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, convite.Convidados.Select(pessoa => pessoa.Id).ToArray());

        Assert.Equal(3, mapa.Mesas.Single().Ocupacao);
        Assert.All(mapa.Pessoas, pessoa => Assert.Equal(mesa.Id, pessoa.MesaId));
        Assert.Equal(new TotaisMesasDto(1, 4, 3, 3, 1, 0), mapa.Totais);
        var lista = await ClienteConvites.ListarAsync(OrganizacaoA.Cliente, eventoId);
        Assert.All(lista.Convites.Single().Convidados, pessoa => Assert.Equal(mesa.Id, pessoa.MesaId));
        Assert.Equal(new MesaResumoDto(mesa.Id, 2, "Família da noiva", false), lista.Mesas.Single());
    }

    [Fact]
    public async Task Sentar_ExcedendoCapacidade_DeveRetornar422ENaoSentarNinguem()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 1, 2);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Lima", "Rafael Lima", "Bia Lima", "Caio Lima");

        var resposta = await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, convite.Convidados.Select(pessoa => pessoa.Id).ToArray());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Contains("2 livres", (await ProblemaAsync(resposta)).Detail, StringComparison.Ordinal);
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.All(mapa.Pessoas, pessoa => Assert.Null(pessoa.MesaId));
        Assert.Equal(0, mapa.Mesas.Single().Ocupacao);
    }

    [Fact]
    public async Task Sentar_PessoaPendenteOuDeOutroEventoOuRepetida_DeveSerRecusada()
    {
        var eventoId = await CriarEventoAsync();
        var outroEventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var pendente = await ClienteConvites.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var deOutro = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, outroEventoId, "Família Rocha", "Caio Rocha");
        var confirmado = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Prado", "Joana Prado");

        var respostaPendente = await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, pendente.Convidados[0].Id);
        var respostaOutro = await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, deOutro.Convidados[0].Id);
        var respostaRepetida = await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, confirmado.Convidados[0].Id, confirmado.Convidados[0].Id);
        var respostaVazia = await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, respostaPendente.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, respostaOutro.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, respostaRepetida.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, respostaVazia.StatusCode);
        Assert.Equal(0, (await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId)).Totais.Acomodados);
    }

    [Fact]
    public async Task Sentar_PessoaJaSentada_DeveMoverSemDuplicar()
    {
        var eventoId = await CriarEventoAsync();
        var primeira = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 1, 2);
        var segunda = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 2, 2);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Rui Fontes", "Rui Fontes");
        var rui = convite.Convidados[0].Id;
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, primeira.Id, rui);

        var mapa = await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, segunda.Id, rui);

        Assert.Equal(0, mapa.Mesas.Single(mesa => mesa.Id == primeira.Id).Ocupacao);
        Assert.Equal(1, mapa.Mesas.Single(mesa => mesa.Id == segunda.Id).Ocupacao);
        Assert.Equal(segunda.Id, mapa.Pessoas.Single().MesaId);
        var mesmaMesa = await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, segunda.Id, rui);
        Assert.Equal(1, mesmaMesa.Totais.Acomodados);
    }

    [Fact]
    public async Task Retirar_DeveVoltarParaSemMesaSemAviso()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza");
        var ids = convite.Convidados.Select(pessoa => pessoa.Id).ToArray();
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, ids);

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.RotaRetirada(eventoId), ClienteMesas.Pessoas(ids[0]));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var mapa = (await resposta.Content.ReadFromJsonAsync<MapaMesasDto>())!;
        Assert.Null(mapa.Pessoas.Single(pessoa => pessoa.Id == ids[0]).MesaId);
        Assert.Equal(1, mapa.Mesas.Single().Ocupacao);
        Assert.Empty(mapa.AvisosSaida);
    }

    [Fact]
    public async Task Atualizar_CapacidadeAbaixoDaOcupacao_DeveRetornar422NoCampoCapacidade()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 1, 4);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza", "Ana Souza");
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, convite.Convidados.Select(pessoa => pessoa.Id).ToArray());

        var abaixo = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteMesas.Rota(eventoId, mesa.Id), ClienteMesas.Corpo(1, null, 2));
        var igual = await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteMesas.Rota(eventoId, mesa.Id), ClienteMesas.Corpo(5, "Tios", 3));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, abaixo.StatusCode);
        var problema = await ProblemaAsync(abaixo);
        Assert.Equal("capacidade", problema.Extensions["campo"]?.ToString());
        Assert.Contains("3 pessoas", problema.Detail, StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.OK, igual.StatusCode);
        var atualizada = (await igual.Content.ReadFromJsonAsync<MesaDto>())!;
        Assert.Equal((5, "Tios", 3, 3), (atualizada.Numero, atualizada.Nome, atualizada.Capacidade, atualizada.Ocupacao));
    }

    [Fact]
    public async Task Remover_MesaComPessoas_DeveDevolverAsPessoasParaSemMesa()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza");
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, convite.Convidados.Select(pessoa => pessoa.Id).ToArray());

        var resposta = await OrganizacaoA.Cliente.DeleteAsync(ClienteMesas.Rota(eventoId, mesa.Id));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.Empty(mapa.Mesas);
        Assert.All(mapa.Pessoas, pessoa => Assert.Null(pessoa.MesaId));
        Assert.Equal(2, mapa.Totais.SemMesa);
        await AssertNaoEncontradoAsync(await OrganizacaoA.Cliente.DeleteAsync(ClienteMesas.Rota(eventoId, mesa.Id)));
    }

    [Fact]
    public async Task RecusaPeloRsvpPublico_DeveTirarDaMesaComAvisoAteSerDispensado()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 3, 8, "Padrinhos");
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza");
        var carla = convite.Convidados[0].Id;
        var pedro = convite.Convidados[1].Id;
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, carla, pedro);
        var link = await ClienteRsvp.GerarLinkAsync(OrganizacaoA.Cliente, eventoId, convite.Id);

        var resposta = await ClienteRsvp.ResponderAsync(ClienteAnonimo, link.Token, [(carla, "Recusado"), (pedro, "Confirmado")]);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.Equal(1, mapa.Mesas.Single().Ocupacao);
        Assert.DoesNotContain(mapa.Pessoas, pessoa => pessoa.Id == carla);
        Assert.Equal(mesa.Id, mapa.Pessoas.Single(pessoa => pessoa.Id == pedro).MesaId);
        var aviso = Assert.Single(mapa.AvisosSaida);
        Assert.Equal((carla, "Carla Souza", "Família Souza", "Recusado", mesa.Id, 3, "Padrinhos"), (aviso.ConvidadoId, aviso.Nome, aviso.Convite, aviso.Resposta, aviso.MesaId, aviso.MesaNumero, aviso.MesaNome));

        var dispensa = await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.RotaDispensa(eventoId), ClienteMesas.Pessoas(carla));

        Assert.Equal(HttpStatusCode.OK, dispensa.StatusCode);
        Assert.Empty((await dispensa.Content.ReadFromJsonAsync<MapaMesasDto>())!.AvisosSaida);
        await using var contexto = CriarContexto(OrganizacaoA);
        var gravada = await contexto.Convidados.SingleAsync(pessoa => pessoa.Id == carla);
        Assert.Equal(RespostaRsvp.Recusado, gravada.Resposta);
        Assert.Null(gravada.MesaId);
        Assert.Null(gravada.SaiuDaMesaEm);
    }

    [Fact]
    public async Task EdicaoParaPendente_DeveTirarDaMesaComAvisoESentarDeNovoLimpaOAviso()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Rui Fontes", "Rui Fontes");
        var rui = convite.Convidados[0].Id;
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, rui);

        var edicao = await OrganizacaoA.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(eventoId, convite.Id),
            ClienteConvites.CorpoValido("Rui Fontes", null, 0, ClienteConvites.Pessoa("Rui Fontes", null, null, "Adulto", "Pendente", rui)));

        Assert.Equal(HttpStatusCode.OK, edicao.StatusCode);
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.Equal(0, mapa.Mesas.Single().Ocupacao);
        Assert.Equal("Pendente", Assert.Single(mapa.AvisosSaida).Resposta);

        await OrganizacaoA.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(eventoId, convite.Id),
            ClienteConvites.CorpoValido("Rui Fontes", null, 0, ClienteConvites.Pessoa("Rui Fontes", null, null, "Adulto", "Confirmado", rui)));
        var sentadoDeNovo = await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, rui);
        Assert.Empty(sentadoDeNovo.AvisosSaida);
        Assert.Equal(1, sentadoDeNovo.Totais.Acomodados);
    }

    [Fact]
    public async Task ExclusaoDoConviteOuDaPessoa_DeveTirarDaMesaSemErro()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var souza = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Souza", "Carla Souza", "Pedro Souza");
        var lima = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Família Lima", "Rafael Lima");
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, souza.Convidados[0].Id, souza.Convidados[1].Id, lima.Convidados[0].Id);

        var semPedro = await OrganizacaoA.Cliente.PutAsJsonAsync(
            ClienteConvites.Rota(eventoId, souza.Id),
            ClienteConvites.CorpoValido("Família Souza", null, 0, ClienteConvites.Pessoa("Carla Souza", null, null, "Adulto", "Confirmado", souza.Convidados[0].Id)));
        var exclusao = await OrganizacaoA.Cliente.DeleteAsync(ClienteConvites.Rota(eventoId, lima.Id));

        Assert.Equal(HttpStatusCode.OK, semPedro.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, exclusao.StatusCode);
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.Equal(1, mapa.Mesas.Single().Ocupacao);
        Assert.Empty(mapa.AvisosSaida);
    }

    [Fact]
    public async Task SentarEmParalelo_NaMesmaMesa_NuncaDeveExcederACapacidade()
    {
        var eventoId = await CriarEventoAsync();
        var anfitriao = await CriarClienteAnfitriaoAsync(eventoId);
        var nomes = Enumerable.Range(1, 10).Select(indice => $"Convidado {indice:00}").ToArray();
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Turma do futebol", nomes);

        for (var rodada = 0; rodada < 3; rodada++)
        {
            var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId, 10 + rodada, 3);
            var tarefas = convite.Convidados
                .Select((pessoa, indice) => ClienteMesas.SentarAsync(indice % 2 == 0 ? OrganizacaoA.Cliente : anfitriao, eventoId, mesa.Id, pessoa.Id))
                .ToList();

            var respostas = await Task.WhenAll(tarefas);

            Assert.All(respostas, resposta => Assert.Contains(resposta.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict, HttpStatusCode.UnprocessableEntity }));
            var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
            var ocupacao = mapa.Mesas.Single(item => item.Id == mesa.Id).Ocupacao;
            Assert.InRange(ocupacao, 1, 3);
            Assert.Equal(respostas.Count(resposta => resposta.StatusCode == HttpStatusCode.OK), ocupacao);
            await using var contexto = CriarContexto(OrganizacaoA);
            Assert.Equal(ocupacao, await contexto.Convidados.CountAsync(pessoa => pessoa.MesaId == mesa.Id));
            await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.RotaRetirada(eventoId), ClienteMesas.Pessoas(convite.Convidados.Select(pessoa => pessoa.Id).ToArray()));
        }
    }

    [Fact]
    public async Task RecusaConcorrenteComAtribuicao_DeveSerBarradaPeloBancoComConflito()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Rui Fontes", "Rui Fontes");
        var rui = convite.Convidados[0].Id;

        await using var contexto = CriarContexto(OrganizacaoA);
        var carregado = await contexto.Convites.Include(item => item.Convidados).SingleAsync(item => item.Id == convite.Id);
        await ClienteMesas.SentarComSucessoAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, rui);
        carregado.RegistrarRespostaRsvp([new RespostaPessoaRsvp(rui, RespostaRsvp.Recusado)], [], DateTimeOffset.UtcNow);

        await Assert.ThrowsAsync<ConcorrenciaException>(() => new UnidadeTrabalho(contexto).SalvarAsync(CancellationToken.None));
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.Equal(mesa.Id, mapa.Pessoas.Single().MesaId);
    }

    [Fact]
    public async Task EventoArquivado_EscritasRetornam422ELeituraContinua()
    {
        var eventoId = await CriarEventoAsync();
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, eventoId, "Rui Fontes", "Rui Fontes");
        await OrganizacaoA.Cliente.PostAsync($"{ClienteEventos.Rota}/{eventoId}/arquivar", null);

        var respostas = new[]
        {
            await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.Rota(eventoId), ClienteMesas.Corpo(2)),
            await OrganizacaoA.Cliente.PutAsJsonAsync(ClienteMesas.Rota(eventoId, mesa.Id), ClienteMesas.Corpo(1, null, 6)),
            await ClienteMesas.SentarAsync(OrganizacaoA.Cliente, eventoId, mesa.Id, convite.Convidados[0].Id),
            await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.RotaRetirada(eventoId), ClienteMesas.Pessoas(convite.Convidados[0].Id)),
            await OrganizacaoA.Cliente.PostAsJsonAsync(ClienteMesas.RotaDispensa(eventoId), ClienteMesas.Pessoas(convite.Convidados[0].Id)),
            await OrganizacaoA.Cliente.DeleteAsync(ClienteMesas.Rota(eventoId, mesa.Id)),
        };

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode));
        var mapa = await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, eventoId);
        Assert.True(mapa.EventoArquivado);
        Assert.Single(mapa.Mesas);
    }

    [Fact]
    public async Task Anfitriao_OrganizaMesasDoProprioEventoESemRestricoesNoMapa()
    {
        var eventoId = await CriarEventoAsync();
        var anfitriao = await CriarClienteAnfitriaoAsync(eventoId);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(anfitriao, eventoId, "Tia Lúcia", "Tia Lúcia");

        var mesa = await ClienteMesas.CriarAsync(anfitriao, eventoId, 4, 6, "Tios");
        var mapa = await ClienteMesas.SentarComSucessoAsync(anfitriao, eventoId, mesa.Id, convite.Convidados[0].Id);
        var json = await (await anfitriao.GetAsync(ClienteMesas.Rota(eventoId))).Content.ReadAsStringAsync();

        Assert.Equal(1, mapa.Totais.Acomodados);
        Assert.DoesNotContain("restricao", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("telefone", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("email", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Anfitriao_DeOutroEvento_DeveReceber404EmTodasAsRotas()
    {
        var eventoDoAnfitriao = await CriarEventoAsync();
        var outroEvento = await CriarEventoAsync();
        var anfitriao = await CriarClienteAnfitriaoAsync(eventoDoAnfitriao);
        var mesa = await ClienteMesas.CriarAsync(OrganizacaoA.Cliente, outroEvento);
        var convite = await ClienteMesas.CriarConviteConfirmadoAsync(OrganizacaoA.Cliente, outroEvento, "Rui Fontes", "Rui Fontes");

        await AssertNaoEncontradoAsync(await anfitriao.GetAsync(ClienteMesas.Rota(outroEvento)));
        await AssertNaoEncontradoAsync(await anfitriao.PostAsJsonAsync(ClienteMesas.Rota(outroEvento), ClienteMesas.Corpo(9)));
        await AssertNaoEncontradoAsync(await anfitriao.PutAsJsonAsync(ClienteMesas.Rota(outroEvento, mesa.Id), ClienteMesas.Corpo(9)));
        await AssertNaoEncontradoAsync(await anfitriao.DeleteAsync(ClienteMesas.Rota(outroEvento, mesa.Id)));
        await AssertNaoEncontradoAsync(await ClienteMesas.SentarAsync(anfitriao, outroEvento, mesa.Id, convite.Convidados[0].Id));
        var mesaPropria = await ClienteMesas.CriarAsync(anfitriao, eventoDoAnfitriao);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await ClienteMesas.SentarAsync(anfitriao, eventoDoAnfitriao, mesaPropria.Id, convite.Convidados[0].Id)).StatusCode);
        Assert.Equal(0, (await ClienteMesas.MapaAsync(OrganizacaoA.Cliente, outroEvento)).Totais.Acomodados);
    }

    [Fact]
    public async Task SemAutenticacao_DeveRetornar401()
    {
        var eventoId = await CriarEventoAsync();

        var resposta = await ClienteAnonimo.GetAsync(ClienteMesas.Rota(eventoId));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }
}
