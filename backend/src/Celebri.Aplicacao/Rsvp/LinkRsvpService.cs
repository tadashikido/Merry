using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Rsvp.Portas;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Rsvp;

namespace Celebri.Aplicacao.Rsvp;

public class LinkRsvpService : ILinkRsvpService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly ICifradorTokenRsvp _cifrador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public LinkRsvpService(
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        IAcessoRsvpRepository acessoRepository,
        IGeradorTokenOpaco geradorToken,
        ICifradorTokenRsvp cifrador,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _usuarioAtual = usuarioAtual;
        _eventoRepository = eventoRepository;
        _conviteRepository = conviteRepository;
        _acessoRepository = acessoRepository;
        _geradorToken = geradorToken;
        _cifrador = cifrador;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<LinkRsvpDto> ObterAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var convite = await ObterConviteAsync(eventoId, conviteId, exigirEditavel: false, cancelamento);
        var acesso = await _acessoRepository.ObterPorConviteAsync(convite.Id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInexistente);

        return ParaDto(acesso);
    }

    public async Task<LinkRsvpDto> GerarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var convite = await ObterConviteAsync(eventoId, conviteId, exigirEditavel: true, cancelamento);
        var existente = await _acessoRepository.ObterPorConviteAsync(convite.Id, cancelamento);

        if (existente is not null)
        {
            return ParaDto(existente);
        }

        var token = _geradorToken.Gerar();
        var acesso = AcessoRsvp.Gerar(convite, _geradorToken.CalcularHash(token), _cifrador.Cifrar(token, convite.Id), _relogio.GetUtcNow());
        _acessoRepository.Adicionar(acesso);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new LinkRsvpDto(token, acesso.GeradoEm);
    }

    public async Task<LinkRsvpDto> RegenerarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var convite = await ObterConviteAsync(eventoId, conviteId, exigirEditavel: true, cancelamento);
        var token = _geradorToken.Gerar();
        var hash = _geradorToken.CalcularHash(token);
        var cifrado = _cifrador.Cifrar(token, convite.Id);
        var agora = _relogio.GetUtcNow();
        var existente = await _acessoRepository.ObterPorConviteAsync(convite.Id, cancelamento);

        if (existente is null)
        {
            _acessoRepository.Adicionar(AcessoRsvp.Gerar(convite, hash, cifrado, agora));
        }
        else
        {
            existente.Renovar(hash, cifrado, agora);
        }

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        return new LinkRsvpDto(token, agora);
    }

    public async Task RevogarAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var convite = await ObterConviteAsync(eventoId, conviteId, exigirEditavel: true, cancelamento);
        var existente = await _acessoRepository.ObterPorConviteAsync(convite.Id, cancelamento);

        if (existente is null)
        {
            return;
        }

        _acessoRepository.Remover(existente);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<ConviteDto> MarcarEnviadoAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var convite = await ObterConviteAsync(eventoId, conviteId, exigirEditavel: true, cancelamento);

        if (convite.MarcarEnviado(_relogio.GetUtcNow()))
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return ConviteService.ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    private async Task<Convite> ObterConviteAsync(Guid eventoId, Guid conviteId, bool exigirEditavel, CancellationToken cancelamento)
    {
        var evento = await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);

        if (exigirEditavel && evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensRsvp.EventoArquivado);
        }

        return await _conviteRepository.ObterPorIdAsync(evento.Id, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);
    }

    private LinkRsvpDto ParaDto(AcessoRsvp acesso)
    {
        var token = _cifrador.Decifrar(acesso.TokenCifrado, acesso.ConviteId)
            ?? throw new ConflitoException(MensagensRsvp.LinkIrrecuperavel);

        return new LinkRsvpDto(token, acesso.GeradoEm);
    }
}
