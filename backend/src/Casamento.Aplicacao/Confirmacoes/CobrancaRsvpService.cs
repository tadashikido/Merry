using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Rsvp;
using Microsoft.Extensions.Logging;

namespace Casamento.Aplicacao.Confirmacoes;

public partial class CobrancaRsvpService : ICobrancaRsvpService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ILogger<CobrancaRsvpService> _logger;

    public CobrancaRsvpService(
        ICasamentoRepository casamentoRepository,
        IConviteRepository conviteRepository,
        IAcessoRsvpRepository acessoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        ILogger<CobrancaRsvpService> logger)
    {
        _casamentoRepository = casamentoRepository;
        _conviteRepository = conviteRepository;
        _acessoRepository = acessoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
        _logger = logger;
    }

    public async Task<CobrancaRsvpDto> RegistrarAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        var casamento = await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);

        var convite = await _conviteRepository.ObterPorIdAsync(casamento.Id, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensRsvp.CasamentoArquivado);
        }

        if (!casamento.AceitaRespostaRsvp(_calendario.Hoje()))
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

        RegistrarLog(casamento.Id, convite.Id, _usuarioAtual.UsuarioId, convite.QuantidadeCobrancas);

        return new CobrancaRsvpDto(convite.Id, agora, convite.QuantidadeCobrancas);
    }

    [LoggerMessage(
        EventId = 9103,
        Level = LogLevel.Information,
        Message = "Cobrança de RSVP registrada: casamento {CasamentoId}, convite {ConviteId}, usuário {UsuarioId}, {Quantidade} cobranças.")]
    private partial void RegistrarLog(Guid casamentoId, Guid conviteId, Guid? usuarioId, int quantidade);
}
