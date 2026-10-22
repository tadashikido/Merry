using Casamento.Aplicacao.Autenticacao.Portas;
using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Casamentos;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Rsvp;
using Microsoft.Extensions.Options;

namespace Casamento.Aplicacao.Rsvp;

public class RsvpPublicoService : IRsvpPublicoService
{
    private readonly IAcessoRsvpRepository _acessoRepository;
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly EscopoIsolamentoRsvp _escopo;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly VerificadorCasamentoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly CifragemRestricaoAlimentar _cifragem;
    private readonly OpcoesRetencaoDadosSensiveis _opcoesRetencao;
    private readonly IUsuarioAtual _usuarioAtual;

    public RsvpPublicoService(
        IAcessoRsvpRepository acessoRepository,
        ICasamentoRepository casamentoRepository,
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
        _casamentoRepository = casamentoRepository;
        _conviteRepository = conviteRepository;
        _escopo = escopo;
        _geradorToken = geradorToken;
        _verificador = new VerificadorCasamentoConvidados(casamentoRepository, conviteRepository);
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

        var (casamento, convite, organizacaoId) = await ResolverAsync(request.Token, cancelamento);
        var preVisualizacao = VisualizacaoDaEquipe(organizacaoId, casamento.Id);

        if (!preVisualizacao && convite.MarcarVisualizado(_relogio.GetUtcNow()))
        {
            try
            {
                await _unidadeTrabalho.SalvarAsync(cancelamento);
            }
            catch (ConcorrenciaException)
            {
                return ParaDto(casamento, convite, preVisualizacao);
            }
        }

        return ParaDto(casamento, convite, preVisualizacao);
    }

    public async Task<RsvpPublicoDto> ResponderAsync(ResponderRsvpRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (casamento, convite, organizacaoId) = await ResolverAsync(request.Token, cancelamento);

        if (!casamento.AceitaRespostaRsvp(_calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensRsvp.PrazoEncerrado);
        }

        var acompanhantes = request.ParaAcompanhantes();
        await _verificador.GarantirLimiteAsync(casamento.Id, acompanhantes.Count, convite.QuantidadeAcompanhantes(), cancelamento);

        var agora = _relogio.GetUtcNow();
        convite.RegistrarRespostaRsvp(
            request.ParaRespostas(),
            acompanhantes,
            request.ParaConsentimento(agora),
            _cifragem.Cifrar,
            agora);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(casamento, convite, VisualizacaoDaEquipe(organizacaoId, casamento.Id));
    }

    private bool VisualizacaoDaEquipe(Guid organizacaoId, Guid casamentoId)
    {
        if (!_usuarioAtual.Autenticado || _usuarioAtual.OrganizacaoId != organizacaoId)
        {
            return false;
        }

        return _usuarioAtual.EhAssessoria() || _usuarioAtual.EhCasalDoCasamento(casamentoId);
    }

    private async Task<(CasamentoAssessorado Casamento, Convite Convite, Guid OrganizacaoId)> ResolverAsync(string? token, CancellationToken cancelamento)
    {
        if (!FormatoTokenRsvp.Valido(token))
        {
            throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);
        }

        var acesso = await _acessoRepository.ObterPorHashAsync(_geradorToken.CalcularHash(token!), cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);

        _escopo.Estabelecer(acesso.OrganizacaoId, acesso.ConviteId);

        var casamento = await _casamentoRepository.ObterPorIdAsync(acesso.CasamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);
        var convite = await _conviteRepository.ObterPorIdAsync(casamento.Id, acesso.ConviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensRsvp.LinkInvalido);

        return (casamento, convite, acesso.OrganizacaoId);
    }

    private RsvpPublicoDto ParaDto(CasamentoAssessorado casamento, Convite convite, bool preVisualizacao)
    {
        var pessoas = convite.ConvidadosOrdenados();

        return new RsvpPublicoDto(
            new CasamentoRsvpDto(
                casamento.NomePrimeiraPessoa,
                casamento.NomeSegundaPessoa,
                casamento.Data,
                CasamentoService.FormatarHorario(casamento.Horario),
                casamento.LocalCerimonia,
                casamento.LocalRecepcao),
            convite.Nome,
            convite.LimiteAcompanhantes,
            casamento.DataLimiteRsvpEfetiva(),
            casamento.AceitaRespostaRsvp(_calendario.Hoje()),
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
            new PrivacidadeRsvpDto(TermoPrivacidadeRsvp.VersaoVigente, _opcoesRetencao.DiasAposCasamento),
            preVisualizacao);
    }
}
