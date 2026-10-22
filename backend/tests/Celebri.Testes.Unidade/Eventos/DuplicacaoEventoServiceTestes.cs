using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.Eventos;

public class DuplicacaoEventoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Hoje = new(2026, 9, 30);
    private static readonly DateOnly DataOrigem = new(2027, 5, 15);

    private readonly RepositorioEventos _eventos = new();
    private readonly RepositorioDuplicacao _duplicacao = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly UsuarioAtualFalso _usuario = UsuarioAtualFalso.Dono();
    private readonly DuplicacaoEventoService _service;
    private readonly Evento _origem;

    public DuplicacaoEventoServiceTestes()
    {
        _service = new DuplicacaoEventoService(
            _eventos,
            _duplicacao,
            _unidadeTrabalho,
            new CalendarioLocalFixo(Hoje),
            new RelogioFixo(Agora),
            _usuario);
        _origem = Evento.Criar(
            new DadosEvento("Ana", "João", DataOrigem, new TimeOnly(16, 0), "Capela", "Salão", 180, "Mãe da noiva: (11) 99999-0000", DataOrigem.AddDays(-20)),
            Agora.AddDays(-200));
        _eventos.Itens.Add(_origem);
    }

    private static DuplicarEventoRequest Request(
        bool copiarTarefas = true,
        bool copiarFornecedores = true,
        DateOnly? data = null,
        string nomePrimeiraPessoa = "Carla")
    {
        return new DuplicarEventoRequest(
            nomePrimeiraPessoa,
            "Diego",
            data ?? new DateOnly(2028, 5, 13),
            "17:30",
            " Igreja Matriz ",
            null,
            copiarTarefas,
            copiarFornecedores);
    }

    private TarefaEvento AdicionarTarefa(string titulo, DateOnly? prazo, StatusTarefa status = StatusTarefa.AFazer, int? dias = null)
    {
        var tarefa = TarefaEvento.Criar(
            _origem.Id,
            new DadosTarefa(titulo, null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Geral, prazo),
            Guid.NewGuid(),
            Agora.AddDays(-100),
            dias is null ? null : Guid.NewGuid());
        if (status != StatusTarefa.AFazer)
        {
            tarefa.AlterarStatus(status, ResponsavelTarefa.Assessoria, Guid.NewGuid(), Agora);
        }

        _duplicacao.Tarefas.Add(new TarefaParaDuplicar(tarefa, dias));
        return tarefa;
    }

    private void AdicionarVinculo(StatusFornecedorEvento status, bool fornecedorArquivado = false)
    {
        var vinculo = FornecedorEvento.Criar(
            _origem.Id,
            Guid.NewGuid(),
            new DadosFornecedorEvento("Serviço", 1_000m, status == StatusFornecedorEvento.Contratado ? 1_200m : null, status, "Nota interna"),
            Guid.NewGuid(),
            Agora.AddDays(-80));
        _duplicacao.Vinculos.Add(new VinculoParaDuplicar(vinculo, fornecedorArquivado));
    }

    private void CenarioCompleto()
    {
        AdicionarTarefa("Do checklist", DataOrigem.AddDays(-180), dias: 180);
        AdicionarTarefa("Manual concluída", DataOrigem.AddDays(-30), StatusTarefa.Concluida);
        AdicionarTarefa("Cancelada", null, StatusTarefa.Cancelada);
        AdicionarVinculo(StatusFornecedorEvento.Contratado);
        AdicionarVinculo(StatusFornecedorEvento.Cotacao, fornecedorArquivado: true);
        AdicionarVinculo(StatusFornecedorEvento.Cancelado);
    }

    [Fact]
    public async Task Duplicar_DeveGravarTudoEmUmUnicoSalvamento()
    {
        CenarioCompleto();

        var resultado = await _service.DuplicarAsync(_origem.Id, Request(), CancellationToken.None);

        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(2, _eventos.Itens.Count);
        var novo = _eventos.Itens[1];
        Assert.Equal(novo.Id, resultado.Evento.Id);
        Assert.Equal(2, resultado.TarefasCopiadas);
        Assert.Equal(1, resultado.FornecedoresCopiados);
        Assert.Equal(2, _duplicacao.TarefasAdicionadas.Count);
        Assert.Single(_duplicacao.VinculosAdicionados);
        Assert.All(_duplicacao.TarefasAdicionadas, tarefa => Assert.Equal(novo.Id, tarefa.EventoId));
        Assert.All(_duplicacao.TarefasAdicionadas, tarefa => Assert.Equal(_usuario.UsuarioId, tarefa.CriadoPorUsuarioId));
        Assert.All(_duplicacao.VinculosAdicionados, vinculo => Assert.Equal(novo.Id, vinculo.EventoId));
        Assert.Equal(0, resultado.Evento.PercentualChecklist);
    }

    [Fact]
    public async Task Duplicar_DeveUsarSoOsDadosInformadosSemDadosDoAnfitriaoDeOrigem()
    {
        var resultado = await _service.DuplicarAsync(_origem.Id, Request(), CancellationToken.None);

        var dto = resultado.Evento;
        Assert.NotEqual(_origem.Id, dto.Id);
        Assert.Equal("Carla", dto.NomePrimeiraPessoa);
        Assert.Equal("Diego", dto.NomeSegundaPessoa);
        Assert.Equal(new DateOnly(2028, 5, 13), dto.Data);
        Assert.Equal("17:30", dto.Horario);
        Assert.Equal("Igreja Matriz", dto.LocalCerimonia);
        Assert.Null(dto.LocalRecepcao);
        Assert.Null(dto.Observacoes);
        Assert.Null(dto.ConvidadosEstimados);
        Assert.Null(dto.DataLimiteRsvp);
        Assert.False(dto.Arquivado);
        Assert.Equal(Agora, dto.CriadoEm);
        Assert.Null(dto.PercentualChecklist);
    }

    [Fact]
    public async Task Duplicar_OpcoesDesmarcadas_NaoDeveConsultarNemCopiar()
    {
        CenarioCompleto();

        var resultado = await _service.DuplicarAsync(_origem.Id, Request(copiarTarefas: false, copiarFornecedores: false), CancellationToken.None);

        Assert.Equal(0, resultado.TarefasCopiadas);
        Assert.Equal(0, resultado.FornecedoresCopiados);
        Assert.Equal(0, _duplicacao.ConsultasTarefas);
        Assert.Equal(0, _duplicacao.ConsultasVinculos);
        Assert.Empty(_duplicacao.TarefasAdicionadas);
        Assert.Empty(_duplicacao.VinculosAdicionados);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    private void AdicionarItemCronograma(string atividade, int hora)
    {
        _duplicacao.ItensCronograma.Add(ItemCronograma.Criar(
            _origem.Id,
            new DadosItemCronograma(DiaCronograma.DiaDoEvento, new TimeOnly(hora, 0), 30, atividade, "Capela", "Ana", null, null, "Nota"),
            null,
            Agora.AddDays(-50)));
    }

    [Fact]
    public async Task Previa_DeveContarItensDoCronograma()
    {
        AdicionarItemCronograma("Cerimônia", 16);
        AdicionarItemCronograma("Making of", 13);

        var previa = await _service.PreverAsync(_origem.Id, null, CancellationToken.None);

        Assert.Equal(2, previa.ItensCronograma);
        Assert.Equal(1, _duplicacao.ConsultasCronograma);
    }

    [Fact]
    public async Task Duplicar_ComCronograma_DeveCopiarRelativoACerimoniaNoMesmoSalvamento()
    {
        AdicionarItemCronograma("Cerimônia", 16);

        var resultado = await _service.DuplicarAsync(_origem.Id, Request(), CancellationToken.None);

        var item = Assert.Single(_duplicacao.ItensCronogramaAdicionados);
        Assert.Equal(1, resultado.ItensCronogramaCopiados);
        Assert.Equal(resultado.Evento.Id, item.EventoId);
        Assert.Equal(new TimeOnly(17, 30), item.Inicio);
        Assert.Equal("Igreja Matriz", item.Local);
        Assert.Null(item.NotasInternas);
        Assert.Equal(_usuario.UsuarioId, item.CriadoPorUsuarioId);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Duplicar_SemOpcaoCronograma_NaoDeveConsultarNemCopiar()
    {
        AdicionarItemCronograma("Cerimônia", 16);
        var request = Request() with { CopiarCronograma = false };

        var resultado = await _service.DuplicarAsync(_origem.Id, request, CancellationToken.None);

        Assert.Equal(0, resultado.ItensCronogramaCopiados);
        Assert.Equal(0, _duplicacao.ConsultasCronograma);
        Assert.Empty(_duplicacao.ItensCronogramaAdicionados);
    }

    [Fact]
    public async Task Duplicar_OrigemArquivada_DevePermitirECriarAtivo()
    {
        _origem.Arquivar(Agora);
        AdicionarTarefa("Manual", DataOrigem.AddDays(-1));

        var resultado = await _service.DuplicarAsync(_origem.Id, Request(), CancellationToken.None);

        Assert.False(resultado.Evento.Arquivado);
        Assert.Equal(1, resultado.TarefasCopiadas);
    }

    [Fact]
    public async Task Duplicar_OrigemInexistente_DeveLancar404SemSalvar()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.DuplicarAsync(Guid.NewGuid(), Request(), CancellationToken.None));

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Single(_eventos.Itens);
    }

    [Fact]
    public async Task Duplicar_DadosInvalidosNoDominio_DeveLancar422SemSalvar()
    {
        CenarioCompleto();

        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.DuplicarAsync(_origem.Id, Request(nomePrimeiraPessoa: "A"), CancellationToken.None));

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
        Assert.Empty(_duplicacao.TarefasAdicionadas);
    }

    [Fact]
    public async Task Duplicar_FalhaAoSalvar_DevePropagarSemSegundaTentativa()
    {
        CenarioCompleto();
        _unidadeTrabalho.Falhar = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.DuplicarAsync(_origem.Id, Request(), CancellationToken.None));

        Assert.Equal(1, _unidadeTrabalho.Tentativas);
    }

    [Fact]
    public async Task Prever_DeveRetornarContagensSemSalvar()
    {
        CenarioCompleto();

        var previa = await _service.PreverAsync(_origem.Id, new DateOnly(2027, 2, 1), CancellationToken.None);

        Assert.Equal(_origem.Id, previa.Origem.Id);
        Assert.Equal("Ana", previa.Origem.NomePrimeiraPessoa);
        Assert.Equal(2, previa.Tarefas);
        Assert.Equal(1, previa.TarefasDoChecklist);
        Assert.Equal(1, previa.TarefasCanceladasIgnoradas);
        Assert.Equal(1, previa.TarefasNascemAtrasadas);
        Assert.Equal(1, previa.Fornecedores);
        Assert.Equal(2, previa.FornecedoresIgnorados);
        Assert.Equal(0, _unidadeTrabalho.Tentativas);
        Assert.Single(_eventos.Itens);
    }

    [Fact]
    public async Task Prever_SemData_NaoDeveContarAtrasadas()
    {
        AdicionarTarefa("Antiga", new DateOnly(2001, 1, 1));

        var previa = await _service.PreverAsync(_origem.Id, null, CancellationToken.None);

        Assert.Equal(1, previa.Tarefas);
        Assert.Equal(0, previa.TarefasNascemAtrasadas);
    }

    [Fact]
    public async Task Prever_DataForaDaFaixa_DeveLancar422ComCampoData()
    {
        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.PreverAsync(_origem.Id, new DateOnly(2101, 1, 1), CancellationToken.None));

        Assert.Equal(DuplicacaoEventoService.CampoData, excecao.Campo);
        Assert.Equal(MensagensEvento.DataForaDaFaixa, excecao.Message);
    }

    [Fact]
    public async Task Prever_OrigemInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.PreverAsync(Guid.NewGuid(), null, CancellationToken.None));
    }

    [Fact]
    public void Request_DeveAplicarAsRegrasCompostasDoCadastro()
    {
        var invalido = new DuplicarEventoRequest(" a ", "  b", new DateOnly(1999, 1, 1), null, null, null);

        var erros = invalido.Validate(new ValidationContext(invalido)).ToList();

        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(DuplicarEventoRequest.NomePrimeiraPessoa)) && erro.ErrorMessage == MensagensEvento.TamanhoNome);
        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(DuplicarEventoRequest.NomeSegundaPessoa)));
        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(DuplicarEventoRequest.Data)) && erro.ErrorMessage == MensagensEvento.DataForaDaFaixa);
    }

    [Fact]
    public void Request_DevePadronizarOpcoesMarcadasEZerarDadosDoCliente()
    {
        var request = new DuplicarEventoRequest("Carla", "Diego", new DateOnly(2028, 5, 13), null, null, null);

        var dados = request.ParaDados();

        Assert.True(request.CopiarTarefas);
        Assert.True(request.CopiarFornecedores);
        Assert.Null(dados.Observacoes);
        Assert.Null(dados.ConvidadosEstimados);
        Assert.Null(dados.DataLimiteRsvp);
        Assert.Null(dados.Horario);
        Assert.Empty(request.Validate(new ValidationContext(request)));
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

    private sealed class RepositorioDuplicacao : IDuplicacaoEventoRepository
    {
        public List<TarefaParaDuplicar> Tarefas { get; } = [];

        public List<VinculoParaDuplicar> Vinculos { get; } = [];

        public List<TarefaEvento> TarefasAdicionadas { get; } = [];

        public List<FornecedorEvento> VinculosAdicionados { get; } = [];

        public int ConsultasTarefas { get; private set; }

        public int ConsultasVinculos { get; private set; }

        public List<ItemCronograma> ItensCronograma { get; } = [];

        public List<ItemCronograma> ItensCronogramaAdicionados { get; } = [];

        public int ConsultasCronograma { get; private set; }

        public Task<IReadOnlyList<ItemCronograma>> ListarItensCronogramaAsync(Guid eventoOrigemId, CancellationToken cancelamento)
        {
            ConsultasCronograma++;
            IReadOnlyList<ItemCronograma> resultado = ItensCronograma.Where(item => item.EventoId == eventoOrigemId).ToList();
            return Task.FromResult(resultado);
        }

        public void AdicionarItensCronograma(IEnumerable<ItemCronograma> itens)
        {
            ItensCronogramaAdicionados.AddRange(itens);
        }

        public Task<IReadOnlyList<TarefaParaDuplicar>> ListarTarefasAsync(Guid eventoOrigemId, CancellationToken cancelamento)
        {
            ConsultasTarefas++;
            IReadOnlyList<TarefaParaDuplicar> resultado = Tarefas.Where(item => item.Tarefa.EventoId == eventoOrigemId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<IReadOnlyList<VinculoParaDuplicar>> ListarVinculosAsync(Guid eventoOrigemId, CancellationToken cancelamento)
        {
            ConsultasVinculos++;
            IReadOnlyList<VinculoParaDuplicar> resultado = Vinculos.Where(item => item.Vinculo.EventoId == eventoOrigemId).ToList();
            return Task.FromResult(resultado);
        }

        public void AdicionarTarefas(IEnumerable<TarefaEvento> tarefas)
        {
            TarefasAdicionadas.AddRange(tarefas);
        }

        public void AdicionarVinculos(IEnumerable<FornecedorEvento> vinculos)
        {
            VinculosAdicionados.AddRange(vinculos);
        }
    }

    private sealed class UnidadeTrabalhoContador : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public int Tentativas { get; private set; }

        public bool Falhar { get; set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Tentativas++;
            if (Falhar)
            {
                throw new InvalidOperationException("Falha simulada ao salvar.");
            }

            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
