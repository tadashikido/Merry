using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Email;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.AcessosAnfitriao;

public partial class AcessoAnfitriaoService : IAcessoAnfitriaoService
{
    public const string CaminhoAceite = "/acesso-anfitriao#token=";

    private readonly IAcessoAnfitriaoRepository _acessoRepository;
    private readonly ITokenAcessoAnfitriaoRepository _tokenRepository;
    private readonly IEventoRepository _eventoRepository;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly IEnvioEmailService _envioEmail;
    private readonly IAutenticacaoService _autenticacaoService;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly EscopoIsolamentoAcessoAnfitriao _escopo;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;
    private readonly ILogger<AcessoAnfitriaoService> _logger;

    public AcessoAnfitriaoService(
        IAcessoAnfitriaoRepository acessoRepository,
        ITokenAcessoAnfitriaoRepository tokenRepository,
        IEventoRepository eventoRepository,
        IUsuarioRepository usuarioRepository,
        IOrganizacaoRepository organizacaoRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IGeradorTokenOpaco geradorToken,
        IEnvioEmailService envioEmail,
        IAutenticacaoService autenticacaoService,
        IUsuarioAtual usuarioAtual,
        EscopoIsolamentoAcessoAnfitriao escopo,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio,
        ILogger<AcessoAnfitriaoService> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _acessoRepository = acessoRepository;
        _tokenRepository = tokenRepository;
        _eventoRepository = eventoRepository;
        _usuarioRepository = usuarioRepository;
        _organizacaoRepository = organizacaoRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _geradorToken = geradorToken;
        _envioEmail = envioEmail;
        _autenticacaoService = autenticacaoService;
        _usuarioAtual = usuarioAtual;
        _escopo = escopo;
        _opcoes = opcoes.Value;
        _relogio = relogio;
        _logger = logger;
    }

    private TimeSpan Validade => TimeSpan.FromDays(_opcoes.ValidadeConviteAnfitriaoDias);

    public async Task<IReadOnlyList<AcessoAnfitriaoDto>> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var acessos = await _acessoRepository.ListarNaoRevogadosAsync(evento.Id, cancelamento);
        var agora = _relogio.GetUtcNow();

