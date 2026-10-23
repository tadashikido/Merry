using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Checklists;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Tarefas;

namespace Celebri.Testes.Unidade.Checklists;

public class ModeloChecklistTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 15, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataEvento = new(2027, 12, 12);

    private static DadosItemModeloChecklist Item(
        string? titulo = "Reservar o local",
        int dias = 365,
        ResponsavelTarefa responsavel = ResponsavelTarefa.Assessoria,
        CategoriaTarefa categoria = CategoriaTarefa.Cerimonia,
        string? descricao = null)
    {
        return new DadosItemModeloChecklist(titulo, descricao, responsavel, categoria, dias);
    }

    private static Evento NovoEvento(DateOnly data)
    {
        return Evento.Criar(new DadosEvento("Ana", "Bruno", data, null, null, null, null, null), Agora);
    }

    [Fact]
    public void Entidades_DevemSerIsoladasPorOrganizacao()
    {
        Assert.True(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(ModeloChecklist)));
        Assert.True(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(ItemModeloChecklist)));
        Assert.False(typeof(ModeloChecklist).GetProperty(nameof(ModeloChecklist.OrganizacaoId))!.SetMethod!.IsPublic);
        Assert.False(typeof(ItemModeloChecklist).GetProperty(nameof(ItemModeloChecklist.OrganizacaoId))!.SetMethod!.IsPublic);
    }

    [Fact]
    public void Criar_DeveNormalizarNomeEIniciarSemOrganizacao()
    {
        var modelo = ModeloChecklist.Criar("  Evento   no campo ", "   ", Agora);

        Assert.NotEqual(Guid.Empty, modelo.Id);
        Assert.Equal(Guid.Empty, modelo.OrganizacaoId);
        Assert.Equal("Evento no campo", modelo.Nome);
        Assert.Null(modelo.Descricao);
        Assert.False(modelo.Sugerido);
        Assert.Empty(modelo.Itens);
    }

    [Theory]
    [InlineData(null, MensagensChecklist.NomeObrigatorio)]
    [InlineData("   ", MensagensChecklist.NomeObrigatorio)]
    [InlineData("A", MensagensChecklist.TamanhoNome)]
    public void Criar_NomeInvalido_DeveLancarRegraNegocio(string? nome, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => ModeloChecklist.Criar(nome, null, Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Criar_NomeOuDescricaoLongos_DeveLancarRegraNegocio()
    {
        Assert.Throws<RegraNegocioException>(() => ModeloChecklist.Criar(new string('n', 81), null, Agora));
        var excecao = Assert.Throws<RegraNegocioException>(() => ModeloChecklist.Criar("Modelo", new string('d', 501), Agora));
        Assert.Equal(MensagensChecklist.TamanhoDescricaoModelo, excecao.Message);
    }

    [Fact]
    public void AdicionarItem_DeveVincularAoModeloEOrdenarPorPrazoRelativo()
    {
        var modelo = ModeloChecklist.Criar("Essencial", null, Agora);

        modelo.AdicionarItem(Item("Prova final", 30), Agora);
        modelo.AdicionarItem(Item("Contratar buffet", 365), Agora);
        modelo.AdicionarItem(Item("Álbum", -15), Agora);
        modelo.AdicionarItem(Item("Banda", 180), Agora);

        Assert.All(modelo.Itens, item => Assert.Equal(modelo.Id, item.ModeloId));
        Assert.Equal(["Contratar buffet", "Banda", "Prova final", "Álbum"], modelo.ItensOrdenados().Select(item => item.Titulo));
    }

    [Fact]
    public void AdicionarItem_AlemDoLimite_DeveLancarRegraNegocio()
    {
        var modelo = ModeloChecklist.Criar("Grande", null, Agora);
        for (var indice = 0; indice < ModeloChecklist.LimiteItens; indice++)
        {
            modelo.AdicionarItem(Item($"Item {indice}", indice), Agora);
        }

        var excecao = Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Item("Excedente"), Agora));

        Assert.Equal(MensagensChecklist.LimiteItens, excecao.Message);
        Assert.Equal(ModeloChecklist.LimiteItens, modelo.Itens.Count);
    }

    [Theory]
    [InlineData(1096)]
    [InlineData(-366)]
    public void AdicionarItem_DiasForaDaFaixa_DeveLancarRegraNegocio(int dias)
    {
        var modelo = ModeloChecklist.Criar("Modelo", null, Agora);

        var excecao = Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Item(dias: dias), Agora));

        Assert.Equal(MensagensChecklist.DiasForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(null, MensagensTarefas.TituloObrigatorio)]
    [InlineData("A", MensagensTarefas.TamanhoTitulo)]
    public void AdicionarItem_TituloInvalido_DeveLancarRegraNegocio(string? titulo, string mensagem)
    {
        var modelo = ModeloChecklist.Criar("Modelo", null, Agora);

        var excecao = Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Item(titulo), Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void AdicionarItem_EnumsInvalidos_DeveLancarRegraNegocio()
    {
        var modelo = ModeloChecklist.Criar("Modelo", null, Agora);

        Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Item(responsavel: (ResponsavelTarefa)9), Agora));
        Assert.Throws<RegraNegocioException>(() => modelo.AdicionarItem(Item(categoria: (CategoriaTarefa)42), Agora));
    }

    [Fact]
    public void AtualizarERemoverItem_DevemAlterarSomenteItensDoProprioModelo()
    {
        var modelo = ModeloChecklist.Criar("Modelo", null, Agora);
        var outro = ModeloChecklist.Criar("Outro", null, Agora);
        var item = modelo.AdicionarItem(Item(), Agora);
        var alheio = outro.AdicionarItem(Item(), Agora);

        modelo.AtualizarItem(item, Item("Visitar o espaço", 300, ResponsavelTarefa.Anfitriao, CategoriaTarefa.Recepcao, "Com os anfitriões"), Agora.AddDays(1));

        Assert.Equal("Visitar o espaço", item.Titulo);
        Assert.Equal(300, item.DiasAntesDoEvento);
        Assert.Equal(ResponsavelTarefa.Anfitriao, item.Responsavel);
        Assert.Equal("Com os anfitriões", item.Descricao);
        Assert.Equal(Agora.AddDays(1), modelo.AtualizadoEm);
        Assert.Same(item, modelo.BuscarItem(item.Id));
        Assert.Null(modelo.BuscarItem(alheio.Id));
        Assert.Throws<InvalidOperationException>(() => modelo.AtualizarItem(alheio, Item(), Agora));
        Assert.Throws<InvalidOperationException>(() => modelo.RemoverItem(alheio, Agora));

        modelo.RemoverItem(item, Agora);
        Assert.Empty(modelo.Itens);
    }

    [Theory]
    [InlineData(365, "2026-12-12")]
    [InlineData(180, "2027-06-15")]
    [InlineData(90, "2027-09-13")]
    [InlineData(30, "2027-11-12")]
    [InlineData(0, "2027-12-12")]
    [InlineData(-15, "2027-12-27")]
    public void CalcularPrazo_DeveSubtrairOsDiasDaDataDoEvento(int dias, string esperado)
    {
        Assert.Equal(DateOnly.Parse(esperado, System.Globalization.CultureInfo.InvariantCulture), ItemModeloChecklist.CalcularPrazo(DataEvento, dias));
    }

    [Fact]
    public void CalcularPrazo_DeveLimitarAFaixaValidaDePrazo()
    {
        Assert.Equal(TarefaEvento.PrazoMinimo, ItemModeloChecklist.CalcularPrazo(new DateOnly(2000, 3, 1), 365));
        Assert.Equal(TarefaEvento.PrazoMaximo, ItemModeloChecklist.CalcularPrazo(new DateOnly(2100, 12, 20), -365));
    }

    [Fact]
    public void Gerador_ModeloDe40Itens_DeveGerar40TarefasComPrazosEOrigemCorretos()
    {
        var modelo = ModeloChecklist.Criar("Quarenta", null, Agora);
        for (var indice = 0; indice < 40; indice++)
        {
            modelo.AdicionarItem(Item($"Item {indice:00}", (indice * 27) - 30, indice % 2 == 0 ? ResponsavelTarefa.Assessoria : ResponsavelTarefa.Anfitriao), Agora);
        }

        var evento = NovoEvento(DataEvento);
        var usuario = Guid.NewGuid();

        var tarefas = GeradorTarefasChecklist.Gerar(evento, modelo.Itens, usuario, Agora);

        Assert.Equal(40, tarefas.Count);
        foreach (var (tarefa, item) in tarefas.Zip(modelo.Itens))
        {
            Assert.Equal(evento.Id, tarefa.EventoId);
            Assert.Equal(item.Id, tarefa.OrigemModeloItemId);
            Assert.Equal(DataEvento.AddDays(-item.DiasAntesDoEvento), tarefa.Prazo);
            Assert.Equal(item.Titulo, tarefa.Titulo);
            Assert.Equal(item.Responsavel, tarefa.Responsavel);
            Assert.Equal(item.Categoria, tarefa.Categoria);
            Assert.Equal(StatusTarefa.AFazer, tarefa.Status);
            Assert.Equal(usuario, tarefa.CriadoPorUsuarioId);
        }
    }

    [Fact]
    public void ItensPendentes_DeveIgnorarItensJaAplicados()
    {
        var modelo = ModeloChecklist.Criar("Modelo", null, Agora);
        var primeiro = modelo.AdicionarItem(Item("Primeiro"), Agora);
        var segundo = modelo.AdicionarItem(Item("Segundo"), Agora);

        var pendentes = GeradorTarefasChecklist.ItensPendentes(modelo.Itens, [primeiro.Id, Guid.NewGuid()]);

        Assert.Equal(segundo.Id, Assert.Single(pendentes).Id);
        Assert.Empty(GeradorTarefasChecklist.ItensPendentes(modelo.Itens, [primeiro.Id, segundo.Id]));
    }

    [Fact]
    public void PrazoDesatualizado_DeveConsiderarSoTarefasAbertasComOrigem()
    {
        var itemId = Guid.NewGuid();
        var eventoId = Guid.NewGuid();
        var aberta = TarefaEvento.Criar(eventoId, new DadosTarefa("Buffet", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, new DateOnly(2026, 12, 12)), null, Agora, itemId);
        var concluida = TarefaEvento.Criar(eventoId, new DadosTarefa("Local", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, new DateOnly(2026, 12, 12)), null, Agora, itemId);
        concluida.AlterarStatus(StatusTarefa.Concluida, ResponsavelTarefa.Assessoria, null, Agora);
        var manual = TarefaEvento.Criar(eventoId, new DadosTarefa("Manual", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, new DateOnly(2026, 12, 12)), null, Agora);

        Assert.False(GeradorTarefasChecklist.PrazoDesatualizado(aberta, 365, DataEvento));
        Assert.True(GeradorTarefasChecklist.PrazoDesatualizado(aberta, 365, DataEvento.AddDays(10)));
        Assert.False(GeradorTarefasChecklist.PrazoDesatualizado(concluida, 365, DataEvento.AddDays(10)));
        Assert.False(GeradorTarefasChecklist.PrazoDesatualizado(manual, 365, DataEvento.AddDays(10)));
    }

    [Fact]
    public void RedefinirPrazo_DeveAlterarSomenteOPrazoEValidarAFaixa()
    {
        var tarefa = TarefaEvento.Criar(Guid.NewGuid(), new DadosTarefa("Buffet", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, new DateOnly(2026, 12, 12)), null, Agora, Guid.NewGuid());

        tarefa.RedefinirPrazo(new DateOnly(2027, 1, 5), Agora.AddDays(2));

        Assert.Equal(new DateOnly(2027, 1, 5), tarefa.Prazo);
        Assert.Equal(Agora.AddDays(2), tarefa.AtualizadoEm);
        Assert.Equal("Buffet", tarefa.Titulo);
        Assert.Throws<RegraNegocioException>(() => tarefa.RedefinirPrazo(new DateOnly(1999, 12, 31), Agora));
    }

    [Theory]
    [InlineData(10, 4, 2, 50)]
    [InlineData(3, 3, 0, 100)]
    [InlineData(3, 1, 0, 33)]
    public void Progresso_DeveDesconsiderarCanceladas(int total, int concluidas, int canceladas, int percentual)
    {
        var progresso = new ProgressoChecklist(total, concluidas, canceladas);

        Assert.Equal(percentual, progresso.Percentual);
        Assert.Equal(total - canceladas, progresso.Consideradas);
    }

    [Fact]
    public void Progresso_SemBase_DeveTerPercentualNulo()
    {
        Assert.Null(ProgressoChecklist.Vazio.Percentual);
        Assert.Null(new ProgressoChecklist(2, 0, 2).Percentual);
    }

    [Fact]
    public void Calcular_DeveContarSoTarefasComOrigem()
    {
        var eventoId = Guid.NewGuid();
        var dados = new DadosTarefa("Tarefa", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, null);
        var concluida = TarefaEvento.Criar(eventoId, dados, null, Agora, Guid.NewGuid());
        concluida.AlterarStatus(StatusTarefa.Concluida, ResponsavelTarefa.Assessoria, null, Agora);
        var cancelada = TarefaEvento.Criar(eventoId, dados, null, Agora, Guid.NewGuid());
        cancelada.AlterarStatus(StatusTarefa.Cancelada, ResponsavelTarefa.Assessoria, null, Agora);
        var aberta = TarefaEvento.Criar(eventoId, dados, null, Agora, Guid.NewGuid());
        var manual = TarefaEvento.Criar(eventoId, dados, null, Agora);

        var progresso = ChecklistEventoService.Calcular([concluida, cancelada, aberta, manual]);

        Assert.Equal(new ProgressoChecklist(3, 1, 1), progresso);
        Assert.Equal(50, progresso.Percentual);
    }

    [Fact]
    public void ModeloSugerido_DeveCobrirOsQuatroMarcosComItensValidos()
    {
        var modelo = ModeloChecklistSugerido.Criar(TipoEvento.Casamento, Agora);

        Assert.True(modelo.Sugerido);
        Assert.Equal(TipoEvento.Casamento, modelo.TipoEvento);
        Assert.Equal(ModeloChecklistSugerido.Casamento.Nome, modelo.Nome);
        Assert.Equal(ModeloChecklistSugerido.Casamento.Itens.Count, modelo.Itens.Count);
        Assert.InRange(modelo.Itens.Count, 20, ModeloChecklist.LimiteItens);
        Assert.Equal(
            [ModeloChecklistSugerido.DozeMeses, ModeloChecklistSugerido.SeisMeses, ModeloChecklistSugerido.TresMeses, ModeloChecklistSugerido.TrintaDias],
            modelo.Itens.Select(item => item.DiasAntesDoEvento).Distinct().OrderByDescending(dias => dias));
        Assert.Equal(modelo.Itens.Count, modelo.Itens.Select(item => item.Titulo).Distinct().Count());
        Assert.Contains(modelo.Itens, item => item.Responsavel == ResponsavelTarefa.Anfitriao);
        Assert.Contains(modelo.Itens, item => item.Categoria == CategoriaTarefa.Documentos);
    }

    [Fact]
    public void Organizacao_RegistrarModeloSugerido_DeveSerIdempotente()
    {
        var organizacao = Organizacao.Criar("Assessoria Renata", Agora);
        Assert.False(organizacao.PossuiModeloChecklistSugerido);

        organizacao.RegistrarModeloChecklistSugerido(Agora);
        organizacao.RegistrarModeloChecklistSugerido(Agora.AddDays(3));

        Assert.True(organizacao.PossuiModeloChecklistSugerido);
        Assert.Equal(Agora, organizacao.ModeloChecklistSugeridoEm);
    }

    public static TheoryData<SalvarItemModeloChecklistRequest, string> ItensInvalidos => new()
    {
        { new SalvarItemModeloChecklistRequest("Buffet", null, null, null, 1096), nameof(SalvarItemModeloChecklistRequest.DiasAntesDoEvento) },
        { new SalvarItemModeloChecklistRequest("Buffet", null, null, null, -366), nameof(SalvarItemModeloChecklistRequest.DiasAntesDoEvento) },
        { new SalvarItemModeloChecklistRequest("B", null, null, null, 30), nameof(SalvarItemModeloChecklistRequest.Titulo) },
        { new SalvarItemModeloChecklistRequest("Buffet", null, (ResponsavelTarefa)7, null, 30), nameof(SalvarItemModeloChecklistRequest.Responsavel) },
        { new SalvarItemModeloChecklistRequest("Buffet", null, null, (CategoriaTarefa)40, 30), nameof(SalvarItemModeloChecklistRequest.Categoria) },
    };

    [Theory]
    [MemberData(nameof(ItensInvalidos))]
    public void RequestItem_Invalido_DeveApontarOCampo(SalvarItemModeloChecklistRequest request, string campo)
    {
        var resultados = Validar(request);

        Assert.Contains(resultados, resultado => resultado.MemberNames.Contains(campo));
    }

    [Fact]
    public void RequestItem_Valido_DeveAplicarPadroes()
    {
        var request = new SalvarItemModeloChecklistRequest("Buffet", null, null, null, -30);

        Assert.Empty(Validar(request));
        Assert.Equal(new DadosItemModeloChecklist("Buffet", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, -30), request.ParaDados());
    }

    [Fact]
    public void RequestModelo_E_Aplicacao_DevemValidarRegrasAlemDosAtributos()
    {
        Assert.Empty(Validar(new SalvarModeloChecklistRequest(null, null)));
        Assert.Contains(Validar(new SalvarModeloChecklistRequest("A", null)), resultado => resultado.MemberNames.Contains("Nome"));
        Assert.Empty(Validar(new SalvarModeloChecklistRequest("Modelo", null)));
        Assert.Contains(Validar(new AplicarModeloChecklistRequest(Guid.Empty)), resultado => resultado.MemberNames.Contains("ModeloId"));
        Assert.Empty(Validar(new AplicarModeloChecklistRequest(null)));
        Assert.Empty(Validar(new AplicarModeloChecklistRequest(Guid.NewGuid())));
    }

    private static List<ValidationResult> Validar(IValidatableObject request)
    {
        return request.Validate(new ValidationContext(request)).ToList();
    }
}
