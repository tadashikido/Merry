using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using static Celebri.Testes.Unidade.Convidados.Importacao.PlanilhasTeste;

namespace Celebri.Testes.Unidade.Convidados.Importacao;

public class ImportacaoConvidadosServiceTestes
{
    private const string PlanilhaValida = "Convite;Nome;Telefone;Idade\nFamília Lima;Ana Lima;(11) 98765-4321;Adulto\nFamília Lima;Bia Lima;;Criança\n;Carlos Dias;(21) 99876-5432;\n";
    private const string PlanilhaComErro = "Convite;Nome;Telefone\nFamília Lima;Ana Lima;(11) 98765-4321\nFamília Lima;Bia Lima;123\n;Carlos Dias;(21) 99876-5432\n";

    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioEventos _eventos = new();
    private readonly RepositorioConvites _convites = new();
    private readonly UnidadeTrabalho _unidadeTrabalho = new();
    private readonly ImportacaoConvidadosService _service;
    private readonly Evento _evento;

    public ImportacaoConvidadosServiceTestes()
    {
        _service = new ImportacaoConvidadosService(_eventos, _convites, _unidadeTrabalho, new RelogioFixo(Agora));
        _evento = NovoEvento();
    }

    private Evento NovoEvento(bool arquivado = false)
    {
        var evento = Evento.Criar(
            new DadosEvento("Ana", "Bruno", new DateOnly(2027, 5, 15), null, null, null, 150, null),
            Agora);
        if (arquivado)
        {
            evento.Arquivar(Agora);
        }
        _eventos.Itens.Add(evento);
        return evento;
    }

    private static MemoryStream Fluxo(string conteudo)
    {
        return new MemoryStream(Utf8(conteudo));
    }

