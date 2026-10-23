using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Mesas;

namespace Celebri.Aplicacao.Mesas;

public class MesaService : IMesaService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly IMesaRepository _mesaRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;

    public MesaService(
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        IMesaRepository mesaRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio)
    {
        _eventoRepository = eventoRepository;
        _conviteRepository = conviteRepository;
        _mesaRepository = mesaRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<MapaMesasDto> ObterMapaAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        return await MontarMapaAsync(evento, cancelamento);
    }

    public async Task<MesaDto> CriarAsync(Guid eventoId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var dados = request.ParaDados();

        if (await _mesaRepository.ContarAsync(evento.Id, cancelamento) >= Mesa.MesasMaximoPorEvento)
        {
            throw new RegraNegocioException(MensagensMesas.LimitePorEvento);
        }

        var mesa = Mesa.Criar(evento.Id, dados, _relogio.GetUtcNow());
        await GarantirUnicidadeAsync(evento.Id, mesa, null, cancelamento);

        _mesaRepository.Adicionar(mesa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontadorMapaMesas.ParaDto(mesa, 0);
    }

    public async Task<MesaDto> AtualizarAsync(Guid eventoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var mesa = await ObterMesaAsync(evento.Id, mesaId, cancelamento);
        var ocupacao = await _mesaRepository.ContarOcupacaoAsync(evento.Id, mesa.Id, cancelamento);

        mesa.Atualizar(request.ParaDados(), ocupacao, _relogio.GetUtcNow());
        await GarantirUnicidadeAsync(evento.Id, mesa, mesa.Id, cancelamento);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontadorMapaMesas.ParaDto(mesa, ocupacao);
    }

    public async Task RemoverAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var mesa = await ObterMesaAsync(evento.Id, mesaId, cancelamento);

        _mesaRepository.Remover(mesa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<MapaMesasDto> SentarAsync(Guid eventoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var mesa = await ObterMesaAsync(evento.Id, mesaId, cancelamento);
        var pessoas = await ObterPessoasAsync(evento.Id, request, cancelamento);
        var ocupacao = await _mesaRepository.ContarOcupacaoAsync(evento.Id, mesa.Id, cancelamento);

        mesa.Receber(pessoas, ocupacao, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarMapaAsync(evento, cancelamento);
    }

    public async Task<MapaMesasDto> RetirarAsync(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var pessoas = await ObterPessoasAsync(evento.Id, request, cancelamento);
        var agora = _relogio.GetUtcNow();
        var alterou = false;

        foreach (var pessoa in pessoas)
        {
            alterou |= pessoa.Levantar(agora);
        }

        if (alterou)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return await MontarMapaAsync(evento, cancelamento);
    }

    public async Task<MapaMesasDto> DispensarAvisosAsync(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var pessoas = await ObterPessoasAsync(evento.Id, request, cancelamento);
        var agora = _relogio.GetUtcNow();
        var alterou = false;

        foreach (var pessoa in pessoas)
        {
            alterou |= pessoa.DispensarAvisoSaidaMesa(agora);
        }

        if (alterou)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return await MontarMapaAsync(evento, cancelamento);
    }

    private async Task<MapaMesasDto> MontarMapaAsync(Evento evento, CancellationToken cancelamento)
    {
        var mesas = await _mesaRepository.ListarAsync(evento.Id, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(evento.Id, cancelamento);
        return MontadorMapaMesas.Montar(mesas, convites, evento.Arquivado);
    }

    private async Task<IReadOnlyList<Convidado>> ObterPessoasAsync(Guid eventoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        var identificadores = request.Identificadores();

        if (identificadores.Count == 0)
        {
            throw new RegraNegocioException(MensagensMesas.PessoasObrigatorias);
        }

        if (identificadores.Count > Mesa.PessoasMaximoPorOperacao)
        {
            throw new RegraNegocioException(MensagensMesas.PessoasDemais);
        }

        if (identificadores.Distinct().Count() != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensMesas.PessoaRepetida);
        }

        var pessoas = await _mesaRepository.ObterConvidadosAsync(eventoId, identificadores, cancelamento);

        if (pessoas.Count != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensMesas.PessoaDeOutroEvento);
        }

        return pessoas;
    }

    private async Task GarantirUnicidadeAsync(Guid eventoId, Mesa mesa, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        if (await _mesaRepository.ExisteNumeroAsync(eventoId, mesa.Numero, excetoMesaId, cancelamento))
        {
            throw new RegraNegocioException(MensagensMesas.NumeroRepetido, Mesa.CampoNumero);
        }

        if (mesa.Especial && await _mesaRepository.ExisteEspecialAsync(eventoId, excetoMesaId, cancelamento))
        {
            throw new RegraNegocioException(MensagensMesas.EspecialRepetida, Mesa.CampoEspecial);
        }
    }

    private async Task<Mesa> ObterMesaAsync(Guid eventoId, Guid mesaId, CancellationToken cancelamento)
    {
        return await _mesaRepository.ObterAsync(eventoId, mesaId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensMesas.MesaNaoEncontrada);
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<Evento> ObterEventoEditavelAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensMesas.EventoArquivado);
        }

        return evento;
    }
}
