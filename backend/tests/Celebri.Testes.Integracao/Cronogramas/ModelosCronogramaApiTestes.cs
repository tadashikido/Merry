using System.Net;
using System.Net.Http.Json;
using Celebri.Aplicacao.ModelosCronograma;
using Celebri.Dominio.Cronogramas;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Casamentos;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Cronogramas.ClienteModelosCronograma;

namespace Celebri.Testes.Integracao.Cronogramas;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ModelosCronogramaApiTestes : IsolamentoOrganizacaoTestesBase
{
    public ModelosCronogramaApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    [Fact]
    public async Task Listar_PrimeiroAcesso_DeveSemearOSugeridoUmaUnicaVez()
    {
        var primeira = await ListarAsync(OrganizacaoA.Cliente);
        var segunda = await ListarAsync(OrganizacaoA.Cliente);

        var sugerido = Assert.Single(primeira);
        Assert.True(sugerido.Sugerido);
        Assert.Equal(ModeloCronogramaSugerido.Nome, sugerido.Nome);
        Assert.Equal(ModeloCronogramaSugerido.Itens.Count, sugerido.QuantidadeItens);
        Assert.Equal("16:00", sugerido.HorarioReferencia);
        Assert.Equal(sugerido.Id, Assert.Single(segunda).Id);

        var detalhe = await ObterAsync(OrganizacaoA.Cliente, sugerido.Id);
        var cerimonia = Assert.Single(detalhe.Itens, item => item.MinutosDesdeCerimonia == 0);
        Assert.Equal("16:00", cerimonia.Inicio);
        Assert.Equal("Cerimonia", cerimonia.ReferenciaLocal);
        var ensaio = detalhe.Itens[0];
        Assert.Equal("Vespera", ensaio.Dia);
        Assert.Equal("19:00", ensaio.Inicio);
        Assert.Equal("DiaSeguinte", detalhe.Itens[^1].Dia);

        await using var contexto = CriarContexto(OrganizacaoA);
        var organizacao = await contexto.Organizacoes.SingleAsync(item => item.Id == OrganizacaoA.OrganizacaoId);
        Assert.NotNull(organizacao.ModeloCronogramaSugeridoEm);
        Assert.Null(organizacao.ModeloChecklistSugeridoEm);
    }

