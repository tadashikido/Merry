using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Rsvp;
using Microsoft.Extensions.Logging;

namespace Celebri.Aplicacao.Confirmacoes;

public partial class CobrancaRsvpService : ICobrancaRsvpService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ILogger<CobrancaRsvpService> _logger;

    public CobrancaRsvpService(
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        IAcessoRsvpRepository acessoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        ILogger<CobrancaRsvpService> logger)
    {
        _eventoRepository = eventoRepository;
        _conviteRepository = conviteRepository;
        _acessoRepository = acessoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
        _logger = logger;
    }

    public async Task<CobrancaRsvpDto> RegistrarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var evento = await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);

        var convite = await _conviteRepository.ObterPorIdAsync(evento.Id, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensRsvp.EventoArquivado);
        }

        if (!evento.AceitaRespostaRsvp(_calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensConvidados.CobrancaPrazoEncerrado);
        }

        if (await _acessoRepository.ObterPorConviteAsync(convite.Id, cancelamento) is null)
        {
            throw new RegraNegocioException(MensagensConvidados.CobrancaSemLink);
        }

        var agora = _relogio.GetUtcNow();
        convite.RegistrarCobranca(agora);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        RegistrarLog(evento.Id, convite.Id, _usuarioAtual.UsuarioId, convite.QuantidadeCobrancas);

        return new CobrancaRsvpDto(convite.Id, agora, convite.QuantidadeCobrancas);
    }

    [LoggerMessage(
        EventId = 9103,
        Level = LogLevel.Information,
        Message = "Cobrança de RSVP registrada: evento {EventoId}, convite {ConviteId}, usuário {UsuarioId}, {Quantidade} cobranças.")]
    private partial void RegistrarLog(Guid eventoId, Guid conviteId, Guid? usuarioId, int quantidade);
}
