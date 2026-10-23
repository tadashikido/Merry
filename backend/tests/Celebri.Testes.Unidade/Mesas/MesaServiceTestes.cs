using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Mesas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Mesas;
using Celebri.Testes.Unidade.Autenticacao.Fakes;

namespace Celebri.Testes.Unidade.Mesas;

public class MesaServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly List<Evento> _eventos = [];
    private readonly List<Convite> _convites = [];
    private readonly RepositorioMesasMemoria _mesas;
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly MesaService _service;
    private readonly Evento _evento;

    public MesaServiceTestes()
    {
        _mesas = new RepositorioMesasMemoria(() => _convites.SelectMany(convite => convite.Convidados));
        _service = new MesaService(new EventosMemoria(_eventos), new ConvitesMemoria(_convites), _mesas, _unidadeTrabalho, new RelogioFixo(Agora));
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

        _eventos.Add(evento);
        return evento;
    }

    private Convite NovoConvite(Evento evento, string nome, params (string Nome, RespostaRsvp Resposta)[] pessoas)
    {
        var dados = pessoas.Select(pessoa => new DadosConvidado(null, pessoa.Nome, null, null, FaixaEtaria.Adulto, pessoa.Resposta)).ToList();
        var convite = Convite.Criar(evento.Id, new DadosConvite(nome, null, 0, dados), Agora);
        _convites.Add(convite);
        return convite;
    }

    private async Task<MesaDto> CriarMesaAsync(int numero = 1, int capacidade = 8, bool especial = false)
    {
        return await _service.CriarAsync(_evento.Id, new SalvarMesaRequest(numero, null, capacidade, especial), CancellationToken.None);
    }

    [Fact]
    public async Task Criar_DeveAdicionarESalvar()
    {
        var mesa = await _service.CriarAsync(_evento.Id, new SalvarMesaRequest(2, "Padrinhos", 10, null), CancellationToken.None);

        Assert.Equal((2, "Padrinhos", 10, false, 0), (mesa.Numero, mesa.Nome, mesa.Capacidade, mesa.Especial, mesa.Ocupacao));
        Assert.Single(_mesas.Itens);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Criar_EventoInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.CriarAsync(Guid.NewGuid(), new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
    }

    [Fact]
    public async Task Escritas_EventoArquivado_DevemLancar422ELeituraFunciona()
    {
        var arquivado = NovoEvento(arquivado: true);
        var convite = NovoConvite(arquivado, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));
        var pessoas = new PessoasMesaRequest([convite.Convidados[0].Id]);

        var criar = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(arquivado.Id, new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(arquivado.Id, Guid.NewGuid(), pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RetirarAsync(arquivado.Id, pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.DispensarAvisosAsync(arquivado.Id, pessoas, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RemoverAsync(arquivado.Id, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(MensagensMesas.EventoArquivado, criar.Message);
        Assert.True((await _service.ObterMapaAsync(arquivado.Id, CancellationToken.None)).EventoArquivado);
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

        var atualizada = await _service.AtualizarAsync(_evento.Id, mesa.Id, new SalvarMesaRequest(4, "Anfitrioes", 10, true), CancellationToken.None);

        Assert.Equal(("Anfitrioes", 10), (atualizada.Nome, atualizada.Capacidade));
    }

    [Fact]
    public async Task Atualizar_MesaInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.AtualizarAsync(_evento.Id, Guid.NewGuid(), new SalvarMesaRequest(1, null, 8, false), CancellationToken.None));
    }

    [Fact]
    public async Task Criar_AcimaDoLimiteDeMesas_DeveLancar422()
    {
        for (var numero = 1; numero <= Mesa.MesasMaximoPorEvento; numero++)
        {
            _mesas.Itens.Add(Mesa.Criar(_evento.Id, new DadosMesa(numero, null, 8, false), Agora));
        }

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => CriarMesaAsync(999));

        Assert.Equal(MensagensMesas.LimitePorEvento, excecao.Message);
    }

    [Fact]
    public async Task Sentar_DeveSentarSalvarEDevolverOMapa()
    {
        var mesa = await CriarMesaAsync(capacidade: 4);
        var convite = NovoConvite(_evento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));

        var mapa = await _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest(convite.Convidados.Select(pessoa => pessoa.Id).ToList()), CancellationToken.None);

        Assert.Equal(2, mapa.Mesas.Single().Ocupacao);
        Assert.Equal(2, _unidadeTrabalho.Salvamentos);
        Assert.All(convite.Convidados, pessoa => Assert.Equal(mesa.Id, pessoa.MesaId));
    }

    [Fact]
    public async Task Sentar_ConsideraOcupacaoAtualDaMesa()
    {
        var mesa = await CriarMesaAsync(capacidade: 2);
        var souza = NovoConvite(_evento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));
        var rui = NovoConvite(_evento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));
        await _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest(souza.Convidados.Select(pessoa => pessoa.Id).ToList()), CancellationToken.None);

        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest([rui.Convidados[0].Id]), CancellationToken.None));

        Assert.Null(rui.Convidados[0].MesaId);
    }

    [Fact]
    public async Task Sentar_PessoaDeOutroEventoOuInexistente_DeveLancar422()
    {
        var mesa = await CriarMesaAsync();
        var outro = NovoEvento();
        var alheio = NovoConvite(outro, "Caio Rocha", ("Caio Rocha", RespostaRsvp.Confirmado));

        var deOutro = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest([alheio.Convidados[0].Id]), CancellationToken.None));
        var inexistente = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest([Guid.NewGuid()]), CancellationToken.None));

        Assert.Equal(MensagensMesas.PessoaDeOutroEvento, deOutro.Message);
        Assert.Equal(MensagensMesas.PessoaDeOutroEvento, inexistente.Message);
        Assert.Null(alheio.Convidados[0].MesaId);
    }

    [Fact]
    public async Task Sentar_ListaVaziaRepetidaOuGrandeDemais_DeveLancar422()
    {
        var mesa = await CriarMesaAsync();
        var id = Guid.NewGuid();

        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest([]), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest([id, id]), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest(Enumerable.Range(0, Mesa.PessoasMaximoPorOperacao + 1).Select(_ => Guid.NewGuid()).ToList()), CancellationToken.None));
    }

    [Fact]
    public async Task Sentar_MesaInexistente_DeveLancar404()
    {
        var convite = NovoConvite(_evento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            _service.SentarAsync(_evento.Id, Guid.NewGuid(), new PessoasMesaRequest([convite.Convidados[0].Id]), CancellationToken.None));
    }

    [Fact]
    public async Task Retirar_SemAlteracao_NaoSalva()
    {
        var convite = NovoConvite(_evento, "Rui Fontes", ("Rui Fontes", RespostaRsvp.Confirmado));

        await _service.RetirarAsync(_evento.Id, new PessoasMesaRequest([convite.Convidados[0].Id]), CancellationToken.None);

        Assert.Equal(0, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task RetirarEDispensar_DevemAlterarESalvar()
    {
        var mesa = await CriarMesaAsync();
        var convite = NovoConvite(_evento, "Família Souza", ("Carla Souza", RespostaRsvp.Confirmado), ("Pedro Souza", RespostaRsvp.Confirmado));
        var ids = convite.Convidados.Select(pessoa => pessoa.Id).ToList();
        await _service.SentarAsync(_evento.Id, mesa.Id, new PessoasMesaRequest(ids), CancellationToken.None);
        convite.RegistrarRespostaRsvp([new RespostaPessoaRsvp(ids[0], RespostaRsvp.Recusado), new RespostaPessoaRsvp(ids[1], RespostaRsvp.Confirmado)], [], Agora);

        var antes = await _service.ObterMapaAsync(_evento.Id, CancellationToken.None);
        var retirado = await _service.RetirarAsync(_evento.Id, new PessoasMesaRequest([ids[1]]), CancellationToken.None);
        var dispensado = await _service.DispensarAvisosAsync(_evento.Id, new PessoasMesaRequest([ids[0]]), CancellationToken.None);

        Assert.Single(antes.AvisosSaida);
        Assert.Equal(0, retirado.Mesas.Single().Ocupacao);
        Assert.Empty(dispensado.AvisosSaida);
        Assert.Equal(4, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Remover_DeveRemoverESalvar()
    {
        var mesa = await CriarMesaAsync();

        await _service.RemoverAsync(_evento.Id, mesa.Id, CancellationToken.None);

        Assert.Empty(_mesas.Itens);
        Assert.Single(_mesas.Removidas);
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RemoverAsync(_evento.Id, mesa.Id, CancellationToken.None));
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
        Assert.Contains(resultadosVazio, resultado => resultado.ErrorMessage == MensagensMesas.PessoaDeOutroEvento);
        Assert.Contains(resultadosRepetidos, resultado => resultado.ErrorMessage == MensagensMesas.PessoaRepetida);
    }

    private sealed class EventosMemoria(List<Evento> itens) : IEventoRepository
    {
        public Task<IReadOnlyList<Evento>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<Evento> resultado = itens.Where(evento => evento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Evento?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.FirstOrDefault(evento => evento.Id == id));
        }

        public void Adicionar(Evento evento)
        {
            itens.Add(evento);
        }
    }

    private sealed class ConvitesMemoria(List<Convite> itens) : IConviteRepository
    {
        public Task<IReadOnlyList<Convite>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            IReadOnlyList<Convite> resultado = itens.Where(convite => convite.EventoId == eventoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<IReadOnlyList<Convite>> ListarSemDadosSensiveisAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return ListarPorEventoAsync(eventoId, cancelamento);
        }

        public Task<Convite?> ObterPorIdAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.FirstOrDefault(convite => convite.EventoId == eventoId && convite.Id == conviteId));
        }

        public Task<int> ContarConvidadosAsync(Guid eventoId, CancellationToken cancelamento)
        {
            return Task.FromResult(itens.Where(convite => convite.EventoId == eventoId).Sum(convite => convite.Convidados.Count));
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