    [Fact]
    public async Task Listar_ConcorrentePrimeiroAcesso_NaoDeveDuplicarOSugerido()
    {
        var respostas = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => OrganizacaoA.Cliente.GetAsync(RotaModelos)));

        Assert.All(respostas, resposta => Assert.Equal(HttpStatusCode.OK, resposta.StatusCode));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(1, await contexto.ModelosCronograma.CountAsync(modelo => modelo.Sugerido));
    }

    [Fact]
    public async Task Listar_AposExcluirOSugerido_NaoDeveRecriar()
    {
        var sugerido = Assert.Single(await ListarAsync(OrganizacaoA.Cliente));

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaModelo(sugerido.Id))).StatusCode);

        Assert.Empty(await ListarAsync(OrganizacaoA.Cliente));
        await using var contexto = CriarContexto(OrganizacaoA);
        Assert.Equal(0, await contexto.ItensModeloCronograma.CountAsync());
    }

    [Fact]
    public async Task CrudDeModeloEItens_DeveGuardarMinutosEDevolverHorariosNaReferencia()
    {
        var modelo = await CriarAsync(OrganizacaoA.Cliente, "Roteiro fazenda", "17:00");
        Assert.Equal("17:00", modelo.HorarioReferencia);

        var item = await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem(minutos: -90, duracaoMinutos: 600));
        Assert.Equal(-90, item.MinutosDesdeCerimonia);
        Assert.Equal("DiaDoCasamento", item.Dia);
        Assert.Equal("15:30", item.Inicio);
        Assert.Equal("01:30", item.Termino);
        Assert.True(item.TerminaEmOutroDia);
        Assert.Equal("Musica", item.CategoriaFornecedor);

        var atualizado = await OrganizacaoA.Cliente.PutAsJsonAsync(
            RotaItem(modelo.Id, item.Id),
            CorpoItem(minutos: 0, atividade: "Cerimônia", referenciaLocal: "Cerimonia", local: "Ignorado", categoriaFornecedor: null));
        Assert.Equal(HttpStatusCode.OK, atualizado.StatusCode);
        var dto = (await atualizado.Content.ReadFromJsonAsync<ItemModeloCronogramaDto>())!;
        Assert.Equal("17:00", dto.Inicio);
        Assert.Equal("Cerimonia", dto.ReferenciaLocal);
        Assert.Null(dto.Local);
        Assert.Null(dto.CategoriaFornecedor);

        var renomeado = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Roteiro campo", descricao = (string?)null, horarioReferencia = "18:00" });
        Assert.Equal(HttpStatusCode.OK, renomeado.StatusCode);
        var detalhe = await ObterAsync(OrganizacaoA.Cliente, modelo.Id);
        Assert.Equal("Roteiro campo", detalhe.Nome);
        Assert.Equal("18:00", Assert.Single(detalhe.Itens).Inicio);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(RotaItem(modelo.Id, item.Id))).StatusCode);
        Assert.Empty((await ObterAsync(OrganizacaoA.Cliente, modelo.Id)).Itens);
    }

    [Fact]
    public async Task Validacoes_DevemResponder400Ou422ComCampo()
    {
        await CriarAsync(OrganizacaoA.Cliente, "Roteiro fazenda");
        var repetido = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaModelos, new { nome = "  ROTEIRO fazenda ", descricao = (string?)null });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, repetido.StatusCode);
        Assert.Equal("nome", await CampoAsync(repetido));

        var horarioInvalido = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaModelos, new { nome = "Outro", horarioReferencia = "25:00" });
        Assert.Equal(HttpStatusCode.BadRequest, horarioInvalido.StatusCode);

        var modelo = await CriarAsync(OrganizacaoA.Cliente, "Roteiro praia");
        var semAtividade = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem(atividade: " "));
        Assert.Equal(HttpStatusCode.BadRequest, semAtividade.StatusCode);
        var semMinutos = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem(minutos: null));
        Assert.Equal(HttpStatusCode.BadRequest, semMinutos.StatusCode);
        var categoriaInvalida = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem(categoriaFornecedor: "Astronauta"));
        Assert.Equal(HttpStatusCode.BadRequest, categoriaInvalida.StatusCode);

        var foraDaJanela = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaItens(modelo.Id), CorpoItem(minutos: 2000));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, foraDaJanela.StatusCode);
        Assert.Equal(ItemModeloCronograma.CampoMinutos, await CampoAsync(foraDaJanela));

        await CriarItemAsync(OrganizacaoA.Cliente, modelo.Id, CorpoItem(minutos: 1500));
        var referenciaInvalida = await OrganizacaoA.Cliente.PutAsJsonAsync(RotaModelo(modelo.Id), new { nome = "Roteiro praia", horarioReferencia = "23:00" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, referenciaInvalida.StatusCode);
        Assert.Equal(ModeloCronograma.CampoHorarioReferencia, await CampoAsync(referenciaInvalida));
    }

    [Fact]
    public async Task Aplicar_DeveCalcularHorariosPelaCerimoniaESerIdempotente()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);

        var previa = await PreverAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(sugerido.Itens.Count, previa.ItensCriados);
        Assert.False(previa.SemHorarioCerimonia);
        Assert.Equal("16:30", previa.HorarioCerimonia);
        Assert.Equal(new ItemPrevistoCronogramaDto("Vespera", "19:30", "Ensaio da cerimônia"), previa.PrimeiroItem);
        Assert.Equal("DiaSeguinte", previa.UltimoItem!.Dia);
        Assert.Empty((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens);

        var aplicacao = await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(sugerido.Itens.Count, aplicacao.ItensCriados);

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(sugerido.Itens.Count, cronograma.Itens.Count);
        var cerimonia = Assert.Single(cronograma.Itens, item => item.Atividade == "Cerimônia");
        Assert.Equal("16:30", cerimonia.Inicio);
        Assert.Equal("Capela São José", cerimonia.Local);
        Assert.Equal(0, cerimonia.MinutosDesdeCerimonia);
        Assert.Equal("10:30", Assert.Single(cronograma.Itens, item => item.Atividade == "Making of da noiva").Inicio);
        Assert.Equal(0, cronograma.HorariosDesatualizados);

        var reprevia = await PreverAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(0, reprevia.ItensCriados);
        Assert.Equal(sugerido.Itens.Count, reprevia.JaAplicados);
        Assert.Equal(0, (await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id)).ItensCriados);

        Assert.Equal(HttpStatusCode.NoContent, (await OrganizacaoA.Cliente.DeleteAsync(ClienteCronograma.Rota(casamento.Id, cerimonia.Id))).StatusCode);
        Assert.Equal(1, (await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id)).ItensCriados);

        await using var contexto = CriarContexto(OrganizacaoA);
        var itens = await contexto.ItensCronograma.AsNoTracking().Where(item => item.CasamentoId == casamento.Id).ToListAsync();
        Assert.Equal(sugerido.Itens.Count, itens.Count);
        Assert.All(itens, item => Assert.NotNull(item.OrigemModeloItemId));
        Assert.All(itens, item => Assert.NotNull(item.MinutosRelativosCerimonia));
        Assert.Equal(itens.Count, itens.Select(item => item.OrigemModeloItemId).Distinct().Count());
    }

    [Fact]
    public async Task AplicacaoConcorrente_NaoDeveDuplicarItens()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);

        var respostas = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => AplicarAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id)));

        Assert.All(respostas, resposta => Assert.Contains(resposta.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
        Assert.Equal(sugerido.Itens.Count, (await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens.Count);
    }

    [Fact]
    public async Task SemHorarioDaCerimonia_PreviaSinalizaEAplicarOuSalvarRespondem422ComCampoHorario()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(horario: null));
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);

        var previa = await PreverAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.True(previa.SemHorarioCerimonia);
        Assert.Null(previa.PrimeiroItem);

        var aplicar = await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, aplicar.StatusCode);
        Assert.Equal("horario", await CampoAsync(aplicar));

        var salvar = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(casamento.Id), new { nome = "Sem horário" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, salvar.StatusCode);
        Assert.Equal("horario", await CampoAsync(salvar));

        var recalcular = await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, recalcular.StatusCode);
        Assert.Single((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens);
    }

    [Fact]
    public async Task Aplicar_AcimaDoLimiteDe200_DeveSerTudoOuNada()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await using (var contexto = CriarContexto(OrganizacaoA))
        {
            contexto.ItensCronograma.AddRange(Enumerable.Range(0, 190).Select(indice => ItemCronograma.Criar(
                casamento.Id,
                new DadosItemCronograma(DiaCronograma.DiaDoCasamento, new TimeOnly(indice % 24, indice % 60), null, $"Item {indice}", null, null, null, null, null),
                null,
                DateTimeOffset.UtcNow)));
            await contexto.SaveChangesAsync();
        }

        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);

        var previa = await PreverAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.True(previa.ExcedeLimite);
        Assert.Equal(190, previa.ItensNoCronograma);

        var resposta = await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        Assert.Equal(
            MensagensModeloCronograma.LimiteItensCronograma(190, sugerido.Itens.Count),
            (await resposta.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
        Assert.Equal(190, (await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens.Count);
    }

    [Fact]
    public async Task Aplicar_DevePreencherFornecedorSoComUmUnicoVinculoDaCategoria()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var fotografia = await VincularFornecedorAsync(OrganizacaoA.Cliente, casamento.Id, "Estúdio Luz", "Fotografia");
        await VincularFornecedorAsync(OrganizacaoA.Cliente, casamento.Id, "Banda Aurora", "Musica");
        await VincularFornecedorAsync(OrganizacaoA.Cliente, casamento.Id, "DJ Noite", "Musica");
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        var deFotografia = sugerido.Itens.Count(item => item.CategoriaFornecedor == "Fotografia");

        var previa = await PreverAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        Assert.Equal(deFotografia, previa.FornecedoresPreenchidos);

        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);

        var cronograma = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        var comFornecedor = cronograma.Itens.Where(item => item.Fornecedor is not null).ToList();
        Assert.Equal(deFotografia, comFornecedor.Count);
        Assert.All(comFornecedor, item => Assert.Equal(fotografia, item.Fornecedor!.FornecedorCasamentoId));
        Assert.All(
            cronograma.Itens.Where(item => item.Atividade.Contains("banda", StringComparison.OrdinalIgnoreCase)),
            item => Assert.Null(item.Fornecedor));
    }

    [Fact]
    public async Task MudarHorarioDaCerimonia_DeveOferecerRecalculoExplicitoPreservandoAjustesManuais()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(horario: "16:00"));
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id);
        var manual = await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            casamento.Id,
            ClienteCronograma.Corpo("Chegada do celebrante", inicio: "15:00", responsavel: "Padre"));
        var fotos = Assert.Single((await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id)).Itens, item => item.Atividade == "Fotos com família e padrinhos");
        Assert.Equal("17:30", fotos.Inicio);

        var ajuste = await OrganizacaoA.Cliente.PutAsJsonAsync(
            ClienteCronograma.Rota(casamento.Id, fotos.Id),
            ClienteCronograma.Corpo(fotos.Atividade, inicio: "17:45", duracaoMinutos: 30, responsavel: "Fotografia"));
        Assert.Equal(HttpStatusCode.OK, ajuste.StatusCode);
        Assert.Equal(0, (await OrganizacaoA.Cliente.GetFromJsonAsync<RecalculoHorariosDto>(RotaRecalculo(casamento.Id)))!.Itens);

        var edicao = await OrganizacaoA.Cliente.PutAsJsonAsync(
            $"{ClienteCasamentos.Rota}/{casamento.Id}",
            ClienteCasamentos.CorpoValido(horario: "17:00"));
        Assert.Equal(HttpStatusCode.OK, edicao.StatusCode);

        var consulta = (await OrganizacaoA.Cliente.GetFromJsonAsync<RecalculoHorariosDto>(RotaRecalculo(casamento.Id)))!;
        Assert.Equal(sugerido.Itens.Count, consulta.Itens);
        var antes = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(sugerido.Itens.Count, antes.HorariosDesatualizados);
        Assert.Equal("16:00", Assert.Single(antes.Itens, item => item.Atividade == "Cerimônia").Inicio);

        var recalculo = await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null);
        Assert.Equal(HttpStatusCode.OK, recalculo.StatusCode);
        Assert.Equal(sugerido.Itens.Count, (await recalculo.Content.ReadFromJsonAsync<RecalculoHorariosDto>())!.Itens);

        var depois = await ClienteCronograma.ListarAsync(OrganizacaoA.Cliente, casamento.Id);
        Assert.Equal(0, depois.HorariosDesatualizados);
        Assert.Equal("17:00", Assert.Single(depois.Itens, item => item.Atividade == "Cerimônia").Inicio);
        Assert.Equal("18:45", Assert.Single(depois.Itens, item => item.Id == fotos.Id).Inicio);
        Assert.Equal("15:00", Assert.Single(depois.Itens, item => item.Id == manual.Id).Inicio);
        Assert.Equal("DiaSeguinte", Assert.Single(depois.Itens, item => item.Atividade == "Encerramento e saída dos noivos").Dia);
        Assert.Equal(0, (await OrganizacaoA.Cliente.GetFromJsonAsync<RecalculoHorariosDto>(RotaRecalculo(casamento.Id)))!.Itens);
    }

    [Fact]
    public async Task SalvarComoModelo_DeveGuardarDistanciaCategoriaLocaisSemNotas()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var vinculo = await VincularFornecedorAsync(OrganizacaoA.Cliente, casamento.Id, "Estúdio Luz", "Fotografia");
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        await ClienteCronograma.CriarAsync(
            OrganizacaoA.Cliente,
            casamento.Id,
            ClienteCronograma.Corpo("Fotos externas", inicio: "18:00", local: "Mirante", fornecedorCasamentoId: vinculo, notasInternas: "Segredo"));

        var resposta = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(casamento.Id), new { nome = "Roteiro da Ana", descricao = "Base" });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        Assert.NotNull(resposta.Headers.Location);
        var modelo = (await resposta.Content.ReadFromJsonAsync<ModeloCronogramaDto>())!;
        Assert.Equal("16:30", modelo.HorarioReferencia);
        Assert.False(modelo.Sugerido);
        Assert.Equal(2, modelo.Itens.Count);
        Assert.Equal(0, modelo.Itens[0].MinutosDesdeCerimonia);
        Assert.Equal("Cerimonia", modelo.Itens[0].ReferenciaLocal);
        Assert.Equal(90, modelo.Itens[1].MinutosDesdeCerimonia);
        Assert.Equal("Mirante", modelo.Itens[1].Local);
        Assert.Equal("Fotografia", modelo.Itens[1].CategoriaFornecedor);
        Assert.DoesNotContain("Segredo", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.DoesNotContain("Estúdio Luz", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        var vazio = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        var semItens = await OrganizacaoA.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(vazio.Id), new { nome = "Vazio" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, semItens.StatusCode);
    }

    [Fact]
    public async Task CasamentoArquivado_AplicarERecalcularRespondem422MasSalvarComoModeloFunciona()
    {
        var casamento = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente);
        await ClienteCronograma.CriarAsync(OrganizacaoA.Cliente, casamento.Id);
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamento.Id}/arquivar", null)).StatusCode);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await AplicarAsync(OrganizacaoA.Cliente, casamento.Id, sugerido.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await OrganizacaoA.Cliente.PostAsync(RotaRecalculo(casamento.Id), null)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Created,
            (await OrganizacaoA.Cliente.PostAsJsonAsync(RotaSalvarComoModelo(casamento.Id), new { nome = "Do arquivado" })).StatusCode);
    }

    [Fact]
    public async Task Duplicacao_DevePreservarAncoraDosItensAplicados()
    {
        var origem = await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente, ClienteCasamentos.CorpoValido(horario: "16:00"));
        var sugerido = await SugeridoAsync(OrganizacaoA.Cliente);
        await AplicarComSucessoAsync(OrganizacaoA.Cliente, origem.Id, sugerido.Id);

        var duplicacao = await OrganizacaoA.Cliente.PostAsJsonAsync($"{ClienteCasamentos.Rota}/{origem.Id}/duplicacao", new
        {
            nomePrimeiraPessoa = "Carla",
            nomeSegundaPessoa = "Diego",
            data = "2028-03-10",
            horario = "16:00",
            localCerimonia = "Capela Nova",
            localRecepcao = "Salão Novo",
            copiarTarefas = false,
            copiarFornecedores = false,
            copiarCronograma = true,
        });
        Assert.True(duplicacao.IsSuccessStatusCode, await duplicacao.Content.ReadAsStringAsync());

        await using var contexto = CriarContexto(OrganizacaoA);
        var copias = await contexto.ItensCronograma.AsNoTracking().Where(item => item.CasamentoId != origem.Id).ToListAsync();
        Assert.Equal(sugerido.Itens.Count, copias.Count);
        Assert.All(copias, item => Assert.NotNull(item.MinutosRelativosCerimonia));
        Assert.All(copias, item => Assert.NotNull(item.OrigemModeloItemId));
    }
}
