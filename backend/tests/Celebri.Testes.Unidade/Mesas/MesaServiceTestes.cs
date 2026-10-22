using System.ComponentModel.DataAnnotations;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Mesas;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Mesas;
using Casamento.Testes.Unidade.Autenticacao.Fakes;

namespace Casamento.Testes.Unidade.Mesas;

public class MesaServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly List<CasamentoAssessorado> _casamentos = [];
    private readonly List<Convite> _convites = [];
    private readonly RepositorioMesasMemoria _mesas;
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly MesaService _service;
    private readonly CasamentoAssessorado _casamento;

    public MesaServiceTestes()
    {
        _mesas = new RepositorioMesasMemoria(() => _convites.SelectMany(convite => convite.Convidados));
        _service = new MesaService(new CasamentosMemoria(_casamentos), new ConvitesMemoria(_convites), _mesas, _unidadeTrabalho, new RelogioFixo(Agora));
        _casamento = NovoCasamento();
    }

    private CasamentoAssessorado NovoCasamento(bool arquivado = false)
    {
        var casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "Bruno", new DateOnly(2027, 5, 15), null, null, null, 150, null),
            Agora);
        if (arquivado)
        {
            casamento.Arquivar(Agora);
        }

        _casamentos.Add(casamento);
        return casamento;
    }

    private Convite NovoConvite(CasamentoAssessorado casamento, string nome, params (string Nome, RespostaRsvp Resposta)[] pessoas)
    {
        var dados = pessoas.Select(pessoa => new DadosConvidado(null, pessoa.Nome, null, null, FaixaEtaria.Adulto, pessoa.Resposta)).ToList();
        var convite = Convite.Criar(casamento.Id, new DadosConvite(nome, null, 0, dados), Agora);
        _convites.Add(convite);
        return convite;
    }

    private async Task<MesaDto> CriarMesaAsync(int numero = 1, int capacidade = 8, bool especial = false)
    {
        return await _service.CriarAsync(_casamento.Id, new SalvarMesaRequest(numero, null, capacidade, especial), CancellationToken.None);
    }

    [Fact]
    public async Task Criar_DeveAdicionarESalvar()
    {
        var mesa = await _service.CriarAsync(_casamento.Id, new SalvarMesaRequest(2, "Padrinhos", 10, null), CancellationToken.None);

        Assert.Equal((2, "Padrinhos", 10, false, 0), (mesa.Numero, mesa.Nome, mesa.Capacidade, mesa.Especial, mesa.Ocupacao));
        Assert.Single(_mesas.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Criar_CasamentoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.CriarAsync(Guid.NewGuid(), new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
    }

    [Fact]
    public async Task Escritas_CasamentoArquivado_DevemLancar422ELeituraFunciona()
    {
        var arquivado = NovoCasamento(arquivado: true);
        var convite = NovoConvite(arquivado, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));
        var pessoas = new PessoasMesaRequest([convite.Convidados[0].Id]);

        var criar = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(arquivado.Id, new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(arquivado.Id, Guid.NewGuid(), pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RetirarAsync(arquivado.Id, pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.DispensarAvisosAsync(arquivado.Id, pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RemoverAsync(arquivado.Id, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(MensagensMesas.CasamentoArquivado, criar.Message);
        Assert.True((await _service.ObterMapaAsync(arquivado.Id, CancellationToken.None)).CasamentoArquivado);
        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Criar_NumeroRepetidoOuEspecialRepetida_DeveLancarNoCampo()
    {
        await CriarMesaAsync(1, especial: true);

        var numero = await Assert.ThrowsAsync<RegraNegocioException>(() => CriarMesaAsync(1));
        var especial = await Assert.ThrowsAsync<RegraNegocioException>(() => CriarMesaAsync(2, especial: true));

        Assert.Equal("numero", numero.Campo);
        Assert.Equal("especial", especial.Campo);
        Assert.Single(_mesas.Itens);
    }

    [Fact]
    public async Task Atualizar_MantendoOProprioNumero_NaoAcusaRepeticao()
    {
        var mesa = await CriarMesaAsync(4, especial: true);

        var atualizada = await _service.AtualizarAsync(_casamento.Id, mesa.Id, new SalvarMesaRequest(4, "Noivos", 10, true), CancellationToken.None);

        Assert.Equal(("Noivos", 10), (atualizada.Nome, atualizada.Capacidade));
    }

    [Fact]
    public async Task Atualizar_MesaInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.AtualizarAsync(_casamento.Id, Guid.NewGuid(), new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
    }

    [Fact]
    public async Task Criar_AcimaDoLimiteDeMesas_DeveLancar422()
    {
        for (var numero = 1; numero <= Mesa.MesasMaximoPorCasamento; numero++)
        {
            _mesas.Itens.Add(Mesa.Criar(_casamento.Id, new DadosMesa(numero, null, 8, false), Agora));
        }

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => CriarMesaAsync(999));

        Assert.Equal(MensagensMesas.LimitePorCasamento, excecao.Message);
    }

    [Fact]
    public async Task Sentar_DeveSentarSalvarEDevolverOMapa()
    {
        var mesa = await CriarMesaAsync(capacidade: 4);
        var convite = NovoConvite(_casamento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));

        var mapa = await _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest(convite.Convidados.Select(pessoa => pessoa.Id).ToList()), CancellationToken.None);

        Assert.Equal(2, mapa.Mesas.Single().Ocupacao);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(mesa.Id, pessoa.MesaId));
    }

    [Fact]
    public async Task Sentar_ConsideraOcupacaoAtualDaMesa()
    {
        var mesa = await CriarMesaAsync(capacidade: 2);
        var souza = NovoConvite(_casamento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));
        var rui = NovoConvite(_casamento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));
        await _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest(souza.Convidados.Select(pessoa => pessoa.Id).ToList()), CancellationToken.None);

        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest([rui.Convidados[0].Id]), CancellationToken.None));

        Assert.Null(rui.Convidados[0].MesaId);
    }

    [Fact]
    public async Task Sentar_PessoaDeOutroCasamentoOuInexistente_DeveLancar422()
    {
        var mesa = await CriarMesaAsync();
        var outro = NovoCasamento();
        var alheio = NovoConvite(outro, "Caio Rocha", ("Caio Rocha", RespostaRsvp.Confirmado));

        var deOutro = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest([alheio.Convidados[0].Id]), CancellationToken.None));
        var inexistente = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest([Guid.NewGuid()]), CancellationToken.None));

        Assert.Equal(MensagensMesas.PessoaDeOutroCasamento, deOutro.Message);
        Assert.Equal(MensagensMesas.PessoaDeOutroCasamento, inexistente.Message);
        Assert.Null(alheio.Convidados[0].MesaId);
    }

    [Fact]
    public async Task Sentar_ListaVaziaRepetidaOuGrandeDemais_DeveLancar422()
    {
        var mesa = await CriarMesaAsync();
        var id = Guid.NewGuid();

        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest([]), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest([id, id]), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest(Enumerable.Range(0, Mesa.PessoasMaximoPorOperacao + 1).Select(_ => Guid.NewGuid()).ToList()), CancellationToken.None));
    }

    [Fact]
    public async Task Sentar_MesaInexistente_DeveLancar404()
    {
        var convite = NovoConvite(_casamento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.SentarAsync(_casamento.Id, Guid.NewGuid(), new PessoasMesaRequest([convite.Convidados[0].Id]), CancellationToken.None));
    }

    [Fact]
    public async Task Retirar_SemAlteracao_NaoSalva()
    {
        var convite = NovoConvite(_casamento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));

        await _service.RetirarAsync(_casamento.Id, new PessoasMesaRequest([convite.Convidados[0].Id]), CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task RetirarEDispensar_DevemAlterarESalvar()
    {
        var mesa = await CriarMesaAsync();
        var convite = NovoConvite(_casamento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));
        var ids = convite.Convidados.Select(pessoa => pessoa.Id).ToList();
        await _service.SentarAsync(_casamento.Id, mesa.Id, new PessoasMesaRequest(ids), CancellationToken.None);
        convite.RegistrarRespostaRsvp([new RespostaPessoaRsvp(ids[0], RespostaRsvp.Recusado), new RespostaPessoaRsvp(ids[1], RespostaRsvp.Confirmado)], [], Agora);

        var antes = await _service.ObterMapaAsync(_casamento.Id, CancellationToken.None);
        var retirado = await _service.RetirarAsync(_casamento.Id, new PessoasMesaRequest([ids[1]]), CancellationToken.None);
        var dispensado = await _service.DispensarAvisosAsync(_casamento.Id, new PessoasMesaRequest([ids[0]]), CancellationToken.None);

        Assert.Single(antes.AvisosSaida);
        Assert.Equal(0, retirado.Mesas.Single().Ocupacao);
        Assert.Empty(dispensado.AvisosSaida);
        Assert.Equal(4, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_DeveRemoverESalvar()
    {
        var mesa = await CriarMesaAsync();

        await _service.RemoverAsync(_casamento.Id, mesa.Id, CancellationToken.None);

        Assert.Empty(_mesas.Itens);
        Assert.Single(_mesas.Removidas);
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RemoverAsync(_casamento.Id, mesa.Id, CancellationToken.None));
    }

    [Fact]
    public void SalvarMesaRequest_ParaDados_DeveAplicarPadroes()
    {
        Assert.Equal(new DadosMesa(3, "Tios", 6, false), new SalvarMesaRequest(3, "Tios", 6, null).ParaDados());
        Assert.Equal(new DadosMesa(0, null, 0, true), new SalvarMesaRequest(null, null, null, true).ParaDados());
    }

    [Fact]
    public void PessoasMesaRequest_RepetidosOuVazio_DeveFalharNaValidacao()
    {
        var id = Guid.NewGuid();
        var repetidos = new PessoasMesaRequest([id, id]);
        var vazio = new PessoasMesaRequest([Guid.Empty]);
        var resultadosRepetidos = new List<ValidationResult>();
        var resultadosVazio = new List<ValidationResult>();

        resultadosRepetidos.AddRange(repetidos.Validate(new ValidationContext(repetidos)));
        resultadosVazio.AddRange(vazio.Validate(new ValidationContext(vazio)));
        Assert.Contains(resultadosVazio, resultado => resultado.ErrorMessage == MensagensMesas.PessoaDeOutroCasamento);
        Assert.Contains(resultadosRepetidos, resultado => resultado.ErrorMessage == MensagensMesas.PessoaRepetida);
    }

    private sealed class CasamentosMemoria(List<CasamentoAssessorado> itens) : ICasamentoRepository
    {
        public Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<CasamentoAssessorado> resultado = itens.Where(casamento => casamento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.FirstOrDefault(casamento => casamento.Id == id));
        }

        public void Adicionar(CasamentoAssessorado casamento)
        {
            itens.Add(casamento);
        }
    }

    private sealed class ConvitesMemoria(List<Convite> itens) : IConviteRepository
    {
        public Task<IReadOnlyList<Convite>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<Convite> resultado = itens.Where(convite => convite.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return ListarPorCasamentoAsync(casamentoId, cancelamento);
        }

        public Task<Convite?> ObterPorIdAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.FirstOrDefault(convite => convite.CasamentoId == casamentoId && convite.Id == conviteId));
        }

        public Task<int> ContarConvidadosAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.Where(convite => convite.CasamentoId == casamentoId).Sum(convite => convite.Convidados.Count));
        }

        public Task<ResumoConvidados> ObterResumoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(new ResumoConvidados([], 0, 0));
        }

        public Task<ResumoEnvioConvites> ObterResumoEnvioAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(ResumoEnvioConvites.Vazio);
        }

        public Task<IReadOnlyList<IdentificacaoConvidado>> ListarIdentificacoesAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<IdentificacaoConvidado> resultado = [];
            return Task.FromResult(resultado);
        }

        public void Adicionar(Convite convite)
        {
            itens.Add(convite);
        }

        public void AdicionarVarios(IEnumerable<Convite> convites)
        {
            itens.AddRange(convites);
        }

        public void Remover(Convite convite)
        {
            itens.Remove(convite);
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

        public void DescartarAlteracoes()
        {
        }
    }
}