        return acessos
            .OrderBy(acesso => acesso.ConvidadoEm)
            .Select(acesso => ParaDto(acesso, agora))
            .ToList();
    }

    public async Task<AcessoAnfitriaoDto> ConvidarAsync(Guid eventoId, ConvidarAnfitriaoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var usuarioId = ObterUsuarioAtual();
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EventoArquivado);
        }

        var acessos = await _acessoRepository.ListarNaoRevogadosAsync(evento.Id, cancelamento);
        var email = NormalizadorEmail.Normalizar(request.Email);

        if (acessos.Any(acesso => acesso.Email == email))
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailJaConvidado);
        }

        if (acessos.Count >= AcessoAnfitriao.LimitePorEvento)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.LimiteAtingido);
        }

        if (await _acessoRepository.ExisteNaoRevogadoComEmailAsync(email, cancelamento))
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailEmUso);
        }

        await GarantirEmailDisponivelAsync(email, evento.Id, cancelamento);

        var agora = _relogio.GetUtcNow();
        var acesso = AcessoAnfitriao.Convidar(evento.Id, request.Nome!, email, usuarioId, agora, Validade);
        _acessoRepository.Adicionar(acesso);

        var valorToken = _geradorToken.Gerar();
        _tokenRepository.Adicionar(TokenAcessoAnfitriao.Gerar(acesso, evento.OrganizacaoId, _geradorToken.CalcularHash(valorToken), agora));

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        await EnviarConviteAsync(acesso, evento, valorToken, cancelamento);

        return ParaDto(acesso, agora);
    }

    public async Task<AcessoAnfitriaoDto> ReenviarAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EventoArquivado);
        }

        var acesso = await ObterAcessoAsync(evento.Id, acessoId, cancelamento);
        var agora = _relogio.GetUtcNow();
        acesso.Reenviar(agora, Validade);

        var valorToken = _geradorToken.Gerar();
        var hash = _geradorToken.CalcularHash(valorToken);
        var token = await _tokenRepository.ObterPorAcessoAsync(acesso.Id, cancelamento);

        if (token is null)
        {
            _tokenRepository.Adicionar(TokenAcessoAnfitriao.Gerar(acesso, evento.OrganizacaoId, hash, agora));
        }
        else
        {
            token.Renovar(hash, agora);
        }

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        await EnviarConviteAsync(acesso, evento, valorToken, cancelamento);

        return ParaDto(acesso, agora);
    }

    public async Task RevogarAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        var usuarioId = ObterUsuarioAtual();
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var acesso = await ObterAcessoAsync(evento.Id, acessoId, cancelamento);
        var agora = _relogio.GetUtcNow();

        acesso.Revogar(usuarioId, agora);

        var token = await _tokenRepository.ObterPorAcessoAsync(acesso.Id, cancelamento);
        if (token is not null)
        {
            _tokenRepository.Remover(token);
        }

        if (acesso.UsuarioId is { } usuarioAnfitriaoId)
        {
            var usuarioAnfitriao = await _usuarioRepository.ObterPorIdAsync(usuarioAnfitriaoId, cancelamento);
            if (usuarioAnfitriao is { Papel: PapelUsuario.Anfitriao } && usuarioAnfitriao.EventoId == evento.Id)
            {
                usuarioAnfitriao.Desativar();
                var sessoes = await _refreshTokenRepository.ListarNaoUtilizadosDoUsuarioAsync(usuarioAnfitriao.Id, cancelamento);
                foreach (var sessao in sessoes)
                {
                    sessao.Revogar(agora);
                }
            }
        }

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        RegistrarRevogacao(evento.Id, acesso.Id, usuarioId);
    }

    public async Task<ConviteAcessoAnfitriaoDto> ConsultarConviteAsync(ConsultarConviteAnfitriaoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (acesso, _, evento, organizacao) = await ResolverAsync(request.Token, cancelamento);

        return new ConviteAcessoAnfitriaoDto(
            acesso.Nome,
            acesso.Email,
            evento.NomePrimeiraPessoa,
            evento.NomeSegundaPessoa,
            organizacao.Nome,
            acesso.ConviteExpiraEm,
            evento.Tipo.ToString());
    }

    public async Task<ResultadoAutenticacao> AceitarConviteAsync(AceitarConviteAnfitriaoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (acesso, token, evento, organizacao) = await ResolverAsync(request.Token, cancelamento);

        if (PoliticaSenha.Validar(request.Senha, acesso.Email) is { } erroSenha)
        {
            throw new RegraNegocioException(erroSenha);
        }

        var agora = _relogio.GetUtcNow();
        var hashSenha = _hashSenhaService.GerarHash(request.Senha!);
        var existente = await _usuarioRepository.ObterPorEmailAsync(acesso.Email, cancelamento);
        Usuario usuario;

        if (existente is null)
        {
            usuario = Usuario.CriarAnfitriao(organizacao.Id, evento.Id, acesso.Nome, acesso.Email, hashSenha, agora);
            _usuarioRepository.Adicionar(usuario);
        }
        else if (PodeReativar(existente, evento))
        {
            existente.ReativarAnfitriao(evento.Id, acesso.Nome, hashSenha, agora);
            usuario = existente;
        }
        else
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailEmUso);
        }

        acesso.Aceitar(usuario.Id, agora);
        _tokenRepository.Remover(token);
        var resultado = _autenticacaoService.IniciarSessao(usuario, organizacao);

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.ConviteInvalido);
        }
        catch (ConflitoException)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailEmUso);
        }

        RegistrarAceite(evento.Id, acesso.Id, usuario.Id);
        return resultado;
    }

    private static bool PodeReativar(Usuario existente, Evento evento)
    {
        return existente is { Papel: PapelUsuario.Anfitriao, Ativo: false }
            && existente.EventoId == evento.Id
            && existente.OrganizacaoId == evento.OrganizacaoId;
    }

    private async Task GarantirEmailDisponivelAsync(string email, Guid eventoId, CancellationToken cancelamento)
    {
        var existente = await _usuarioRepository.ObterPorEmailAsync(email, cancelamento);
        if (existente is null)
        {
            return;
        }

        var reativavel = existente is { Papel: PapelUsuario.Anfitriao, Ativo: false } && existente.EventoId == eventoId;
        if (!reativavel)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailEmUso);
        }
    }

    private async Task<(AcessoAnfitriao Acesso, TokenAcessoAnfitriao Token, Evento Evento, Organizacao Organizacao)> ResolverAsync(
        string? valorToken,
        CancellationToken cancelamento)
    {
        if (!FormatoTokenConviteAnfitriao.Valido(valorToken))
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.ConviteInvalido);
        }

        var token = await _tokenRepository.ObterPorHashAsync(_geradorToken.CalcularHash(valorToken!), cancelamento)
            ?? throw new RegraNegocioException(MensagensAcessoAnfitriao.ConviteInvalido);

        _escopo.Fixar(token.OrganizacaoId, token.EventoId);

        var acesso = await _acessoRepository.ObterPorIdAsync(token.EventoId, token.AcessoAnfitriaoId, cancelamento);
        var evento = await _eventoRepository.ObterPorIdAsync(token.EventoId, cancelamento);
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(token.OrganizacaoId, cancelamento);

        if (acesso is null || evento is null || organizacao is null
            || acesso.Situacao(_relogio.GetUtcNow()) != SituacaoAcessoAnfitriao.Pendente)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.ConviteInvalido);
        }

        return (acesso, token, evento, organizacao);
    }

    private async Task EnviarConviteAsync(AcessoAnfitriao acesso, Evento evento, string valorToken, CancellationToken cancelamento)
    {
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(evento.OrganizacaoId, cancelamento);
        var link = $"{_opcoes.UrlFrontend.TrimEnd('/')}{CaminhoAceite}{Uri.EscapeDataString(valorToken)}";
        var mensagem = ModelosEmail.ConviteAcessoAnfitriao(
            acesso.Nome,
            acesso.Email,
            link,
            evento.FormatarNomes(),
            organizacao?.Nome ?? string.Empty,
            _opcoes.ValidadeConviteAnfitriaoDias);

        try
        {
            await _envioEmail.EnviarAsync(mensagem, cancelamento);
        }
        catch (Exception excecao) when (excecao is not OperationCanceledException)
        {
            RegistrarFalhaEnvio(excecao, evento.Id, acesso.Id);
        }
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<AcessoAnfitriao> ObterAcessoAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
    {
        var acesso = await _acessoRepository.ObterPorIdAsync(eventoId, acessoId, cancelamento);
        if (acesso is null || acesso.RevogadoEm is not null)
        {
            throw new RecursoNaoEncontradoException(MensagensAcessoAnfitriao.AcessoNaoEncontrado);
        }

        return acesso;
    }

    private Guid ObterUsuarioAtual()
    {
        return _usuarioAtual.UsuarioId
            ?? throw new InvalidOperationException("A gestão do acesso dos anfitriões exige um usuário autenticado.");
    }

    private static AcessoAnfitriaoDto ParaDto(AcessoAnfitriao acesso, DateTimeOffset agora)
    {
        return new AcessoAnfitriaoDto(
            acesso.Id,
            acesso.Nome,
            acesso.Email,
            acesso.Situacao(agora).ToString(),
            acesso.ConvidadoEm,
            acesso.ConviteExpiraEm,
            acesso.AceitoEm);
    }

    [LoggerMessage(EventId = 9201, Level = LogLevel.Error, Message = "Falha ao enviar o convite de acesso dos anfitriões {AcessoId} do evento {EventoId}.")]
    private partial void RegistrarFalhaEnvio(Exception excecao, Guid eventoId, Guid acessoId);

    [LoggerMessage(EventId = 9202, Level = LogLevel.Information, Message = "Acesso dos anfitriões {AcessoId} do evento {EventoId} revogado pelo usuário {UsuarioId}.")]
    private partial void RegistrarRevogacao(Guid eventoId, Guid acessoId, Guid usuarioId);

    [LoggerMessage(EventId = 9203, Level = LogLevel.Information, Message = "Convite de acesso dos anfitriões {AcessoId} do evento {EventoId} aceito pelo usuário {UsuarioId}.")]
    private partial void RegistrarAceite(Guid eventoId, Guid acessoId, Guid usuarioId);
}
