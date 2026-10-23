using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.GrandeDia;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Celebri.Testes.Unidade.Fornecedores;

namespace Celebri.Testes.Unidade.Cronogramas;

public class GrandeDiaServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 5, 15, 19, 34, 0, TimeSpan.Zero);
    private static readonly DateOnly DataEvento = new(2027, 5, 15);

    private readonly RepositorioEventosMemoria _eventos = new();
    private readonly RepositorioItensMemoria _itens = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly UnidadeTrabalhoControlada _unidadeTrabalho = new();
    private readonly CalendarioLocalFixo _calendario = new(DataEvento) { Hora = new TimeOnly(16, 34) };
    private readonly Evento _evento;

    public GrandeDiaServiceTestes()
    {
        _evento = Evento.Criar(
            new DadosEvento("Luísa", "Pedro", DataEvento, new TimeOnly(16, 30), "Capela São José", "Espaço Jardim", null, null),
            Agora);
        _eventos.Itens.Add(_evento);
    }

    private GrandeDiaService Service(IUsuarioAtual? usuario = null)
    {
        return new GrandeDiaService(
            _eventos,
            _itens,
            _vinculos,
            _unidadeTrabalho,
            _calendario,
            new RelogioFixo(Agora),
            usuario ?? UsuarioAtualFalso.Dono());
    }

    private ItemCronograma Adicionar(int hora, int minuto, int? duracao, string atividade, Guid? fornecedor = null, Guid? eventoId = null)
    {
        var item = ItemCronograma.Criar(
            eventoId ?? _evento.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(hora, minuto), duracao, atividade, "Capela", "Fernanda", fornecedor, "Instruções", "Pagar saldo"),
            null,
            Agora);
        _itens.Itens.Add(item);
        return item;
    }

    private Guid AdicionarVinculo(string? telefone = "11987654321")
    {
        var fornecedor = Fornecedor.Criar(
            new DadosFornecedor(CategoriaFornecedor.Musica, "Coral Harmonia", "Carla", telefone, null, null, null, null),
            Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        var vinculo = FornecedorEvento.Criar(
            _evento.Id,
            fornecedor.Id,
            new DadosFornecedorEvento("Música", 1_000m, null, StatusFornecedorEvento.Cotacao, null),
            null,
            Agora);
        _vinculos.Itens.Add(vinculo);
        return vinculo.Id;
    }

    [Fact]
    public async Task Consultar_DeveMontarMomentoSituacoesEContatos()
    {
        var vinculo = AdicionarVinculo();
        Adicionar(17, 15, 45, "Fotos com a família");
        Adicionar(16, 30, 45, "Cerimônia", vinculo);
        Adicionar(14, 0, 90, "Montagem");

        var dto = await Service().ConsultarAsync(_evento.Id, CancellationToken.None);

        Assert.Equal(new DateTime(2027, 5, 15, 16, 34, 0), dto.Momento.Agora);
        Assert.Equal(DateTimeKind.Unspecified, dto.Momento.Agora.Kind);
        Assert.Equal("NoDia", dto.Momento.Fase);
        Assert.Equal(0, dto.Momento.DiasParaOEvento);
        Assert.Equal(["Montagem", "Cerimônia", "Fotos com a família"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal(["SemMarcar", "Agora", "Proximo"], dto.Itens.Select(item => item.Situacao));
        var cerimonia = dto.Itens[1];
        Assert.Equal(new FornecedorGrandeDiaDto("Coral Harmonia", "Musica", "Carla", "11987654321"), cerimonia.Fornecedor);
        Assert.Equal("Pagar saldo", cerimonia.NotasInternas);
        Assert.Equal("16:30", dto.HorarioCerimonia);
        Assert.Equal("Luísa", dto.NomePrimeiraPessoa);
        Assert.False(dto.SomenteLeitura);
        Assert.False(dto.Arquivado);
    }

    [Fact]
    public async Task Consultar_ComoAnfitriao_DeveSerSomenteLeituraSemNotasInternasEComContatos()
    {
        var vinculo = AdicionarVinculo();
        Adicionar(16, 30, 45, "Cerimônia", vinculo);

        var dto = await Service(UsuarioAtualFalso.Anfitriao(_evento.Id)).ConsultarAsync(_evento.Id, CancellationToken.None);

        Assert.True(dto.SomenteLeitura);
        Assert.Null(dto.Itens[0].NotasInternas);
        Assert.Equal("11987654321", dto.Itens[0].Fornecedor!.Telefone);
    }

    [Fact]
    public async Task Consultar_EventoInexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConsultarAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Concluir_DeveMarcarComInstanteDoServidorERecalcular()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        Adicionar(17, 15, 45, "Fotos");

        var dto = await Service().ConcluirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(StatusItemCronograma.Concluido, cerimonia.Status);
        Assert.Equal(Agora, cerimonia.ConcluidoEm);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
        Assert.Equal("Concluido", dto.Itens[0].Status);
        Assert.Equal(Agora, dto.Itens[0].ConcluidoEm);
        Assert.Equal("Proximo", dto.Itens[1].Situacao);
    }

    [Fact]
    public async Task Concluir_ItemJaFeito_DeveSerIdempotenteSemGravar()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        var antes = Agora.AddMinutes(-5);
        cerimonia.MarcarConcluido(antes);

        var dto = await Service().ConcluirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Equal(antes, cerimonia.ConcluidoEm);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Reabrir_DeveLimparConclusao()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        cerimonia.MarcarConcluido(Agora.AddMinutes(-5));

        var dto = await Service().ReabrirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(StatusItemCronograma.Previsto, cerimonia.Status);
        Assert.Null(cerimonia.ConcluidoEm);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal("Agora", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Reabrir_ItemPrevisto_DeveSerIdempotente()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");

        await Service().ReabrirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Concluir_EventoArquivado_DeveLancarRegraDeNegocio()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _evento.Arquivar(Agora);

        await Assert.ThrowsAsync<RegraNegocioException>(() => Service().ConcluirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => Service().ReabrirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None));
        Assert.Equal(StatusItemCronograma.Previsto, cerimonia.Status);
    }

    [Fact]
    public async Task Consultar_EventoArquivado_DeveSerSomenteLeitura()
    {
        _evento.Arquivar(Agora);

        var dto = await Service().ConsultarAsync(_evento.Id, CancellationToken.None);

        Assert.True(dto.Arquivado);
        Assert.True(dto.SomenteLeitura);
    }

    [Fact]
    public async Task Concluir_ItemDeOutroEvento_DeveLancarNaoEncontrado()
    {
        var outro = Adicionar(16, 30, 45, "Outro", eventoId: Guid.NewGuid());

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConcluirItemAsync(_evento.Id, outro.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => Service().ConcluirItemAsync(_evento.Id, Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Concluir_ConcorrenciaComMesmoResultado_DeveResponderSemErro()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _unidadeTrabalho.FalharComConcorrencia = true;

        var dto = await Service().ConcluirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None);

        Assert.Equal(1, _unidadeTrabalho.Descartes);
        Assert.Equal("Feito", dto.Itens[0].Situacao);
    }

    [Fact]
    public async Task Concluir_ConcorrenciaComEstadoDivergente_DeveLancarConcorrenciaAmigavel()
    {
        var cerimonia = Adicionar(16, 30, 45, "Cerimônia");
        _unidadeTrabalho.FalharComConcorrencia = true;
        _unidadeTrabalho.AoDescartar = () => cerimonia.Reabrir(Agora);

        var excecao = await Assert.ThrowsAsync<ConcorrenciaException>(() => Service().ConcluirItemAsync(_evento.Id, cerimonia.Id, CancellationToken.None));

        Assert.Equal(MensagensGrandeDia.AtualizadoEmOutroAparelho, excecao.Message);
        Assert.IsType<ConcorrenciaException>(excecao.InnerException);
    }

    [Fact]
    public async Task Consultar_ForaDoDia_DeveInformarFaseEDias()
    {
        Adicionar(16, 30, 45, "Cerimônia");
        _calendario.Data = DataEvento.AddDays(-12);

        var antes = await Service().ConsultarAsync(_evento.Id, CancellationToken.None);
        _calendario.Data = DataEvento.AddDays(3);
        var depois = await Service().ConsultarAsync(_evento.Id, CancellationToken.None);

        Assert.Equal("AntesDoDia", antes.Momento.Fase);
        Assert.Equal(12, antes.Momento.DiasParaOEvento);
        Assert.Equal("Depois", antes.Itens[0].Situacao);
        Assert.Equal("DepoisDoDia", depois.Momento.Fase);
        Assert.Equal("SemMarcar", depois.Itens[0].Situacao);
    }

    [Fact]
    public void MomentoDto_DeveDescartarFracoesEFuso()
    {
        var retrato = MomentoGrandeDia.Calcular([], DataEvento, new DateTime(2027, 5, 15, 10, 0, 0));
        var dto = MomentoGrandeDiaDto.De(retrato, new DateTime(2027, 5, 15, 10, 0, 5, 750, DateTimeKind.Utc));

        Assert.Equal(new DateTime(2027, 5, 15, 10, 0, 5), dto.Agora);
        Assert.Equal(DateTimeKind.Unspecified, dto.Agora.Kind);
        Assert.Throws<ArgumentNullException>(() => MomentoGrandeDiaDto.De(null!, DateTime.Now));
    }

    private sealed class RepositorioEventosMemoria : IEventoRepository
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

    private sealed class RepositorioItensMemoria : IItemCronogramaRepository
    {
        public List<ItemCronograma> Itens { get; } = [];

        public Task<IReadOnlyList<ItemCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            IReadOnlyList<ItemCronograma> resultado = Itens.Where(item => item.EventoId == eventoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<ItemCronograma?> ObterPorIdAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(item => item.EventoId == eventoId && item.Id == itemId));
        }

        public Task<int> ContarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.Count(item => item.EventoId == eventoId));
        }

        public void Adicionar(ItemCronograma item)
        {
            Itens.Add(item);
        }

        public void Remover(ItemCronograma item)
        {
            Itens.Remove(item);
        }
    }

    private sealed class UnidadeTrabalhoControlada : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public int Descartes { get; private set; }

        public bool FalharComConcorrencia { get; set; }

        public Action? AoDescartar { get; set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            if (FalharComConcorrencia)
            {
                throw new ConcorrenciaException("O registro foi alterado por outra operação.");
            }

            Salvamentos++;
            return Task.CompletedTask;
        }

        public void DescartarAlteracoes()
        {
            Descartes++;
            AoDescartar?.Invoke();
        }
    }
}