    [Fact]
    public async Task PreVisualizar_NaoDeveGravarEDeveResumirSemContatoNaListaDeConvites()
    {
        var previa = await _service.PreVisualizarAsync(_evento.Id, Fluxo(PlanilhaValida), CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Empty(_convites.Itens);
        Assert.Equal(new ResumoImportacaoDto(3, 2, 3, 2, 3, 2, 1, 0, 0, 0, 0, Convite.ConvidadosMaximoPorEvento), previa.Resumo);
        Assert.Equal(["Convite", "Nome", "Telefone", "FaixaEtaria"], previa.ColunasReconhecidas);
        Assert.Equal("Família Lima", previa.Convites[0].Nome);
        Assert.Equal("Crianca", previa.Convites[0].Pessoas[1].FaixaEtaria);
        Assert.Empty(previa.LinhasComProblema);
    }

    [Fact]
    public async Task PreVisualizar_ComErro_DeveDevolverValoresOriginaisSoDasLinhasComProblema()
    {
        var previa = await _service.PreVisualizarAsync(_evento.Id, Fluxo(PlanilhaComErro), CancellationToken.None);

        var linha = Assert.Single(previa.LinhasComProblema);
        Assert.Equal(3, linha.Linha);
        Assert.Equal("123", linha.Valores.Telefone);
        Assert.Equal("Família Lima", linha.Valores.Convite);
        var problema = Assert.Single(linha.Problemas);
        Assert.Equal("Erro", problema.Tipo);
        Assert.Equal("Telefone", problema.Coluna);
        Assert.Equal(1, previa.Resumo.ConvitesValidos);
        Assert.Equal(1, previa.Resumo.PessoasValidas);
        Assert.Equal(1, previa.Resumo.LinhasComErro);
        Assert.False(previa.Convites[0].Valido);
    }

    [Fact]
    public async Task PreVisualizar_DeveInformarConvidadosExistentesEApontarJaCadastrados()
    {
        _convites.Itens.Add(Convite.Criar(
            _evento.Id,
            new DadosConvite(null, null, 0, [new DadosConvidado(null, "Carlos Dias", "21998765432", null, FaixaEtaria.Adulto, RespostaRsvp.Pendente)]),
            Agora));

        var previa = await _service.PreVisualizarAsync(_evento.Id, Fluxo(PlanilhaValida), CancellationToken.None);

        Assert.Equal(1, previa.Resumo.ConvidadosExistentes);
        Assert.Equal(1, previa.Resumo.LinhasDuplicadas);
        Assert.Equal("Duplicado", previa.LinhasComProblema.Single().Problemas.Single().Tipo);
    }

    [Fact]
    public async Task PreVisualizar_EventoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.PreVisualizarAsync(Guid.NewGuid(), Fluxo(PlanilhaValida), CancellationToken.None));
    }

    [Fact]
    public async Task PreVisualizarEImportar_EventoArquivado_DevemLancar422()
    {
        var arquivado = NovoEvento(arquivado: true);

        var previa = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.PreVisualizarAsync(arquivado.Id, Fluxo(PlanilhaValida), CancellationToken.None));
        var importacao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(arquivado.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None));

        Assert.Equal(MensagensConvidados.EventoArquivado, previa.Message);
        Assert.Equal(MensagensConvidados.EventoArquivado, importacao.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_SemProblemas_DeveCriarTodosOsConvitesNumUnicoSalvamento()
    {
        var resultado = await _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None);

        Assert.Equal(new ResultadoImportacaoDto(2, 3), resultado);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(1, _convites.ChamadasAdicionarVarios);
        Assert.Equal(2, _convites.Itens.Count);
        var familia = _convites.Itens[0];
        Assert.Equal(_evento.Id, familia.EventoId);
        Assert.Equal(StatusEnvioConvite.NaoEnviado, familia.StatusEnvio);
        Assert.Equal(["Ana Lima", "Bia Lima"], familia.ConvidadosOrdenados().Select(pessoa => pessoa.Nome));
        Assert.Equal("Carlos Dias", _convites.Itens[1].Nome);
    }

    [Fact]
    public async Task Importar_ComProblemasSemSomenteValidos_DeveLancar422ENaoGravar()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(false, 1, 1), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.ImportacaoComProblemas, excecao.Message);
        Assert.Empty(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_SomenteValidos_DeveDeixarDeForaOConviteInteiroComProblema()
    {
        var resultado = await _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(true, 1, 1), CancellationToken.None);

        Assert.Equal(new ResultadoImportacaoDto(1, 1), resultado);
        var convite = Assert.Single(_convites.Itens);
        Assert.Equal("Carlos Dias", convite.Nome);
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 3)]
    [InlineData(0, 0)]
    public async Task Importar_ConferenciaDivergente_DeveLancar422ENaoGravar(int convites, int pessoas)
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaComErro), new ConfirmarImportacaoRequest(true, convites, pessoas), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.PlanilhaAlterada, excecao.Message);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Importar_NenhumConviteValido_DeveLancar422()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_evento.Id, Fluxo("Nome;Telefone\nAna;123\n"), new ConfirmarImportacaoRequest(true, 0, 0), CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.NenhumConviteValido, excecao.Message);
    }

    [Fact]
    public async Task Importar_AcimaDoLimiteDoEvento_DeveLancar422ENaoGravar()
    {
        _convites.ContagemForcada = Convite.ConvidadosMaximoPorEvento - 2;

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaValida), new ConfirmarImportacaoRequest(false, 2, 3), CancellationToken.None));

        Assert.Equal(MensagensConvidados.LimitePorEvento, excecao.Message);
        Assert.Empty(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task LerConteudo_AcimaDe2MB_DeveLancar422()
    {
        var grande = new MemoryStream(new byte[LimitesImportacao.TamanhoMaximoBytes + 1]);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => ImportacaoConvidadosService.LerConteudoAsync(grande, CancellationToken.None));

        Assert.Equal(MensagensImportacaoConvidados.ArquivoGrandeDemais, excecao.Message);
    }

    [Fact]
    public async Task LerConteudo_Exatamente2MB_DeveAceitar()
    {
        var limite = new MemoryStream(new byte[LimitesImportacao.TamanhoMaximoBytes]);

        var bytes = await ImportacaoConvidadosService.LerConteudoAsync(limite, CancellationToken.None);

        Assert.Equal(LimitesImportacao.TamanhoMaximoBytes, bytes.Length);
    }

    [Fact]
    public async Task Parametros_Nulos_DevemLancarArgumentNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.PreVisualizarAsync(_evento.Id, null!, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.ImportarAsync(_evento.Id, Fluxo(PlanilhaValida), null!, CancellationToken.None));
    }

    private sealed class RepositorioEventos : IEventoRepository
    {
        public List<Evento> Itens { get; } = [];

        public Task<IReadOnlyList<Evento>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<Evento> resultado = Itens.Where(evento => evento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Evento?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(evento => evento.Id == id));
        }

        public void Adicionar(Evento evento)
        {
            Itens.Add(evento);
        }
    }

    private sealed class RepositorioConvites : IConviteRepository
    {
        public List<Convite> Itens { get; } = [];

        public int? ContagemForcada { get; set; }

        public int ChamadasAdicionarVarios { get; private set; }

        public Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return ListarPorEventoAsync(eventoId, cancelamento);
        }

        public Task<IReadOnlyList<Convite>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            IReadOnlyList<Convite> resultado = Itens.Where(convite => convite.EventoId == eventoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Convite?> ObterPorIdAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(convite => convite.Id == conviteId && convite.EventoId == eventoId));
        }

        public Task<int> ContarConvidadosAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ContagemForcada ?? Itens.Where(convite => convite.EventoId == eventoId).Sum(convite => convite.Convidados.Count));
        }

        public Task<ResumoConvidados> ObterResumoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return Task.FromResult(new ResumoConvidados([], 0, 0));
        }

        public Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ResumoEnvioConvites.Vazio);
        }

        public Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid eventoId, CancellationToken cancelamento)
        {
            IReadOnlyList<IdentificacaoConvidado> resultado = Itens
                .Where(convite => convite.EventoId == eventoId)
                .SelectMany(convite => convite.Convidados)
                .Select(convidado => new IdentificacaoConvidado(convidado.Nome, convidado.Telefone))
                .ToList();
            return Task.FromResult(resultado);
        }

        public void Adicionar(Convite convite)
        {
            Itens.Add(convite);
        }

        public void AdicionarVarios(IEnumerable<Convite> convites)
        {
            ChamadasAdicionarVarios++;
            Itens.AddRange(convites);
        }

        public void Remover(Convite convite)
        {
            Itens.Remove(convite);
        }
    }

    private sealed class UnidadeTrabalho : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
