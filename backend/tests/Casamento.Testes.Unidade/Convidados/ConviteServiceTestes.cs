using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Testes.Unidade.Autenticacao.Fakes;
using Casamento.Testes.Unidade.Mesas;

namespace Casamento.Testes.Unidade.Convidados;

public class ConviteServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioCasamentosMemoria _casamentos = new();
    private readonly RepositorioConvitesMemoria _convites = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly ConviteService _service;
    private readonly CasamentoAssessorado _casamento;

    public ConviteServiceTestes()
    {
        _service = new ConviteService(_casamentos, _convites, _unidadeTrabalho, new RelogioFixo(Agora), UsuarioAtualFalso.Dono(), new RepositorioMesasMemoria());
        _casamento = NovoCasamento();
    }

    private CasamentoAssessorado NovoCasamento(bool arquivado = false, int? estimados = 150)
    {
        var casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "Bruno", new DateOnly(2027, 5, 15), null, null, null, estimados, null),
            Agora);
        if (arquivado)
        {
            casamento.Arquivar(Agora);
        }
        _casamentos.Itens.Add(casamento);
        return casamento;
    }

    private static SalvarConviteRequest Request(string? nome = "Família Souza", params SalvarConvidadoRequest[] pessoas)
    {
        return new SalvarConviteRequest(nome, "Família da noiva", 1, pessoas.Length > 0 ? pessoas : [Pessoa()]);
    }

    private static SalvarConvidadoRequest Pessoa(string nome = "Carla", Guid? id = null, RespostaRsvp? resposta = null, FaixaEtaria? faixa = null)
    {
        return new SalvarConvidadoRequest(id, nome, "(11) 98765-4321", null, faixa, resposta);
    }

    [Fact]
    public async Task Criar_DeveAdicionarSalvarERetornarDto()
    {
        var dto = await _service.CriarAsync(_casamento.Id, Request(), CancellationToken.None);

        var convite = Assert.Single(_convites.Itens);
        Assert.Equal(_casamento.Id, convite.CasamentoId);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
        Assert.Equal(convite.Id, dto.Id);
        Assert.Equal("NaoEnviado", dto.StatusEnvio);
        var pessoa = Assert.Single(dto.Convidados);
        Assert.Equal("11987654321", pessoa.Telefone);
        Assert.Equal("Adulto", pessoa.FaixaEtaria);
        Assert.Equal("Pendente", pessoa.Resposta);
        Assert.Equal(Agora, dto.CriadoEm);
    }

    [Fact]
    public async Task Criar_CasamentoInexistente_DeveLancar404ENaoSalvar()
    {
        var excecao = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.CriarAsync(Guid.NewGuid(), Request(), CancellationToken.None));

        Assert.Equal(MensagensCasamento.NaoEncontrado, excecao.Message);
        Assert.Empty(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task EscritaEmCasamentoArquivado_DeveLancar422ENaoSalvar()
    {
        var arquivado = NovoCasamento(arquivado: true);
        var existente = Convite.Criar(arquivado.Id, new DadosConvite("Xavier", null, 0, [new DadosConvidado(null, "Ana", null, null, FaixaEtaria.Adulto, RespostaRsvp.Pendente)]), Agora);
        _convites.Itens.Add(existente);

        var criar = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(arquivado.Id, Request(), CancellationToken.None));
        var atualizar = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.AtualizarAsync(arquivado.Id, existente.Id, Request("Novo"), CancellationToken.None));
        var remover = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RemoverAsync(arquivado.Id, existente.Id, CancellationToken.None));

        Assert.All([criar, atualizar, remover], excecao => Assert.Equal(MensagensConvidados.CasamentoArquivado, excecao.Message));
        Assert.Equal("Xavier", existente.Nome);
        Assert.Single(_convites.Itens);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Listar_CasamentoArquivado_DevePermitirLeitura()
    {
        var arquivado = NovoCasamento(arquivado: true, estimados: null);

        var lista = await _service.ListarAsync(arquivado.Id, CancellationToken.None);

        Assert.True(lista.CasamentoArquivado);
        Assert.Null(lista.ConvidadosEstimados);
        Assert.Empty(lista.Convites);
    }

    [Fact]
    public async Task Listar_DeveOrdenarECalcularTotais()
    {
        await _service.CriarAsync(_casamento.Id, Request("Zélia", Pessoa("Zélia", resposta: RespostaRsvp.Confirmado)), CancellationToken.None);
        await _service.CriarAsync(_casamento.Id, Request("Álvaro", Pessoa("Álvaro"), Pessoa("Téo", faixa: FaixaEtaria.Crianca)), CancellationToken.None);

        var lista = await _service.ListarAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(["Álvaro", "Zélia"], lista.Convites.Select(convite => convite.Nome));
        Assert.Equal(150, lista.ConvidadosEstimados);
        Assert.Equal(3, lista.Totais.Pessoas);
        Assert.Equal(1, lista.Totais.Criancas);
        Assert.Equal(1, lista.Totais.Confirmados.Total);
        Assert.Equal(2, lista.Totais.AcompanhantesPermitidos);
    }

    [Fact]
    public async Task ObterTotais_DeveUsarResumoDoRepositorio()
    {
        _convites.Resumo = new ResumoConvidados([new ContagemConvidados(FaixaEtaria.Crianca, RespostaRsvp.Confirmado, 4)], 2, 3);

        var totais = await _service.ObterTotaisAsync(_casamento.Id, CancellationToken.None);

        Assert.Equal(4, totais.Pessoas);
        Assert.Equal(new TotaisPorFaixaDto(0, 4, 4), totais.Confirmados);
        Assert.Equal(_casamento.Id, _convites.UltimoCasamentoResumo);
    }

    [Fact]
    public async Task ObterTotais_CasamentoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.ObterTotaisAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task Obter_ConviteInexistenteOuDeOutroCasamento_DeveLancar404()
    {
        var outroCasamento = NovoCasamento();
        var dto = await _service.CriarAsync(outroCasamento.Id, Request(), CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.ObterAsync(_casamento.Id, dto.Id, CancellationToken.None));

        Assert.Equal(MensagensConvidados.ConviteNaoEncontrado, excecao.Message);
    }

    [Fact]
    public async Task Atualizar_DeveSincronizarESalvar()
    {
        var criado = await _service.CriarAsync(_casamento.Id, Request("Lima", Pessoa("Ana"), Pessoa("Bruno")), CancellationToken.None);

        var atualizado = await _service.AtualizarAsync(
            _casamento.Id,
            criado.Id,
            Request("Lima", Pessoa("Bruno", criado.Convidados[1].Id, RespostaRsvp.Recusado)),
            CancellationToken.None);

        var pessoa = Assert.Single(atualizado.Convidados);
        Assert.Equal(criado.Convidados[1].Id, pessoa.Id);
        Assert.Equal("Recusado", pessoa.Resposta);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Criar_AcimaDoLimitePorCasamento_DeveLancar422()
    {
        _convites.ContagemForcada = Convite.ConvidadosMaximoPorCasamento;

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.CriarAsync(_casamento.Id, Request(), CancellationToken.None));

        Assert.Equal(MensagensConvidados.LimitePorCasamento, excecao.Message);
        Assert.Empty(_convites.Itens);
    }

    [Fact]
    public async Task Atualizar_NoLimiteSemAumentarPessoas_DevePermitir()
    {
        var criado = await _service.CriarAsync(_casamento.Id, Request("Lima", Pessoa("Ana")), CancellationToken.None);
        _convites.ContagemForcada = Convite.ConvidadosMaximoPorCasamento;

        var atualizado = await _service.AtualizarAsync(_casamento.Id, criado.Id, Request("Lima", Pessoa("Ana Maria", criado.Convidados[0].Id)), CancellationToken.None);

        Assert.Equal("Ana Maria", atualizado.Convidados[0].Nome);
    }

    [Fact]
    public async Task Remover_DeveRemoverESalvar()
    {
        var criado = await _service.CriarAsync(_casamento.Id, Request(), CancellationToken.None);

        await _service.RemoverAsync(_casamento.Id, criado.Id, CancellationToken.None);

        Assert.Empty(_convites.Itens);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_Inexistente_DeveLancar404ENaoSalvar()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RemoverAsync(_casamento.Id, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task RequestNulo_DeveLancarArgumentNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.CriarAsync(_casamento.Id, null!, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.AtualizarAsync(_casamento.Id, Guid.NewGuid(), null!, CancellationToken.None));
    }

    private sealed class RepositorioCasamentosMemoria : ICasamentoRepository
    {
        public List<CasamentoAssessorado> Itens { get; } = [];

        public Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<CasamentoAssessorado> resultado = Itens.Where(casamento => casamento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(casamento => casamento.Id == id));
        }

        public void Adicionar(CasamentoAssessorado casamento)
        {
            Itens.Add(casamento);
        }
    }

    private sealed class RepositorioConvitesMemoria : IConviteRepository
    {
        public List<Convite> Itens { get; } = [];

        public int? ContagemForcada { get; set; }

        public ResumoConvidados Resumo { get; set; } = new([], 0, 0);

        public Guid? UltimoCasamentoResumo { get; private set; }

        public Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return ListarPorCasamentoAsync(casamentoId, cancelamento);
        }

        public Task<IReadOnlyList<Convite>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<Convite> resultado = Itens.Where(convite => convite.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Convite?> ObterPorIdAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(convite => convite.Id == conviteId && convite.CasamentoId == casamentoId));
        }

        public Task<int> ContarConvidadosAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ContagemForcada ?? Itens.Where(convite => convite.CasamentoId == casamentoId).Sum(convite => convite.Convidados.Count));
        }

        public Task<ResumoConvidados> ObterResumoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            UltimoCasamentoResumo = casamentoId;
            return Task.FromResult(Resumo);
        }

        public Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ResumoEnvioConvites.Vazio);
        }

        public void Adicionar(Convite convite)
        {
            Itens.Add(convite);
        }

        public Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<IdentificacaoConvidado> resultado = Itens
                .Where(convite => convite.CasamentoId == casamentoId)
                .SelectMany(convite => convite.Convidados)
                .Select(convidado => new IdentificacaoConvidado(convidado.Nome, convidado.Telefone))
                .ToList();
            return Task.FromResult(resultado);
        }

        public void AdicionarVarios(IEnumerable<Convite> convites)
        {
            Itens.AddRange(convites);
        }

        public void Remover(Convite convite)
        {
            Itens.Remove(convite);
        }
    }

    private sealed class UnidadeTrabalhoContador : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
