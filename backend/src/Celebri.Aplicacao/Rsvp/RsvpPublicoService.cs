using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Rsvp;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Rsvp;

public class RsvpPublicoService : IRsvpPublicoService
{
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly IEventoRepository _eventoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly EscopoIsolamentoRsvp _escopo;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly VerificadorEventoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly CifragemRestricaoAlimentar _cifragem;
    private readonly OpcoesRetencaoDadosSensiveis _opcoesRetencao;
    private readonly IUsuarioAtual _usuarioAtual;

    public RsvpPublicoService(
        IAcessoRsvpRepository acessoRepository,
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        EscopoIsolamentoRsvp escopo,
        IGeradorTokenOpaco geradorToken,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        CifragemRestricaoAlimentar cifragem,
        IOptions<OpcoesRetencaoDadosSensiveis> opcoesRetencao,
        IUsuarioAtual usuarioAtual)
    {
        ArgumentNullException.ThrowIfNull(opcoesRetencao);

        _acessoRepository = acessoRepository;
        _eventoRepository = eventoRepository;
        _conviteRepository = conviteRepository;
        _escopo = escopo;
        _geradorToken = geradorToken;
        _verificador = new VerificadorEventoConvidados(eventoRepository, conviteRepository);
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _cifragem = cifragem;
        _opcoesRetencao = opcoesRetencao.Value;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<RsvpPublicoDto> ConsultarAsync(ConsultarRsvpRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (evento, convite, organizacaoId) = await ResolverAsync(request.Token, cancelamento);
        var preVisualizacao = VisualizacaoDaEquipe(organizacaoId, evento.Id);

        if (!preVisualizacao && convite.MarcarVisualizado(_relogio.GetUtcNow()))
        {
            try
            {
                await _unidadeTrabalho.SalvarAsync(cancelamento);
            }
            catch (ConcorrenciaException)
            {
                return ParaDto(evento, convite, preVisualizacao);
            }
        }

        return ParaDto(evento, convite, preVisualizacao);
    }

    public async Task<RsvpPublicoDto> ResponderAsync(ResponderRsvpRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (evento, convite, organizacaoId) = await ResolverAsync(request.Token, cancelamento);

        if (!evento.AceitaRespostaRsvp(_calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensRsvp.PrazoEncerrado);
        }

        var acompanhantes = request.ParaAcompanhantes();
        await _verificador.GarantirLimiteAsync(evento.Id, acompanhantes.Count, convite.QuantidadeAcompanhantes(), cancelamento);

        var agora = _relogio.GetUtcNow();
        convite.RegistrarRespostaRsvp(
            request.ParaRespostas(),
            acompanhantes,
            request.ParaConsentimento(agora),
            _cifragem.Cifrar,
            agora);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(evento, convite, VisualizacaoDaEquipe(organizacaoId, evento.Id));
    }

    private bool VisualizacaoDaEquipe(Guid organizacaoId, Guid eventoId)
    {
        if (!_usuarioAtual.Autenticado || _usuarioAtual.OrganizacaoId != organizacaoId)
        {
            return false;
        }

        return _usuarioAtual.EhAssessoria() || _usuarioAtual.EhAnfitriaoDoEvento(eventoId);
    }

    private async Task<(Evento Evento, Convite Convite, Guid OrganizacaoId)> ResolverAsync(string? token, CancellationToken cancelamento)
    {
        if (!FormatoTokenRsvp.Valido(token))
        {
            throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);
        }

        var acesso = await _acessoRepository.ObterPorHashAsync(_geradorToken.CalcularHash(token!), cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);

        _escopo.Estabelecer(acesso.OrganizacaoId, acesso.ConviteId);

        var evento = await _eventoRepository.ObterPorIdAsync(acesso.EventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);
        var convite = await _conviteRepository.ObterPorIdAsync(evento.Id, acesso.ConviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);

        return (evento, convite, acesso.OrganizacaoId);
    }

    private RsvpPublicoDto ParaDto(Evento evento, Convite convite, bool preVisualizacao)
    {
        var pessoas = convite.ConvidadosOrdenados();

        return new RsvpPublicoDto(
            new EventoRsvpDto(
                evento.NomePrimeiraPessoa,
                evento.NomeSegundaPessoa,
                evento.Data,
                EventoService.FormatarHorario(evento.Horario),
                evento.LocalCerimonia,
                evento.LocalRecepcao,
                evento.Tipo.ToString()),
            convite.Nome,
            convite.LimiteAcompanhantes,
            evento.DataLimiteRsvpEfetiva(),
            evento.AceitaRespostaRsvp(_calendario.Hoje()),
            convite.RespondidoEm,
            pessoas
                .Where(pessoa => !pessoa.Acompanhante)
                .Select(pessoa => new PessoaRsvpDto(
                    pessoa.Id,
                    pessoa.Nome,
                    pessoa.FaixaEtaria.ToString(),
                    pessoa.Resposta.ToString(),
                    pessoa.PossuiRestricaoAlimentar))
                .ToList(),
            pessoas
                .Where(pessoa => pessoa.Acompanhante)
                .Select(pessoa => new AcompanhanteRsvpDto(pessoa.Id, pessoa.Nome, pessoa.FaixaEtaria.ToString(), pessoa.PossuiRestricaoAlimentar))
                .ToList(),
            new PrivacidadeRsvpDto(TermoPrivacidadeRsvp.VersaoVigente, _opcoesRetencao.DiasAposEvento),
            preVisualizacao);
    }
}
